import * as assert from 'assert';
import * as vscode from 'vscode';
import { StatusBarController } from '../../statusBarController';
import { TimerState, TimerContext, ThemeColors, VisibilityOptions } from '../../types';

// Mock VS Code StatusBarItem
class MockStatusBarItem implements vscode.StatusBarItem {
    id: string = 'test';
    alignment: vscode.StatusBarAlignment = vscode.StatusBarAlignment.Left;
    priority?: number = 100;
    text: string = '';
    tooltip?: string | vscode.MarkdownString;
    color?: string | vscode.ThemeColor;
    command?: string | vscode.Command;
    accessibilityInformation?: vscode.AccessibilityInformation;
    backgroundColor?: vscode.ThemeColor;
    name?: string;

    show(): void {
        // Mock implementation
    }

    hide(): void {
        // Mock implementation
    }

    dispose(): void {
        // Mock implementation
    }
}

suite('StatusBarController Test Suite', () => {
    let statusBarController: StatusBarController;
    let mockStatusBarItem: MockStatusBarItem;
    let originalCreateStatusBarItem: typeof vscode.window.createStatusBarItem;

    setup(() => {
        mockStatusBarItem = new MockStatusBarItem();
        
        // Mock vscode.window.createStatusBarItem
        originalCreateStatusBarItem = vscode.window.createStatusBarItem;
        vscode.window.createStatusBarItem = () => mockStatusBarItem;
        
        statusBarController = new StatusBarController();
    });

    teardown(() => {
        // Restore original function
        vscode.window.createStatusBarItem = originalCreateStatusBarItem;
        statusBarController.dispose();
    });

    test('Should initialize with idle state', () => {
        assert.ok(mockStatusBarItem.text.includes('Ready'));
        assert.ok(mockStatusBarItem.text.includes('▶️'));
        assert.strictEqual(mockStatusBarItem.command, 'workSessionManager.startSession');
    });

    test('Should display work session state correctly', () => {
        const context: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500, // 25 minutes
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context);

        assert.ok(mockStatusBarItem.text.includes('🟢')); // Green dot
        assert.ok(mockStatusBarItem.text.includes('25:00')); // Countdown
        assert.ok(mockStatusBarItem.text.includes('⏸️')); // Pause button
        assert.strictEqual(mockStatusBarItem.command, 'workSessionManager.pause');
        assert.strictEqual(mockStatusBarItem.color, '#4CAF50'); // Default work color
    });

    test('Should display rest period state correctly', () => {
        const context: TimerContext = {
            currentState: TimerState.REST_PERIOD,
            remainingTime: 300, // 5 minutes
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context);

        assert.ok(mockStatusBarItem.text.includes('🔴')); // Red dot
        assert.ok(mockStatusBarItem.text.includes('05:00')); // Countdown
        assert.ok(mockStatusBarItem.text.includes('⏸️')); // Pause button
        assert.strictEqual(mockStatusBarItem.command, 'workSessionManager.pause');
        assert.strictEqual(mockStatusBarItem.color, '#F44336'); // Default rest color
    });

    test('Should display paused state correctly', () => {
        const context: TimerContext = {
            currentState: TimerState.PAUSED,
            remainingTime: 900, // 15 minutes
            sessionDuration: 25,
            restDuration: 5,
            pausedAt: new Date()
        };

        statusBarController.updateDisplay(context);

        assert.ok(mockStatusBarItem.text.includes('⏸️')); // Pause icon
        assert.ok(mockStatusBarItem.text.includes('15:00')); // Countdown
        assert.ok(mockStatusBarItem.text.includes('▶️')); // Play button
        assert.strictEqual(mockStatusBarItem.command, 'workSessionManager.resume');
        assert.strictEqual(mockStatusBarItem.color, '#FFA500'); // Orange for paused
    });

    test('Should apply theme colors correctly', () => {
        const newColors: ThemeColors = {
            workSessionColor: '#00FF00',
            restPeriodColor: '#FF0000'
        };

        statusBarController.applyTheme(newColors);

        const context: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500,
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context);
        assert.strictEqual(mockStatusBarItem.color, '#00FF00');
    });

    test('Should handle visibility options correctly', () => {
        const visibilityOptions: VisibilityOptions = {
            showCountdown: false,
            showStatusDot: true
        };

        statusBarController.toggleVisibility(visibilityOptions);

        const context: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500,
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context);

        assert.ok(mockStatusBarItem.text.includes('🟢')); // Should show dot
        assert.ok(!mockStatusBarItem.text.includes('25:00')); // Should not show countdown
    });

    test('Should handle visibility options with countdown only', () => {
        const visibilityOptions: VisibilityOptions = {
            showCountdown: true,
            showStatusDot: false
        };

        statusBarController.toggleVisibility(visibilityOptions);

        const context: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500,
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context);

        assert.ok(!mockStatusBarItem.text.includes('🟢')); // Should not show dot
        assert.ok(mockStatusBarItem.text.includes('25:00')); // Should show countdown
    });

    test('Should format time correctly', () => {
        const context1: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context1);
        assert.ok(mockStatusBarItem.text.includes('00:00'));

        const context2: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 59,
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context2);
        assert.ok(mockStatusBarItem.text.includes('00:59'));

        const context3: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 3661, // 61:01
            sessionDuration: 25,
            restDuration: 5
        };

        statusBarController.updateDisplay(context3);
        assert.ok(mockStatusBarItem.text.includes('61:01'));
    });

    test('Should show temporary messages', (done) => {
        const originalText = mockStatusBarItem.text;
        
        statusBarController.showTemporaryMessage('Test Message', 100);
        
        assert.strictEqual(mockStatusBarItem.text, 'Test Message');
        assert.strictEqual(mockStatusBarItem.color, '#FFA500');
        
        setTimeout(() => {
            assert.strictEqual(mockStatusBarItem.text, originalText);
            done();
        }, 150);
    });

    test('Should show session complete notification', () => {
        statusBarController.showSessionComplete();
        assert.ok(mockStatusBarItem.text.includes('✅ Work Session Complete!'));
    });

    test('Should show rest complete notification', () => {
        statusBarController.showRestComplete();
        assert.ok(mockStatusBarItem.text.includes('✅ Rest Period Complete!'));
    });

    test('Should show timer started notifications', () => {
        statusBarController.showTimerStarted(true);
        assert.ok(mockStatusBarItem.text.includes('▶️ Work Session Started'));
        
        statusBarController.showTimerStarted(false);
        assert.ok(mockStatusBarItem.text.includes('▶️ Rest Period Started'));
    });

    test('Should show timer control notifications', () => {
        statusBarController.showTimerPaused();
        assert.ok(mockStatusBarItem.text.includes('⏸️ Timer Paused'));
        
        statusBarController.showTimerResumed();
        assert.ok(mockStatusBarItem.text.includes('▶️ Timer Resumed'));
        
        statusBarController.showTimerReset();
        assert.ok(mockStatusBarItem.text.includes('🔄 Timer Reset'));
    });

    test('Should get current visibility options', () => {
        const options: VisibilityOptions = {
            showCountdown: false,
            showStatusDot: true
        };
        
        statusBarController.toggleVisibility(options);
        const currentOptions = statusBarController.getVisibilityOptions();
        
        assert.deepStrictEqual(currentOptions, options);
    });

    test('Should get current theme colors', () => {
        const colors: ThemeColors = {
            workSessionColor: '#123456',
            restPeriodColor: '#654321'
        };
        
        statusBarController.applyTheme(colors);
        const currentColors = statusBarController.getThemeColors();
        
        assert.deepStrictEqual(currentColors, colors);
    });

    test('Should handle idle state after context update', () => {
        // First set a work session
        const workContext: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500,
            sessionDuration: 25,
            restDuration: 5
        };
        statusBarController.updateDisplay(workContext);
        
        // Then set idle
        const idleContext: TimerContext = {
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };
        statusBarController.updateDisplay(idleContext);
        
        assert.ok(mockStatusBarItem.text.includes('Ready'));
        assert.ok(mockStatusBarItem.text.includes('▶️'));
        assert.strictEqual(mockStatusBarItem.command, 'workSessionManager.startSession');
    });
});