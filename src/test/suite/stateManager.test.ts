import * as assert from 'assert';
import * as vscode from 'vscode';
import { StateManager } from '../../stateManager';
import { TimerState, TimerContext, PersistedState } from '../../types';

// Mock VS Code extension context
class MockExtensionContext implements vscode.ExtensionContext {
    subscriptions: vscode.Disposable[] = [];
    workspaceState: vscode.Memento = new MockMemento();
    globalState: vscode.Memento = new MockMemento();
    extensionPath: string = '';
    extensionUri: vscode.Uri = vscode.Uri.file('');
    environmentVariableCollection: vscode.EnvironmentVariableCollection = {} as any;
    asAbsolutePath(relativePath: string): string { return relativePath; }
    storageUri: vscode.Uri | undefined = undefined;
    storagePath: string | undefined = undefined;
    globalStorageUri: vscode.Uri = vscode.Uri.file('');
    globalStoragePath: string = '';
    logUri: vscode.Uri = vscode.Uri.file('');
    logPath: string = '';
    extensionMode: vscode.ExtensionMode = vscode.ExtensionMode.Test;
    extension: vscode.Extension<any> = {} as any;
    secrets: vscode.SecretStorage = {} as any;
}

class MockMemento implements vscode.Memento {
    private storage = new Map<string, any>();
    
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | undefined {
        return this.storage.has(key) ? this.storage.get(key) : defaultValue;
    }
    
    async update(key: string, value: any): Promise<void> {
        if (value === undefined) {
            this.storage.delete(key);
        } else {
            this.storage.set(key, value);
        }
    }
    
    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }
    
    setKeysForSync(keys: readonly string[]): void {
        // Mock implementation - no-op for testing
    }
}

suite('StateManager Test Suite', () => {
    let stateManager: StateManager;
    let mockContext: MockExtensionContext;

    setup(() => {
        mockContext = new MockExtensionContext();
        stateManager = new StateManager(mockContext);
    });

    test('Should save and restore idle state', async () => {
        const timerContext: TimerContext = {
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        await stateManager.saveState(timerContext);
        const restoredState = await stateManager.restoreState();

        assert.ok(restoredState);
        assert.strictEqual(restoredState.currentState, TimerState.IDLE);
        assert.strictEqual(restoredState.remainingTime, 0);
        assert.strictEqual(restoredState.sessionDuration, 25);
        assert.strictEqual(restoredState.restDuration, 5);
    });

    test('Should save and restore active work session', async () => {
        const timerContext: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500, // 25 minutes
            sessionDuration: 25,
            restDuration: 5,
            sessionStartTime: new Date()
        };

        await stateManager.saveState(timerContext);
        const restoredState = await stateManager.restoreState();

        assert.ok(restoredState);
        assert.strictEqual(restoredState.currentState, TimerState.WORK_SESSION);
        // Remaining time should be slightly less due to time passage, but close to original
        assert.ok(restoredState.remainingTime <= 1500);
        assert.ok(restoredState.remainingTime >= 1495); // Allow for small time difference
        assert.strictEqual(restoredState.sessionDuration, 25);
        assert.strictEqual(restoredState.restDuration, 5);
    });

    test('Should save and restore paused state', async () => {
        const timerContext: TimerContext = {
            currentState: TimerState.PAUSED,
            remainingTime: 900, // 15 minutes
            sessionDuration: 25,
            restDuration: 5,
            pausedAt: new Date()
        };

        await stateManager.saveState(timerContext);
        const restoredState = await stateManager.restoreState();

        assert.ok(restoredState);
        assert.strictEqual(restoredState.currentState, TimerState.PAUSED);
        assert.strictEqual(restoredState.remainingTime, 900); // Should be exact for paused state
        assert.strictEqual(restoredState.sessionDuration, 25);
        assert.strictEqual(restoredState.restDuration, 5);
    });

    test('Should handle expired work session', async () => {
        // Create a state that would have expired
        const expiredTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const persistedState: PersistedState = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500, // 25 minutes
            sessionStartTime: expiredTime,
            lastActiveTime: expiredTime,
            sessionCount: 1,
            totalWorkTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        // Manually set the expired state
        await mockContext.globalState.update('workSessionManager.timerState', persistedState);
        
        const restoredState = await stateManager.restoreState();

        assert.ok(restoredState);
        // Should transition to idle since both work and rest would have expired
        assert.strictEqual(restoredState.currentState, TimerState.IDLE);
        assert.strictEqual(restoredState.remainingTime, 0);
    });

    test('Should handle partially expired session (work done, rest active)', async () => {
        // Create a state where work session expired but rest period is still active
        const expiredTime = new Date(Date.now() - 27 * 60 * 1000); // 27 minutes ago
        const persistedState: PersistedState = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500, // 25 minutes
            sessionStartTime: expiredTime,
            lastActiveTime: expiredTime,
            sessionCount: 1,
            totalWorkTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        await mockContext.globalState.update('workSessionManager.timerState', persistedState);
        
        const restoredState = await stateManager.restoreState();

        assert.ok(restoredState);
        assert.strictEqual(restoredState.currentState, TimerState.REST_PERIOD);
        // Should have about 3 minutes left in rest (5 - 2 minutes that passed after work ended)
        assert.ok(restoredState.remainingTime > 0);
        assert.ok(restoredState.remainingTime <= 5 * 60);
    });

    test('Should return null for no saved state', async () => {
        const restoredState = await stateManager.restoreState();
        assert.strictEqual(restoredState, null);
    });

    test('Should handle corrupted state gracefully', async () => {
        // Set invalid state
        await mockContext.globalState.update('workSessionManager.timerState', { invalid: 'data' });
        
        const restoredState = await stateManager.restoreState();
        assert.strictEqual(restoredState, null);
        
        // State should be cleared
        const clearedState = mockContext.globalState.get('workSessionManager.timerState');
        assert.strictEqual(clearedState, undefined);
    });

    test('Should save and retrieve statistics', async () => {
        const timerContext: TimerContext = {
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        await stateManager.saveState(timerContext, 5, 7200); // 5 sessions, 2 hours total
        
        const stats = stateManager.getStatistics();
        assert.strictEqual(stats.sessionCount, 5);
        assert.strictEqual(stats.totalWorkTime, 7200);
    });

    test('Should update statistics', async () => {
        const timerContext: TimerContext = {
            currentState: TimerState.IDLE,
            remainingTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        await stateManager.saveState(timerContext, 1, 1500);
        await stateManager.updateStatistics(3, 4500);
        
        const stats = stateManager.getStatistics();
        assert.strictEqual(stats.sessionCount, 3);
        assert.strictEqual(stats.totalWorkTime, 4500);
    });

    test('Should clear state', async () => {
        const timerContext: TimerContext = {
            currentState: TimerState.WORK_SESSION,
            remainingTime: 1500,
            sessionDuration: 25,
            restDuration: 5
        };

        await stateManager.saveState(timerContext);
        await stateManager.clearState();
        
        const restoredState = await stateManager.restoreState();
        assert.strictEqual(restoredState, null);
    });

    test('Should validate state with invalid timer state enum', async () => {
        const invalidState = {
            currentState: 'invalid_state',
            remainingTime: 1500,
            lastActiveTime: new Date(),
            sessionCount: 0,
            totalWorkTime: 0,
            sessionDuration: 25,
            restDuration: 5
        };

        await mockContext.globalState.update('workSessionManager.timerState', invalidState);
        
        const restoredState = await stateManager.restoreState();
        assert.strictEqual(restoredState, null);
    });

    test('Should validate state with invalid duration values', async () => {
        const invalidState = {
            currentState: TimerState.IDLE,
            remainingTime: 1500,
            lastActiveTime: new Date(),
            sessionCount: 0,
            totalWorkTime: 0,
            sessionDuration: 150, // Invalid: > 120
            restDuration: 5
        };

        await mockContext.globalState.update('workSessionManager.timerState', invalidState);
        
        const restoredState = await stateManager.restoreState();
        assert.strictEqual(restoredState, null);
    });
});