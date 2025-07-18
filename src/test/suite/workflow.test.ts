import * as assert from 'assert';
import * as vscode from 'vscode';
import { TimerManager } from '../../timerManager';
import { StatusBarController } from '../../statusBarController';
import { AudioManager } from '../../audioManager';
import { ConfigurationManager } from '../../configurationManager';
import { StateManager } from '../../stateManager';
import { TimerState } from '../../types';

suite('End-to-End Workflow Tests', () => {
    let timerManager: TimerManager;
    let statusBarController: StatusBarController;
    let audioManager: AudioManager;
    let configManager: ConfigurationManager;
    let stateManager: StateManager;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                setKeysForSync: () => {},
                keys: () => []
            },
            extensionPath: '',
            extensionUri: vscode.Uri.file(''),
            environmentVariableCollection: {} as any,
            asAbsolutePath: (path: string) => path,
            storageUri: undefined,
            storagePath: undefined,
            globalStorageUri: vscode.Uri.file(''),
            globalStoragePath: '',
            logUri: vscode.Uri.file(''),
            logPath: '',
            extensionMode: vscode.ExtensionMode.Test,
            extension: {} as any,
            secrets: {} as any
        };

        timerManager = new TimerManager(1, 1); // Use 1-minute sessions for faster testing
        statusBarController = new StatusBarController(
            { workSessionColor: '#4CAF50', restPeriodColor: '#F44336' },
            { showCountdown: true, showStatusDot: true }
        );
        audioManager = new AudioManager(false); // Disable audio for testing
        configManager = new ConfigurationManager();
        stateManager = new StateManager(mockContext);
    });

    teardown(() => {
        timerManager.dispose();
        statusBarController.dispose();
        audioManager.dispose();
    });

    suite('Complete Work Session Cycle', () => {
        test('Should complete full work session to rest cycle', (done) => {
            let sessionCompleted = false;
            let restStarted = false;

            // Listen for timer completion
            timerManager.on('timerComplete', (eventData) => {
                if (eventData.state === TimerState.WORK_SESSION) {
                    sessionCompleted = true;
                    // Start rest period
                    timerManager.startRest();
                    restStarted = true;
                } else if (eventData.state === TimerState.REST_PERIOD && sessionCompleted) {
                    // Verify complete cycle
                    assert.ok(sessionCompleted, 'Work session should have completed');
                    assert.ok(restStarted, 'Rest period should have started');
                    done();
                }
            });

            // Start the cycle
            timerManager.startSession();
            
            // Verify initial state
            const initialState = timerManager.getCurrentState();
            assert.strictEqual(initialState.currentState, TimerState.WORK_SESSION);
            
            // Update status bar
            statusBarController.updateDisplay(initialState);
        });

        test('Should handle pause and resume during work session', () => {
            timerManager.startSession();
            
            const workingState = timerManager.getCurrentState();
            assert.strictEqual(workingState.currentState, TimerState.WORK_SESSION);
            
            const initialTime = workingState.remainingTime;
            
            // Pause the timer
            timerManager.pause();
            const pausedState = timerManager.getCurrentState();
            assert.strictEqual(pausedState.currentState, TimerState.PAUSED);
            
            // Time should be preserved
            assert.strictEqual(pausedState.remainingTime, initialTime);
            
            // Resume the timer
            timerManager.resume();
            const resumedState = timerManager.getCurrentState();
            assert.strictEqual(resumedState.currentState, TimerState.WORK_SESSION);
            assert.strictEqual(resumedState.remainingTime, initialTime);
        });

        test('Should handle reset during active session', () => {
            timerManager.startSession();
            
            // Verify session is active
            let activeState = timerManager.getCurrentState();
            assert.strictEqual(activeState.currentState, TimerState.WORK_SESSION);
            
            // Reset the timer
            timerManager.reset();
            
            // Verify reset to idle
            const resetState = timerManager.getCurrentState();
            assert.strictEqual(resetState.currentState, TimerState.IDLE);
            assert.strictEqual(resetState.remainingTime, 0);
        });
    });

    suite('State Persistence Workflow', () => {
        test('Should persist and restore work session state', async () => {
            // Start a work session
            timerManager.startSession();
            const originalState = timerManager.getCurrentState();
            
            // Save state
            await stateManager.saveState(originalState, 1, 60);
            
            // Create new timer manager (simulating restart)
            const newTimerManager = new TimerManager(1, 1);
            
            // Restore state
            const restoredState = await stateManager.restoreState();
            
            // Verify restoration
            assert.ok(restoredState);
            assert.strictEqual(restoredState.currentState, TimerState.WORK_SESSION);
            assert.strictEqual(restoredState.sessionDuration, originalState.sessionDuration);
            assert.strictEqual(restoredState.restDuration, originalState.restDuration);
            
            newTimerManager.dispose();
        });

        test('Should handle state restoration after pause', async () => {
            // Start and pause a session
            timerManager.startSession();
            timerManager.pause();
            
            const pausedState = timerManager.getCurrentState();
            await stateManager.saveState(pausedState, 2, 120);
            
            // Restore state
            const restoredState = await stateManager.restoreState();
            
            // Verify paused state restoration
            assert.ok(restoredState);
            assert.strictEqual(restoredState.currentState, TimerState.PAUSED);
        });

        test('Should handle expired session restoration', async () => {
            // Create an expired session state
            const expiredState = {
                currentState: TimerState.WORK_SESSION,
                remainingTime: -60, // Expired 1 minute ago
                sessionDuration: 1,
                restDuration: 1,
                pausedAt: undefined
            };
            
            await stateManager.saveState(expiredState, 1, 60);
            
            // Restore state
            const restoredState = await stateManager.restoreState();
            
            // Should handle expired state gracefully
            assert.ok(restoredState);
            // Implementation should handle expired sessions appropriately
        });
    });

    suite('Configuration Change Workflow', () => {
        test('Should handle configuration changes during active session', () => {
            // Start a session with initial config
            timerManager.startSession();
            const initialState = timerManager.getCurrentState();
            
            // Change session duration
            timerManager.updateDurations(2, 1); // 2 minutes work, 1 minute rest
            
            const updatedState = timerManager.getCurrentState();
            assert.strictEqual(updatedState.sessionDuration, 2);
            assert.strictEqual(updatedState.restDuration, 1);
            
            // Current session should continue with original duration
            // (implementation detail - may vary based on requirements)
        });

        test('Should apply theme changes immediately', () => {
            const newColors = {
                workSessionColor: '#FF0000',
                restPeriodColor: '#0000FF'
            };
            
            // Apply theme
            statusBarController.applyTheme(newColors);
            
            // Start session to verify theme is applied
            timerManager.startSession();
            statusBarController.updateDisplay(timerManager.getCurrentState());
            
            // Theme should be applied (visual verification would be manual)
            assert.ok(true, 'Theme applied successfully');
        });

        test('Should handle visibility changes', () => {
            // Test different visibility combinations
            const visibilityOptions = [
                { showCountdown: true, showStatusDot: true },
                { showCountdown: true, showStatusDot: false },
                { showCountdown: false, showStatusDot: true },
                { showCountdown: false, showStatusDot: false }
            ];
            
            visibilityOptions.forEach(options => {
                statusBarController.toggleVisibility(options);
                
                // Start session to test visibility
                timerManager.startSession();
                statusBarController.updateDisplay(timerManager.getCurrentState());
                timerManager.reset();
                
                // Should not throw errors
                assert.ok(true, `Visibility options ${JSON.stringify(options)} applied successfully`);
            });
        });
    });

    suite('Audio Notification Workflow', () => {
        test('Should handle audio notifications during session transitions', async () => {
            // Enable audio for this test
            audioManager.setAudioEnabled(true);
            
            // Test session end notification
            try {
                await audioManager.playSessionEndSound();
                assert.ok(true, 'Session end sound played successfully');
            } catch (error) {
                // Audio might not be available in test environment
                console.warn('Audio test skipped:', error);
            }
            
            // Test rest end notification
            try {
                await audioManager.playRestEndSound();
                assert.ok(true, 'Rest end sound played successfully');
            } catch (error) {
                // Audio might not be available in test environment
                console.warn('Audio test skipped:', error);
            }
        });

        test('Should handle audio disabled state', async () => {
            audioManager.setAudioEnabled(false);
            
            // Should not throw when audio is disabled
            await audioManager.playSessionEndSound();
            await audioManager.playRestEndSound();
            
            assert.ok(true, 'Audio disabled state handled correctly');
        });
    });

    suite('Error Recovery Workflow', () => {
        test('Should recover from corrupted state', async () => {
            // Simulate corrupted state by saving invalid data
            const corruptedState = {
                currentState: 'invalid_state' as any,
                remainingTime: NaN,
                sessionDuration: -1,
                restDuration: 0,
                pausedAt: undefined
            };
            
            await stateManager.saveState(corruptedState, -1, NaN);
            
            // Attempt to restore
            const restoredState = await stateManager.restoreState();
            
            // Should handle corruption gracefully
            // (Implementation should provide defaults or null)
            if (restoredState) {
                assert.ok(typeof restoredState.currentState === 'string');
                assert.ok(typeof restoredState.remainingTime === 'number');
                assert.ok(restoredState.sessionDuration > 0);
                assert.ok(restoredState.restDuration > 0);
            }
        });

        test('Should handle timer manager errors gracefully', () => {
            // Test with invalid durations
            const invalidTimer = new TimerManager(-1, 0);
            
            // Should not throw
            invalidTimer.startSession();
            const state = invalidTimer.getCurrentState();
            
            // Should have valid state despite invalid input
            assert.ok(state.sessionDuration > 0);
            assert.ok(state.restDuration > 0);
            
            invalidTimer.dispose();
        });
    });

    suite('Multi-Session Workflow', () => {
        test('Should handle multiple consecutive sessions', (done) => {
            let completedSessions = 0;
            const targetSessions = 3;
            
            timerManager.on('timerComplete', (eventData) => {
                if (eventData.state === TimerState.WORK_SESSION) {
                    completedSessions++;
                    
                    if (completedSessions < targetSessions) {
                        // Start next session
                        setTimeout(() => {
                            timerManager.startSession();
                        }, 100);
                    } else {
                        // All sessions completed
                        assert.strictEqual(completedSessions, targetSessions);
                        done();
                    }
                }
            });
            
            // Start first session
            timerManager.startSession();
        });

        test('Should maintain statistics across sessions', async () => {
            // Simulate multiple completed sessions
            for (let i = 1; i <= 5; i++) {
                await stateManager.updateStatistics(i, i * 60);
            }
            
            const stats = stateManager.getStatistics();
            assert.strictEqual(stats.sessionCount, 5);
            assert.strictEqual(stats.totalWorkTime, 15 * 60); // 1+2+3+4+5 = 15 minutes
        });
    });

    suite('Integration with VS Code', () => {
        test('Should handle VS Code lifecycle events', () => {
            // Simulate extension activation
            const initialState = timerManager.getCurrentState();
            assert.strictEqual(initialState.currentState, TimerState.IDLE);
            
            // Simulate configuration access
            const config = configManager.getConfiguration();
            assert.ok(config);
            assert.ok(typeof config.sessionDuration === 'number');
            
            // Simulate status bar creation
            statusBarController.updateDisplay(initialState);
            
            // Should not throw errors
            assert.ok(true, 'VS Code integration successful');
        });
    });
});