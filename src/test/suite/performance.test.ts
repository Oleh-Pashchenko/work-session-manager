import * as assert from 'assert';
import * as vscode from 'vscode';
import { TimerManager } from '../../timerManager';
import { StatusBarController } from '../../statusBarController';
import { AudioManager } from '../../audioManager';
import { ConfigurationManager } from '../../configurationManager';
import { StateManager } from '../../stateManager';

suite('Performance Tests', () => {
    let timerManager: TimerManager;
    let statusBarController: StatusBarController;
    let audioManager: AudioManager;
    let configManager: ConfigurationManager;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create mock extension context for testing
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

        timerManager = new TimerManager(25, 5);
        statusBarController = new StatusBarController(
            { workSessionColor: '#4CAF50', restPeriodColor: '#F44336' },
            { showCountdown: true, showStatusDot: true }
        );
        audioManager = new AudioManager(true);
        configManager = new ConfigurationManager();
    });

    teardown(() => {
        timerManager.dispose();
        statusBarController.dispose();
        audioManager.dispose();
    });

    suite('Memory Usage Tests', () => {
        test('Should maintain stable memory usage during extended operation', () => {
            const initialMemory = process.memoryUsage();
            
            // Simulate 1 hour of operation with 1-second intervals
            const iterations = 100; // Reduced for test speed
            
            for (let i = 0; i < iterations; i++) {
                // Start session
                timerManager.startSession();
                const state = timerManager.getCurrentState();
                statusBarController.updateDisplay(state);
                
                // Pause and resume
                timerManager.pause();
                timerManager.resume();
                
                // Update display multiple times
                for (let j = 0; j < 10; j++) {
                    statusBarController.updateDisplay(timerManager.getCurrentState());
                }
                
                // Reset
                timerManager.reset();
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Memory increase should be minimal (less than 5MB)
            assert.ok(memoryIncrease < 5 * 1024 * 1024, 
                `Memory leak detected: ${memoryIncrease} bytes increase`);
        });

        test('Should handle rapid timer updates efficiently', () => {
            const startTime = process.hrtime.bigint();
            const iterations = 10000;
            
            for (let i = 0; i < iterations; i++) {
                const state = timerManager.getCurrentState();
                statusBarController.updateDisplay(state);
            }
            
            const endTime = process.hrtime.bigint();
            const durationMs = Number(endTime - startTime) / 1000000;
            
            // Should complete within reasonable time (less than 100ms for 10k updates)
            assert.ok(durationMs < 100, 
                `Timer updates too slow: ${durationMs}ms for ${iterations} updates`);
        });
    });

    suite('CPU Usage Tests', () => {
        test('Should not block event loop during timer operations', (done) => {
            let eventLoopBlocked = false;
            
            // Set up event loop monitoring
            const checkInterval = setInterval(() => {
                eventLoopBlocked = true;
            }, 1);
            
            // Perform intensive timer operations
            setTimeout(() => {
                for (let i = 0; i < 1000; i++) {
                    timerManager.startSession();
                    timerManager.pause();
                    timerManager.resume();
                    timerManager.reset();
                    statusBarController.updateDisplay(timerManager.getCurrentState());
                }
                
                clearInterval(checkInterval);
                
                // Event loop should not have been blocked
                assert.ok(!eventLoopBlocked, 'Event loop was blocked during timer operations');
                done();
            }, 10);
        });

        test('Should handle concurrent operations efficiently', async () => {
            const startTime = Date.now();
            const promises: Promise<void>[] = [];
            
            // Create multiple concurrent operations
            for (let i = 0; i < 100; i++) {
                promises.push(
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            timerManager.startSession();
                            statusBarController.updateDisplay(timerManager.getCurrentState());
                            timerManager.reset();
                            resolve();
                        }, Math.random() * 10);
                    })
                );
            }
            
            await Promise.all(promises);
            
            const duration = Date.now() - startTime;
            
            // Should complete within reasonable time
            assert.ok(duration < 1000, `Concurrent operations took too long: ${duration}ms`);
        });
    });

    suite('State Management Performance', () => {
        test('Should handle frequent state saves efficiently', async () => {
            const stateManager = new StateManager(mockContext);
            const startTime = Date.now();
            
            // Perform frequent state saves
            for (let i = 0; i < 100; i++) {
                const state = timerManager.getCurrentState();
                await stateManager.saveState(state, i, i * 60);
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete within reasonable time (less than 500ms)
            assert.ok(duration < 500, `State saves too slow: ${duration}ms`);
        });

        test('Should handle state restoration efficiently', async () => {
            const stateManager = new StateManager(mockContext);
            
            // Save a state first
            const state = timerManager.getCurrentState();
            await stateManager.saveState(state, 5, 300);
            
            const startTime = Date.now();
            
            // Restore state multiple times
            for (let i = 0; i < 50; i++) {
                await stateManager.restoreState();
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete within reasonable time (less than 200ms)
            assert.ok(duration < 200, `State restoration too slow: ${duration}ms`);
        });
    });

    suite('Audio Performance Tests', () => {
        test('Should handle audio operations without blocking', async () => {
            const startTime = Date.now();
            
            // Test multiple audio operations
            const audioPromises = [];
            for (let i = 0; i < 10; i++) {
                audioPromises.push(audioManager.testAudio());
            }
            
            await Promise.all(audioPromises);
            
            const duration = Date.now() - startTime;
            
            // Audio operations should not take too long
            assert.ok(duration < 5000, `Audio operations too slow: ${duration}ms`);
        });

        test('Should handle audio failures gracefully without performance impact', async () => {
            // Disable audio to simulate failure
            audioManager.setAudioEnabled(false);
            
            const startTime = Date.now();
            
            // Attempt multiple audio operations
            for (let i = 0; i < 100; i++) {
                await audioManager.playSessionEndSound();
                await audioManager.playRestEndSound();
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete quickly when audio is disabled
            assert.ok(duration < 100, `Disabled audio operations too slow: ${duration}ms`);
        });
    });

    suite('Configuration Performance', () => {
        test('Should handle configuration reads efficiently', () => {
            const startTime = Date.now();
            
            // Read configuration multiple times
            for (let i = 0; i < 1000; i++) {
                configManager.getConfiguration();
                configManager.getThemeColors();
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete quickly
            assert.ok(duration < 100, `Configuration reads too slow: ${duration}ms`);
        });

        test('Should handle configuration validation efficiently', () => {
            const startTime = Date.now();
            
            // Validate many configurations
            for (let i = 1; i <= 120; i++) {
                configManager.validateSessionDuration(i);
                configManager.validateRestDuration(i % 60 + 1);
                configManager.validateColor('#' + i.toString(16).padStart(6, '0'));
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete quickly
            assert.ok(duration < 50, `Configuration validation too slow: ${duration}ms`);
        });
    });

    suite('Status Bar Performance', () => {
        test('Should handle frequent display updates efficiently', () => {
            const startTime = Date.now();
            
            // Update display frequently
            for (let i = 0; i < 1000; i++) {
                const state = timerManager.getCurrentState();
                state.remainingTime = i;
                statusBarController.updateDisplay(state);
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete quickly
            assert.ok(duration < 200, `Status bar updates too slow: ${duration}ms`);
        });

        test('Should handle theme changes efficiently', () => {
            const startTime = Date.now();
            
            // Change themes frequently
            for (let i = 0; i < 100; i++) {
                statusBarController.applyTheme({
                    workSessionColor: `#${(i * 1000).toString(16).padStart(6, '0')}`,
                    restPeriodColor: `#${(i * 2000).toString(16).padStart(6, '0')}`
                });
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete quickly
            assert.ok(duration < 100, `Theme changes too slow: ${duration}ms`);
        });
    });

    suite('Resource Cleanup Tests', () => {
        test('Should properly dispose of resources', () => {
            // Create multiple instances
            const managers = [];
            for (let i = 0; i < 10; i++) {
                managers.push(new TimerManager(25, 5));
                managers.push(new StatusBarController(
                    { workSessionColor: '#4CAF50', restPeriodColor: '#F44336' },
                    { showCountdown: true, showStatusDot: true }
                ));
                managers.push(new AudioManager(true));
            }
            
            // Dispose all
            managers.forEach(manager => manager.dispose());
            
            // Should not throw or cause issues
            assert.ok(true, 'Resource disposal completed successfully');
        });
    });
});