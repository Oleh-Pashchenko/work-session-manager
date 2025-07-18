import { EventEmitter } from 'events';
import { TimerState, TimerContext, TimerEventData } from './types';

/**
 * Core timer management class that handles work sessions and rest periods
 * Implements a state machine for timer transitions and accurate time tracking
 */
export class TimerManager extends EventEmitter {
    private context: TimerContext;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly TICK_INTERVAL = 1000; // 1 second

    constructor(sessionDuration: number = 25, restDuration: number = 5) {
        super();
        this.context = {
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionDuration,
            restDuration
        };
    }

    /**
     * Starts a work session
     */
    public startSession(): void {
        this.stopTimer();
        this.context = {
            ...this.context,
            currentState: TimerState.WORK_SESSION,
            remainingTime: this.context.sessionDuration * 60, // convert to seconds
            sessionStartTime: new Date(),
            pausedAt: undefined
        };
        this.startTimer();
        this.emitStateChange();
    }

    /**
     * Starts a rest period
     */
    public startRest(): void {
        this.stopTimer();
        this.context = {
            ...this.context,
            currentState: TimerState.REST_PERIOD,
            remainingTime: this.context.restDuration * 60, // convert to seconds
            sessionStartTime: new Date(),
            pausedAt: undefined
        };
        this.startTimer();
        this.emitStateChange();
    }

    /**
     * Pauses the current timer
     */
    public pause(): void {
        if (this.context.currentState === TimerState.WORK_SESSION || 
            this.context.currentState === TimerState.REST_PERIOD) {
            this.stopTimer();
            this.context = {
                ...this.context,
                currentState: TimerState.PAUSED,
                pausedAt: new Date()
            };
            this.emitStateChange();
        }
    }

    /**
     * Resumes a paused timer
     */
    public resume(): void {
        if (this.context.currentState === TimerState.PAUSED && this.context.pausedAt) {
            // Determine what state to resume to based on previous context
            const previousState = this.context.remainingTime > 0 ? 
                (this.context.sessionStartTime ? TimerState.WORK_SESSION : TimerState.REST_PERIOD) :
                TimerState.IDLE;
            
            this.context = {
                ...this.context,
                currentState: previousState,
                pausedAt: undefined
            };
            
            if (previousState !== TimerState.IDLE) {
                this.startTimer();
            }
            this.emitStateChange();
        }
    }

    /**
     * Resets the timer to idle state
     */
    public reset(): void {
        this.stopTimer();
        this.context = {
            ...this.context,
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionStartTime: undefined,
            pausedAt: undefined
        };
        this.emitStateChange();
    }

    /**
     * Updates session and rest durations
     */
    public updateDurations(sessionDuration: number, restDuration: number): void {
        const oldSessionDuration = this.context.sessionDuration;
        const oldRestDuration = this.context.restDuration;
        
        this.context.sessionDuration = sessionDuration;
        this.context.restDuration = restDuration;
        
        // If currently idle, no need to adjust running timer
        if (this.context.currentState === TimerState.IDLE) {
            return;
        }
        
        // Handle duration changes during active sessions
        if (this.context.currentState === TimerState.WORK_SESSION) {
            // If work session duration changed, adjust remaining time proportionally
            if (oldSessionDuration !== sessionDuration) {
                const elapsedTime = (oldSessionDuration * 60) - this.context.remainingTime;
                const newTotalTime = sessionDuration * 60;
                this.context.remainingTime = Math.max(0, newTotalTime - elapsedTime);
                
                // If new duration is shorter and we've already exceeded it, complete the session
                if (this.context.remainingTime === 0) {
                    this.handleTimerCompletion();
                    return;
                }
            }
        } else if (this.context.currentState === TimerState.REST_PERIOD) {
            // If rest period duration changed, adjust remaining time proportionally
            if (oldRestDuration !== restDuration) {
                const elapsedTime = (oldRestDuration * 60) - this.context.remainingTime;
                const newTotalTime = restDuration * 60;
                this.context.remainingTime = Math.max(0, newTotalTime - elapsedTime);
                
                // If new duration is shorter and we've already exceeded it, complete the rest period
                if (this.context.remainingTime === 0) {
                    this.handleTimerCompletion();
                    return;
                }
            }
        } else if (this.context.currentState === TimerState.PAUSED) {
            // For paused sessions, we need to determine which type it was and adjust accordingly
            // We can infer this from the remaining time relative to the durations
            const wasWorkSession = this.context.remainingTime > (oldRestDuration * 60);
            
            if (wasWorkSession && oldSessionDuration !== sessionDuration) {
                const elapsedTime = (oldSessionDuration * 60) - this.context.remainingTime;
                const newTotalTime = sessionDuration * 60;
                this.context.remainingTime = Math.max(0, newTotalTime - elapsedTime);
            } else if (!wasWorkSession && oldRestDuration !== restDuration) {
                const elapsedTime = (oldRestDuration * 60) - this.context.remainingTime;
                const newTotalTime = restDuration * 60;
                this.context.remainingTime = Math.max(0, newTotalTime - elapsedTime);
            }
        }
        
        // Emit state change to update the display immediately
        this.emitStateChange();
    }

    /**
     * Gets the current timer state and context
     */
    public getCurrentState(): TimerContext {
        return { ...this.context };
    }

    /**
     * Checks if timer is currently running (not paused or idle)
     */
    public isRunning(): boolean {
        return this.context.currentState === TimerState.WORK_SESSION || 
               this.context.currentState === TimerState.REST_PERIOD;
    }

    /**
     * Checks if timer is paused
     */
    public isPaused(): boolean {
        return this.context.currentState === TimerState.PAUSED;
    }

    /**
     * Formats remaining time as MM:SS string
     */
    public formatTime(seconds: number = this.context.remainingTime): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Starts the internal countdown timer
     */
    private startTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            this.tick();
        }, this.TICK_INTERVAL);
    }

    /**
     * Stops the internal countdown timer
     */
    private stopTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Handles each timer tick (1 second interval)
     */
    private tick(): void {
        if (this.context.remainingTime > 0) {
            this.context.remainingTime--;
            this.emitStateChange();
        } else {
            // Timer completed - transition to next state
            this.handleTimerCompletion();
        }
    }

    /**
     * Handles timer completion and state transitions
     */
    private handleTimerCompletion(): void {
        const currentState = this.context.currentState;
        this.stopTimer();

        if (currentState === TimerState.WORK_SESSION) {
            // Work session completed - emit completion event
            this.emitStateChange(true);
            
            // Transition to idle (rest will be started by external logic if auto-start is enabled)
            this.context = {
                ...this.context,
                currentState: TimerState.IDLE,
                remainingTime: 0,
                sessionStartTime: undefined
            };
        } else if (currentState === TimerState.REST_PERIOD) {
            // Rest period completed - emit completion event
            this.emitStateChange(true);
            
            // Transition to idle (work session will be started by external logic if auto-start is enabled)
            this.context = {
                ...this.context,
                currentState: TimerState.IDLE,
                remainingTime: 0,
                sessionStartTime: undefined
            };
        }

        this.emitStateChange();
    }

    /**
     * Emits state change events for listeners
     */
    private emitStateChange(isTransition: boolean = false): void {
        const eventData: TimerEventData = {
            state: this.context.currentState,
            remainingTime: this.context.remainingTime,
            isTransition
        };
        
        this.emit('stateChange', eventData);
        
        if (isTransition) {
            this.emit('timerComplete', eventData);
        }
    }

    /**
     * Cleanup method to be called when timer manager is disposed
     */
    public dispose(): void {
        this.stopTimer();
        this.removeAllListeners();
    }
}