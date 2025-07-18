import * as vscode from 'vscode';
import { TimerState, PersistedState, TimerContext } from './types';

/**
 * Manages persistence and restoration of timer state across VS Code sessions
 */
export class StateManager {
    private static readonly STATE_KEY = 'workSessionManager.timerState';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Saves the current timer state to VS Code's global state
     */
    public async saveState(timerContext: TimerContext, sessionCount: number = 0, totalWorkTime: number = 0): Promise<void> {
        const persistedState: PersistedState = {
            currentState: timerContext.currentState,
            remainingTime: timerContext.remainingTime,
            sessionStartTime: timerContext.sessionStartTime,
            lastActiveTime: new Date(),
            sessionCount,
            totalWorkTime,
            sessionDuration: timerContext.sessionDuration,
            restDuration: timerContext.restDuration
        };

        await this.context.globalState.update(StateManager.STATE_KEY, persistedState);
    }

    /**
     * Restores timer state from VS Code's global state
     * Handles time drift correction for cases where VS Code was closed during active sessions
     */
    public async restoreState(): Promise<TimerContext | null> {
        const persistedState = this.context.globalState.get<PersistedState>(StateManager.STATE_KEY);
        
        if (!persistedState) {
            return null;
        }

        // Validate the persisted state
        if (!this.isValidPersistedState(persistedState)) {
            // State is corrupted, clear it and return null
            await this.clearState();
            return null;
        }

        const now = new Date();
        const lastActiveTime = new Date(persistedState.lastActiveTime);
        const timeDifference = Math.floor((now.getTime() - lastActiveTime.getTime()) / 1000); // in seconds

        // If the state was idle or paused, restore as-is
        if (persistedState.currentState === TimerState.IDLE || persistedState.currentState === TimerState.PAUSED) {
            return this.createTimerContextFromPersisted(persistedState);
        }

        // Handle active sessions that may have expired while VS Code was closed
        const adjustedRemainingTime = Math.max(0, persistedState.remainingTime - timeDifference);

        if (adjustedRemainingTime <= 0) {
            // Session expired while VS Code was closed
            return this.handleExpiredSession(persistedState, timeDifference);
        }

        // Session is still active, restore with adjusted time
        const restoredContext: TimerContext = {
            currentState: persistedState.currentState,
            remainingTime: adjustedRemainingTime,
            sessionDuration: persistedState.sessionDuration,
            restDuration: persistedState.restDuration,
            sessionStartTime: persistedState.sessionStartTime ? new Date(persistedState.sessionStartTime) : undefined
        };

        return restoredContext;
    }

    /**
     * Handles sessions that expired while VS Code was closed
     */
    private handleExpiredSession(persistedState: PersistedState, timeDifference: number): TimerContext {
        const sessionDurationSeconds = persistedState.sessionDuration * 60;
        const restDurationSeconds = persistedState.restDuration * 60;
        
        if (persistedState.currentState === TimerState.WORK_SESSION) {
            // Work session expired, check if rest period also expired
            const timeAfterWorkSession = timeDifference - persistedState.remainingTime;
            
            if (timeAfterWorkSession >= restDurationSeconds) {
                // Both work session and rest period expired, return to idle
                return this.createIdleContext(persistedState.sessionDuration, persistedState.restDuration);
            } else {
                // Work session expired, but rest period is still active
                const remainingRestTime = restDurationSeconds - timeAfterWorkSession;
                return {
                    currentState: TimerState.REST_PERIOD,
                    remainingTime: remainingRestTime,
                    sessionDuration: persistedState.sessionDuration,
                    restDuration: persistedState.restDuration,
                    sessionStartTime: new Date(Date.now() - timeAfterWorkSession * 1000)
                };
            }
        } else if (persistedState.currentState === TimerState.REST_PERIOD) {
            // Rest period expired, return to idle
            return this.createIdleContext(persistedState.sessionDuration, persistedState.restDuration);
        }

        // Fallback to idle state
        return this.createIdleContext(persistedState.sessionDuration, persistedState.restDuration);
    }

    /**
     * Creates an idle timer context with specified durations
     */
    private createIdleContext(sessionDuration: number, restDuration: number): TimerContext {
        return {
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionDuration,
            restDuration
        };
    }

    /**
     * Creates a TimerContext from persisted state
     */
    private createTimerContextFromPersisted(persistedState: PersistedState): TimerContext {
        return {
            currentState: persistedState.currentState,
            remainingTime: persistedState.remainingTime,
            sessionDuration: persistedState.sessionDuration,
            restDuration: persistedState.restDuration,
            sessionStartTime: persistedState.sessionStartTime ? new Date(persistedState.sessionStartTime) : undefined,
            pausedAt: persistedState.currentState === TimerState.PAUSED ? new Date() : undefined
        };
    }

    /**
     * Validates that the persisted state has all required properties and valid values
     */
    private isValidPersistedState(state: any): state is PersistedState {
        if (!state || typeof state !== 'object') {
            return false;
        }

        // Check required properties
        const requiredProps = ['currentState', 'remainingTime', 'lastActiveTime', 'sessionCount', 'totalWorkTime', 'sessionDuration', 'restDuration'];
        for (const prop of requiredProps) {
            if (!(prop in state)) {
                return false;
            }
        }

        // Validate state values
        if (!Object.values(TimerState).includes(state.currentState)) {
            return false;
        }

        if (typeof state.remainingTime !== 'number' || state.remainingTime < 0) {
            return false;
        }

        if (typeof state.sessionDuration !== 'number' || state.sessionDuration < 1 || state.sessionDuration > 120) {
            return false;
        }

        if (typeof state.restDuration !== 'number' || state.restDuration < 1 || state.restDuration > 60) {
            return false;
        }

        // Validate dates
        try {
            new Date(state.lastActiveTime);
            if (state.sessionStartTime) {
                new Date(state.sessionStartTime);
            }
        } catch {
            return false;
        }

        return true;
    }

    /**
     * Clears the persisted state
     */
    public async clearState(): Promise<void> {
        await this.context.globalState.update(StateManager.STATE_KEY, undefined);
    }

    /**
     * Gets statistics from persisted state
     */
    public getStatistics(): { sessionCount: number; totalWorkTime: number } {
        const persistedState = this.context.globalState.get<PersistedState>(StateManager.STATE_KEY);
        
        if (!persistedState || !this.isValidPersistedState(persistedState)) {
            return { sessionCount: 0, totalWorkTime: 0 };
        }

        return {
            sessionCount: persistedState.sessionCount,
            totalWorkTime: persistedState.totalWorkTime
        };
    }

    /**
     * Updates statistics in persisted state
     */
    public async updateStatistics(sessionCount: number, totalWorkTime: number): Promise<void> {
        const persistedState = this.context.globalState.get<PersistedState>(StateManager.STATE_KEY);
        
        if (persistedState && this.isValidPersistedState(persistedState)) {
            persistedState.sessionCount = sessionCount;
            persistedState.totalWorkTime = totalWorkTime;
            await this.context.globalState.update(StateManager.STATE_KEY, persistedState);
        }
    }
}