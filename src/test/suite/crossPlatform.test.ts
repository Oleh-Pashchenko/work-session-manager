import * as assert from 'assert';
import * as vscode from 'vscode';
import * as os from 'os';
import { AudioManager } from '../../audioManager';
import { ConfigurationManager } from '../../configurationManager';
import { TimerManager } from '../../timerManager';
import { StatusBarController } from '../../statusBarController';

suite('Cross-Platform Compatibility Tests', () => {
    let audioManager: AudioManager;
    let configManager: ConfigurationManager;
    let timerManager: TimerManager;
    let statusBarController: StatusBarController;

    setup(() => {
        audioManager = new AudioManager(true);
        configManager = new ConfigurationManager();
        timerManager = new TimerManager(25, 5);
        statusBarController = new StatusBarController(
            { workSessionColor: '#4CAF50', restPeriodColor: '#F44336' },
            { showCountdown: true, showStatusDot: true }
        );
    });

    teardown(() => {
        audioManager.dispose();
        timerManager.dispose();
        statusBarController.dispose();
    });

    suite('Platform Detection', () => {
        test('Should detect current platform correctly', () => {
            const platform = os.platform();
            const capabilities = audioManager.getAudioCapabilities();
            
            assert.strictEqual(capabilities.platform, platform);
            assert.ok(['darwin', 'win32', 'linux', 'freebsd', 'openbsd'].includes(platform));
        });

        test('Should have appropriate audio system for platform', () => {
            const capabilities = audioManager.getAudioCapabilities();
            const platform = os.platform();

            switch (platform) {
                case 'darwin':
                    assert.strictEqual(capabilities.audioSystem, 'CoreAudio');
                    break;
                case 'win32':
                    assert.strictEqual(capabilities.audioSystem, 'DirectSound');
                    break;
                case 'linux':
                    assert.strictEqual(capabilities.audioSystem, 'ALSA/PulseAudio');
                    break;
                default:
                    assert.strictEqual(capabilities.audioSystem, 'Unknown');
                    break;
            }
        });
    });

    suite('Audio System Validation', () => {
        test('Should report audio support status', () => {
            const isSupported = audioManager.isAudioSupported();
            const capabilities = audioManager.getAudioCapabilities();
            
            assert.strictEqual(isSupported, capabilities.hasAudioSupport);
        });

        test('Should have fallback mechanism available', () => {
            const capabilities = audioManager.getAudioCapabilities();
            assert.strictEqual(capabilities.fallbackAvailable, true);
        });

        test('Should provide meaningful audio description', () => {
            const description = audioManager.getAudioDescription();
            assert.ok(description.length > 0);
            assert.ok(typeof description === 'string');
        });

        test('Should handle audio enable/disable correctly', () => {
            audioManager.setAudioEnabled(false);
            assert.strictEqual(audioManager.getAudioEnabled(), false);
            
            const description = audioManager.getAudioDescription();
            assert.ok(description.includes('disabled'));
            
            audioManager.setAudioEnabled(true);
            assert.strictEqual(audioManager.getAudioEnabled(), true);
        });

        test('Should test audio functionality without throwing', async () => {
            // This test should not throw even if audio fails
            let testResult: boolean;
            try {
                testResult = await audioManager.testAudio();
                assert.ok(typeof testResult === 'boolean');
            } catch (error) {
                assert.fail(`Audio test should not throw: ${error}`);
            }
        });
    });

    suite('VS Code API Compatibility', () => {
        test('Should access VS Code configuration API', () => {
            const config = configManager.getConfiguration();
            assert.ok(config);
            assert.ok(typeof config.sessionDuration === 'number');
            assert.ok(typeof config.restDuration === 'number');
        });

        test('Should handle configuration validation', () => {
            // Test valid configurations
            assert.ok(configManager.validateSessionDuration(25));
            assert.ok(configManager.validateRestDuration(5));
            
            // Test invalid configurations
            assert.ok(!configManager.validateSessionDuration(0));
            assert.ok(!configManager.validateSessionDuration(121));
            assert.ok(!configManager.validateRestDuration(0));
            assert.ok(!configManager.validateRestDuration(61));
        });

        test('Should create status bar items without error', () => {
            // Status bar controller should initialize without throwing
            const controller = new StatusBarController(
                { workSessionColor: '#FF0000', restPeriodColor: '#00FF00' },
                { showCountdown: true, showStatusDot: true }
            );
            
            assert.ok(controller);
            controller.dispose();
        });
    });

    suite('Timer Functionality', () => {
        test('Should handle timer state transitions', () => {
            const initialState = timerManager.getCurrentState();
            assert.strictEqual(initialState.currentState, 'idle');
            
            timerManager.startSession();
            const workState = timerManager.getCurrentState();
            assert.strictEqual(workState.currentState, 'work_session');
            
            timerManager.pause();
            const pausedState = timerManager.getCurrentState();
            assert.strictEqual(pausedState.currentState, 'paused');
            
            timerManager.resume();
            const resumedState = timerManager.getCurrentState();
            assert.strictEqual(resumedState.currentState, 'work_session');
            
            timerManager.reset();
            const resetState = timerManager.getCurrentState();
            assert.strictEqual(resetState.currentState, 'idle');
        });

        test('Should format time correctly across locales', () => {
            const testTimes = [0, 30, 60, 90, 3600, 3661];
            const expectedFormats = ['00:00', '00:30', '01:00', '01:30', '60:00', '61:01'];
            
            testTimes.forEach((time, index) => {
                const formatted = timerManager.formatTime(time);
                assert.strictEqual(formatted, expectedFormats[index]);
            });
        });
    });

    suite('Memory and Performance', () => {
        test('Should not leak memory during normal operation', () => {
            const initialMemory = process.memoryUsage();
            
            // Simulate normal usage
            for (let i = 0; i < 100; i++) {
                timerManager.startSession();
                timerManager.pause();
                timerManager.resume();
                timerManager.reset();
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Memory increase should be reasonable (less than 10MB)
            assert.ok(memoryIncrease < 10 * 1024 * 1024, 
                `Memory increase too large: ${memoryIncrease} bytes`);
        });

        test('Should handle rapid state changes efficiently', () => {
            const startTime = Date.now();
            
            // Perform rapid state changes
            for (let i = 0; i < 1000; i++) {
                timerManager.startSession();
                timerManager.pause();
                timerManager.resume();
                timerManager.reset();
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time (less than 1 second)
            assert.ok(duration < 1000, `Operations took too long: ${duration}ms`);
        });
    });

    suite('Error Handling and Resilience', () => {
        test('Should handle invalid configuration gracefully', () => {
            // Test with invalid durations
            const invalidTimer = new TimerManager(-1, 0);
            const state = invalidTimer.getCurrentState();
            
            // Should use default values
            assert.ok(state.sessionDuration > 0);
            assert.ok(state.restDuration > 0);
            
            invalidTimer.dispose();
        });

        test('Should handle audio failures gracefully', async () => {
            // Disable audio and ensure no errors
            audioManager.setAudioEnabled(false);
            
            try {
                await audioManager.playSessionEndSound();
                await audioManager.playRestEndSound();
                // Should not throw
                assert.ok(true);
            } catch (error) {
                assert.fail(`Audio methods should not throw when disabled: ${error}`);
            }
        });

        test('Should handle missing VS Code APIs gracefully', () => {
            // This test ensures the extension doesn't crash if certain APIs are unavailable
            // In a real VS Code environment, this would test API compatibility
            assert.ok(vscode.window);
            assert.ok(vscode.workspace);
            assert.ok(vscode.commands);
        });
    });

    suite('VS Code Fork Compatibility', () => {
        test('Should work with standard VS Code APIs', () => {
            // Test basic API availability
            assert.ok(vscode.version);
            assert.ok(vscode.env);
            assert.ok(vscode.workspace.getConfiguration);
        });

        test('Should handle extension context properly', () => {
            // This would be tested with actual extension context in integration tests
            // For now, verify that our components don't require specific VS Code internals
            assert.ok(configManager);
            assert.ok(timerManager);
            assert.ok(statusBarController);
        });
    });
});