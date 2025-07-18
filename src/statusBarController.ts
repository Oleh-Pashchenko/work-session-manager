import * as vscode from 'vscode';
import { TimerState, TimerContext, ThemeColors, VisibilityOptions } from './types';

/**
 * Manages the VS Code status bar integration for the Work Session Manager
 * Handles display formatting, button states, and visual theming
 */
export class StatusBarController {
    private statusBarItem: vscode.StatusBarItem;
    private currentContext: TimerContext | null = null;
    private themeColors: ThemeColors;
    private visibilityOptions: VisibilityOptions;

    constructor(
        themeColors: ThemeColors = { workSessionColor: '#4CAF50', restPeriodColor: '#F44336' },
        visibilityOptions: VisibilityOptions = { showCountdown: true, showStatusDot: true, showPausePlayButton: true }
    ) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.themeColors = themeColors;
        this.visibilityOptions = visibilityOptions;
        this.statusBarItem.show();
        this.updateDisplay();
    }

    /**
     * Updates the status bar display based on current timer context
     */
    public updateDisplay(context?: TimerContext): void {
        if (context) {
            this.currentContext = context;
        }

        if (!this.currentContext) {
            this.showIdleState();
            return;
        }

        switch (this.currentContext.currentState) {
            case TimerState.IDLE:
                this.showIdleState();
                break;
            case TimerState.WORK_SESSION:
                this.showWorkSessionState();
                break;
            case TimerState.REST_PERIOD:
                this.showRestPeriodState();
                break;
            case TimerState.PAUSED:
                this.showPausedState();
                break;
        }
    }

    /**
     * Shows idle state in status bar
     */
    private showIdleState(): void {
        const parts: string[] = [];
        
        if (this.visibilityOptions.showStatusDot) {
            parts.push('⚪'); // White dot for idle
        }
        
        if (this.visibilityOptions.showCountdown) {
            parts.push('Ready');
        }
        
        if (this.visibilityOptions.showPausePlayButton) {
            parts.push('▶️'); // Play button
        }
        
        this.statusBarItem.text = parts.join(' ');
        this.statusBarItem.tooltip = 'Work Session Manager - Click to start work session';
        this.statusBarItem.command = 'workSessionManager.startSession';
        this.statusBarItem.color = undefined; // Use default color
    }

    /**
     * Shows work session state in status bar
     */
    private showWorkSessionState(): void {
        if (!this.currentContext) return;
        
        const parts: string[] = [];
        
        if (this.visibilityOptions.showStatusDot) {
            parts.push('🟢'); // Green dot for work session
        }
        
        if (this.visibilityOptions.showCountdown) {
            parts.push(this.formatTime(this.currentContext.remainingTime));
        }
        
        if (this.visibilityOptions.showPausePlayButton) {
            parts.push('⏸️'); // Pause button
        }
        
        this.statusBarItem.text = parts.join(' ');
        this.statusBarItem.tooltip = `Work Session - ${this.formatTime(this.currentContext.remainingTime)} remaining. Click to pause.`;
        this.statusBarItem.command = 'workSessionManager.pause';
        this.statusBarItem.color = this.themeColors.workSessionColor;
    }

    /**
     * Shows rest period state in status bar
     */
    private showRestPeriodState(): void {
        if (!this.currentContext) return;
        
        const parts: string[] = [];
        
        if (this.visibilityOptions.showStatusDot) {
            parts.push('🔵'); // Blue dot for rest period
        }
        
        if (this.visibilityOptions.showCountdown) {
            parts.push(this.formatTime(this.currentContext.remainingTime));
        }
        
        if (this.visibilityOptions.showPausePlayButton) {
            parts.push('⏸️'); // Pause button
        }
        
        this.statusBarItem.text = parts.join(' ');
        this.statusBarItem.tooltip = `Rest Period - ${this.formatTime(this.currentContext.remainingTime)} remaining. Click to pause.`;
        this.statusBarItem.command = 'workSessionManager.pause';
        this.statusBarItem.color = this.themeColors.restPeriodColor;
    }

    /**
     * Shows paused state in status bar
     */
    private showPausedState(): void {
        if (!this.currentContext) return;
        
        const parts: string[] = [];
        
        if (this.visibilityOptions.showStatusDot) {
            parts.push('🟡'); // Yellow dot for paused state
        }
        
        if (this.visibilityOptions.showCountdown) {
            parts.push(this.formatTime(this.currentContext.remainingTime));
        }
        
        if (this.visibilityOptions.showPausePlayButton) {
            parts.push('▶️'); // Play button only
        }
        
        this.statusBarItem.text = parts.join(' ');
        this.statusBarItem.tooltip = `Timer Paused - ${this.formatTime(this.currentContext.remainingTime)} remaining. Click to resume.`;
        this.statusBarItem.command = 'workSessionManager.resume';
        this.statusBarItem.color = '#FFA500'; // Orange color for paused state
    }

    /**
     * Applies new theme colors
     */
    public applyTheme(colors: ThemeColors): void {
        this.themeColors = colors;
        this.updateDisplay(); // Refresh display with new colors
    }

    /**
     * Updates visibility options
     */
    public toggleVisibility(options: VisibilityOptions): void {
        this.visibilityOptions = options;
        this.updateDisplay(); // Refresh display with new visibility settings
    }

    /**
     * Shows play button (for idle or paused states)
     */
    public showPlayButton(): void {
        // This is handled automatically in the state-specific methods
        this.updateDisplay();
    }

    /**
     * Shows pause button (for active states)
     */
    public showPauseButton(): void {
        // This is handled automatically in the state-specific methods
        this.updateDisplay();
    }

    /**
     * Formats time in MM:SS format
     */
    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Shows a temporary message in the status bar
     */
    public showTemporaryMessage(message: string, durationMs: number = 3000): void {
        const originalText = this.statusBarItem.text;
        const originalTooltip = this.statusBarItem.tooltip;
        const originalCommand = this.statusBarItem.command;
        const originalColor = this.statusBarItem.color;

        this.statusBarItem.text = message;
        this.statusBarItem.tooltip = message;
        this.statusBarItem.command = undefined;
        this.statusBarItem.color = '#FFA500'; // Orange for notifications

        setTimeout(() => {
            this.statusBarItem.text = originalText;
            this.statusBarItem.tooltip = originalTooltip;
            this.statusBarItem.command = originalCommand;
            this.statusBarItem.color = originalColor;
        }, durationMs);
    }

    /**
     * Shows session completion notification
     */
    public showSessionComplete(): void {
        this.showTemporaryMessage('✅ Work Session Complete!', 5000);
    }

    /**
     * Shows rest completion notification
     */
    public showRestComplete(): void {
        this.showTemporaryMessage('✅ Rest Period Complete!', 5000);
    }

    /**
     * Shows timer started notification
     */
    public showTimerStarted(isWorkSession: boolean): void {
        const message = isWorkSession ? '▶️ Work Session Started' : '▶️ Rest Period Started';
        this.showTemporaryMessage(message, 2000);
    }

    /**
     * Shows timer paused notification
     */
    public showTimerPaused(): void {
        this.showTemporaryMessage('⏸️ Timer Paused', 2000);
    }

    /**
     * Shows timer resumed notification
     */
    public showTimerResumed(): void {
        this.showTemporaryMessage('▶️ Timer Resumed', 2000);
    }

    /**
     * Shows timer reset notification
     */
    public showTimerReset(): void {
        this.showTemporaryMessage('🔄 Timer Reset', 2000);
    }

    /**
     * Gets current visibility options
     */
    public getVisibilityOptions(): VisibilityOptions {
        return { ...this.visibilityOptions };
    }

    /**
     * Gets current theme colors
     */
    public getThemeColors(): ThemeColors {
        return { ...this.themeColors };
    }

    /**
     * Checks if status bar is currently showing a temporary message
     */
    public isShowingTemporaryMessage(): boolean {
        // This is a simple check - in a real implementation you might want to track this more precisely
        return this.statusBarItem.color === '#FFA500' && 
               !this.statusBarItem.text.includes('⏸️') && 
               !this.statusBarItem.text.includes('🟢') && 
               !this.statusBarItem.text.includes('🔴');
    }

    /**
     * Forces an immediate display update
     */
    public forceUpdate(): void {
        this.updateDisplay();
    }

    /**
     * Hides the status bar item
     */
    public hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * Shows the status bar item
     */
    public show(): void {
        this.statusBarItem.show();
    }

    /**
     * Disposes of the status bar item
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}