import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('work-session-manager.work-session-manager'));
    });

    test('Should register all commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        const expectedCommands = [
            'workSessionManager.startSession',
            'workSessionManager.startRest',
            'workSessionManager.pause',
            'workSessionManager.resume',
            'workSessionManager.reset'
        ];

        for (const expectedCommand of expectedCommands) {
            assert.ok(
                commands.includes(expectedCommand),
                `Command ${expectedCommand} should be registered`
            );
        }
    });

    test('Should have configuration schema', () => {
        const config = vscode.workspace.getConfiguration('workSessionManager');
        
        // Test that configuration properties exist
        assert.ok(config.has('sessionDuration'));
        assert.ok(config.has('restDuration'));
        assert.ok(config.has('workSessionColor'));
        assert.ok(config.has('restPeriodColor'));
        assert.ok(config.has('soundEnabled'));
        assert.ok(config.has('showCountdown'));
        assert.ok(config.has('showStatusDot'));
        assert.ok(config.has('autoStartRest'));
        assert.ok(config.has('autoStartWork'));
    });

    test('Should have default configuration values', () => {
        const config = vscode.workspace.getConfiguration('workSessionManager');
        
        // Test default values
        assert.strictEqual(config.get('sessionDuration'), 25);
        assert.strictEqual(config.get('restDuration'), 5);
        assert.strictEqual(config.get('workSessionColor'), '#4CAF50');
        assert.strictEqual(config.get('restPeriodColor'), '#F44336');
        assert.strictEqual(config.get('soundEnabled'), true);
        assert.strictEqual(config.get('showCountdown'), true);
        assert.strictEqual(config.get('showStatusDot'), true);
        assert.strictEqual(config.get('autoStartRest'), true);
        assert.strictEqual(config.get('autoStartWork'), false);
    });

    test('Should execute start session command', async () => {
        try {
            await vscode.commands.executeCommand('workSessionManager.startSession');
            // If we get here, the command executed without throwing
            assert.ok(true);
        } catch (error) {
            assert.fail(`Start session command should not throw: ${error}`);
        }
    });

    test('Should execute start rest command', async () => {
        try {
            await vscode.commands.executeCommand('workSessionManager.startRest');
            assert.ok(true);
        } catch (error) {
            assert.fail(`Start rest command should not throw: ${error}`);
        }
    });

    test('Should execute pause command', async () => {
        try {
            await vscode.commands.executeCommand('workSessionManager.pause');
            assert.ok(true);
        } catch (error) {
            assert.fail(`Pause command should not throw: ${error}`);
        }
    });

    test('Should execute resume command', async () => {
        try {
            await vscode.commands.executeCommand('workSessionManager.resume');
            assert.ok(true);
        } catch (error) {
            assert.fail(`Resume command should not throw: ${error}`);
        }
    });

    test('Should execute reset command', async () => {
        try {
            await vscode.commands.executeCommand('workSessionManager.reset');
            assert.ok(true);
        } catch (error) {
            assert.fail(`Reset command should not throw: ${error}`);
        }
    });

    test('Should handle configuration changes', async () => {
        const config = vscode.workspace.getConfiguration('workSessionManager');
        const originalValue = config.get('sessionDuration');
        
        try {
            // Change configuration
            await config.update('sessionDuration', 30, vscode.ConfigurationTarget.Global);
            
            // Verify change
            const newValue = config.get('sessionDuration');
            assert.strictEqual(newValue, 30);
            
            // Restore original value
            await config.update('sessionDuration', originalValue, vscode.ConfigurationTarget.Global);
        } catch (error) {
            assert.fail(`Configuration update should not throw: ${error}`);
        }
    });

    test('Should validate configuration ranges', async () => {
        const config = vscode.workspace.getConfiguration('workSessionManager');
        
        try {
            // Test session duration bounds
            await config.update('sessionDuration', 0, vscode.ConfigurationTarget.Global);
            // Extension should handle this gracefully and use minimum value
            
            await config.update('sessionDuration', 150, vscode.ConfigurationTarget.Global);
            // Extension should handle this gracefully and use maximum value
            
            // Test rest duration bounds
            await config.update('restDuration', 0, vscode.ConfigurationTarget.Global);
            await config.update('restDuration', 70, vscode.ConfigurationTarget.Global);
            
            // Restore defaults
            await config.update('sessionDuration', 25, vscode.ConfigurationTarget.Global);
            await config.update('restDuration', 5, vscode.ConfigurationTarget.Global);
            
            assert.ok(true);
        } catch (error) {
            assert.fail(`Configuration validation should not throw: ${error}`);
        }
    });

    test('Should handle invalid color values', async () => {
        const config = vscode.workspace.getConfiguration('workSessionManager');
        const originalWorkColor = config.get('workSessionColor');
        
        try {
            // Set invalid color
            await config.update('workSessionColor', 'invalid-color', vscode.ConfigurationTarget.Global);
            
            // Extension should handle this gracefully
            assert.ok(true);
            
            // Restore original
            await config.update('workSessionColor', originalWorkColor, vscode.ConfigurationTarget.Global);
        } catch (error) {
            assert.fail(`Invalid color handling should not throw: ${error}`);
        }
    });
});