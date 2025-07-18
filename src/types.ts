/**
 * Core type definitions for the Work Session Manager extension
 */

export enum TimerState {
    IDLE = 'idle',
    WORK_SESSION = 'work_session',
    REST_PERIOD = 'rest_period',
    PAUSED = 'paused'
}

export interface TimerContext {
    currentState: TimerState;
    remainingTime: number; // in seconds
    sessionDuration: number; // in minutes
    restDuration: number; // in minutes
    pausedAt?: Date;
    sessionStartTime?: Date;
}

export interface ExtensionConfig {
    sessionDuration: number; // minutes (1-120)
    restDuration: number; // minutes (1-60)
    workSessionColor: string; // hex color or name
    restPeriodColor: string; // hex color or name
    soundEnabled: boolean;
    showCountdown: boolean;
    showStatusDot: boolean;
    autoStartRest: boolean;
    autoStartWork: boolean;
    showPausePlayButton: boolean;
    autoStartOnOpen: boolean;
}

export interface PersistedState {
    currentState: TimerState;
    remainingTime: number; // in seconds
    sessionStartTime?: Date;
    lastActiveTime: Date;
    sessionCount: number;
    totalWorkTime: number; // in seconds
    sessionDuration: number; // in minutes
    restDuration: number; // in minutes
}

export interface ThemeColors {
    workSessionColor: string;
    restPeriodColor: string;
}

export interface VisibilityOptions {
    showCountdown: boolean;
    showStatusDot: boolean;
    showPausePlayButton: boolean;
}

export interface TimerEventData {
    state: TimerState;
    remainingTime: number;
    isTransition?: boolean;
}