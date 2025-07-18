import * as vscode from 'vscode';
import { TimerManager } from './timerManager';
import { StatusBarController } from './statusBarController';
import { ConfigurationManager } from './configurationManager';
import { AudioManager } from './audioManager';
import { StateManager } from './stateManager';
import { TimerState, TimerEventData, ExtensionConfig } from './types';

/**
 * Main extension class that coordinates all components
 */
class WorkSessionManagerExtension {
    private timerManager!: TimerManager;
    private statusBarController!: StatusBarController;
    private configurationManager: ConfigurationManager;
    private audioManager!: AudioManager;
    private stateManager: StateManager;
    private context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];
    private sessionCount: number = 0;
    private totalWorkTime: number = 0;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configurationManager = new ConfigurationManager();
        this.stateManager = new StateManager(context);
        
        // Initialize components
        this.initializeComponents();
        this.registerCommands();
        this.setupEventHandlers();
        this.restoreState();
    }

    /**
     * Initializes all extension components
     */
    private initializeComponents(): void {
        const config = this.configurationManager.getConfiguration();
        
        // Initialize timer manager
        this.timerManager = new TimerManager(config.sessionDuration, config.restDuration);
        
        // Initialize status bar controller
        this.statusBarController = new StatusBarController(
            this.configurationManager.getThemeColors(),
            {
                showCountdown: config.showCountdown,
                showStatusDot: config.showStatusDot,
                showPausePlayButton: config.showPausePlayButton
            }
        );
        
        // Initialize audio manager
        this.audioManager = new AudioManager(config.soundEnabled);
    }

    /**
     * Registers VS Code commands
     */
    private registerCommands(): void {
        const commands = [
            vscode.commands.registerCommand('workSessionManager.startSession', () => this.startSession()),
            vscode.commands.registerCommand('workSessionManager.startRest', () => this.startRest()),
            vscode.commands.registerCommand('workSessionManager.pause', () => this.pause()),
            vscode.commands.registerCommand('workSessionManager.resume', () => this.resume()),
            vscode.commands.registerCommand('workSessionManager.reset', () => this.reset())
        ];

        this.disposables.push(...commands);
    }

    /**
     * Sets up event handlers for timer and configuration changes
     */
    private setupEventHandlers(): void {
        // Timer state change handler
        this.timerManager.on('stateChange', (eventData: TimerEventData) => {
            this.handleTimerStateChange(eventData);
        });

        // Timer completion handler
        this.timerManager.on('timerComplete', (eventData: TimerEventData) => {
            this.handleTimerCompletion(eventData);
        });

        // Configuration change handler
        const configChangeDisposable = this.configurationManager.onConfigurationChanged((config) => {
            this.handleConfigurationChange(config);
        });

        this.disposables.push(configChangeDisposable);
    }

    /**
     * Handles timer state changes
     */
    private handleTimerStateChange(eventData: TimerEventData): void {
        const context = this.timerManager.getCurrentState();
        this.statusBarController.updateDisplay(context);
        
        // Save state periodically
        this.saveState();
    }

    /**
     * Handles timer completion events
     */
    private async handleTimerCompletion(eventData: TimerEventData): Promise<void> {
        const config = this.configurationManager.getConfiguration();
        
        if (eventData.state === TimerState.WORK_SESSION) {
            // Work session completed
            this.sessionCount++;
            this.totalWorkTime += config.sessionDuration * 60; // Convert to seconds
            
            // Play audio notification
            await this.audioManager.playSessionEndSound();
            
            // Show completion notification
            this.statusBarController.showSessionComplete();
            
            // Auto-start rest if enabled
            if (config.autoStartRest) {
                setTimeout(() => {
                    this.startRest();
                }, 2000); // Small delay to show completion message
            }
            
        } else if (eventData.state === TimerState.REST_PERIOD) {
            // Rest period completed
            await this.audioManager.playRestEndSound();
            this.statusBarController.showRestComplete();
            
            // Auto-start work session if enabled
            if (config.autoStartWork) {
                setTimeout(() => {
                    this.startSession();
                }, 2000); // Small delay to show completion message
            }
        }
        
        // Update statistics
        await this.stateManager.updateStatistics(this.sessionCount, this.totalWorkTime);
    }

    /**
     * Handles configuration changes
     */
    private handleConfigurationChange(config: ExtensionConfig): void {
        // Update timer durations
        this.timerManager.updateDurations(config.sessionDuration, config.restDuration);
        
        // Update status bar theme and visibility
        this.statusBarController.applyTheme({
            workSessionColor: config.workSessionColor,
            restPeriodColor: config.restPeriodColor
        });
        
        this.statusBarController.toggleVisibility({
            showCountdown: config.showCountdown,
            showStatusDot: config.showStatusDot,
            showPausePlayButton: config.showPausePlayButton
        });
        
        // Update audio settings
        this.audioManager.setAudioEnabled(config.soundEnabled);
        
        // Force status bar update
        this.statusBarController.forceUpdate();
    }

    /**
     * Starts a work session
     */
    private startSession(): void {
        this.timerManager.startSession();
        this.statusBarController.showTimerStarted(true);
        this.saveState();
    }

    /**
     * Starts a rest period
     */
    private startRest(): void {
        this.timerManager.startRest();
        this.statusBarController.showTimerStarted(false);
        this.saveState();
    }

    /**
     * Pauses the current timer
     */
    private pause(): void {
        this.timerManager.pause();
        this.statusBarController.showTimerPaused();
        this.saveState();
    }

    /**
     * Resumes a paused timer
     */
    private resume(): void {
        this.timerManager.resume();
        this.statusBarController.showTimerResumed();
        this.saveState();
    }

    /**
     * Resets the timer
     */
    private reset(): void {
        this.timerManager.reset();
        this.statusBarController.showTimerReset();
        this.saveState();
    }

    /**
     * Saves the current state
     */
    private async saveState(): Promise<void> {
        const context = this.timerManager.getCurrentState();
        await this.stateManager.saveState(context, this.sessionCount, this.totalWorkTime);
    }

    /**
     * Restores statistics from previous sessions but starts with a fresh timer
     */
    private async restoreState(): Promise<void> {
        try {
            // Only restore statistics, not the timer state
            const stats = this.stateManager.getStatistics();
            
            this.sessionCount = stats.sessionCount;
            this.totalWorkTime = stats.totalWorkTime;
            
            // Check if auto-start is enabled
            const config = this.configurationManager.getConfiguration();
            if (config.autoStartOnOpen) {
                // Auto-start work session
                this.timerManager.startSession();
                this.statusBarController.showTimerStarted(true);
                this.saveState();
                console.log('Work Session Manager: Auto-started work session');
            } else {
                // Start fresh - timer begins in idle state
                this.statusBarController.updateDisplay(this.timerManager.getCurrentState());
                console.log('Work Session Manager: Started fresh session');
            }
        } catch (error) {
            console.warn('Work Session Manager: Failed to restore statistics:', error);
            // Continue with fresh state
            this.statusBarController.updateDisplay(this.timerManager.getCurrentState());
        }
    }

    /**
     * Disposes of all resources
     */
    public dispose(): void {
        // Save final state
        this.saveState();
        
        // Dispose of all components
        this.timerManager.dispose();
        this.statusBarController.dispose();
        this.audioManager.dispose();
        
        // Dispose of all registered disposables
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}

// Global extension instance
let extensionInstance: WorkSessionManagerExtension | undefined;

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Work Session Manager extension is now active');
    
    try {
        extensionInstance = new WorkSessionManagerExtension(context);
        
        // Add extension instance to subscriptions for proper cleanup
        context.subscriptions.push({
            dispose: () => {
                if (extensionInstance) {
                    extensionInstance.dispose();
                    extensionInstance = undefined;
                }
            }
        });
        
        // Show welcome message on first activation
        const hasShownWelcome = context.globalState.get<boolean>('workSessionManager.hasShownWelcome', false);
        if (!hasShownWelcome) {
            vscode.window.showInformationMessage(
                'Work Session Manager is now active! Click the status bar to start your first work session.',
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'workSessionManager');
                }
            });
            
            context.globalState.update('workSessionManager.hasShownWelcome', true);
        }
        
    } catch (error) {
        console.error('Failed to activate Work Session Manager:', error);
        vscode.window.showErrorMessage('Failed to activate Work Session Manager extension');
    }
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
    console.log('Work Session Manager extension is being deactivated');
    
    if (extensionInstance) {
        extensionInstance.dispose();
        extensionInstance = undefined;
    }
}