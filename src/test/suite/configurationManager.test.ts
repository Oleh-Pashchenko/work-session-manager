import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../configurationManager';
import { ExtensionConfig } from '../../types';

// Mock VS Code workspace configuration
class MockWorkspaceConfiguration implements vscode.WorkspaceConfiguration {
    private config: { [key: string]: any } = {};

    get<T>(section: string): T | undefined;
    get<T>(section: string, defaultValue: T): T;
    get<T>(section: string, defaultValue?: T): T | undefined {
        return this.config[section] !== undefined ? this.config[section] : defaultValue;
    }

    has(section: string): boolean {
        return section in this.config;
    }

    inspect<T>(section: string): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T; } | undefined {
        return undefined;
    }

    async update(section: string, value: any, configurationTarget?: vscode.ConfigurationTarget | boolean): Promise<void> {
        if (value === undefined) {
            delete this.config[section];
        } else {
            this.config[section] = value;
        }
    }

    // Helper method for testing
    setConfig(key: string, value: any): void {
        this.config[key] = value;
    }

    clearConfig(): void {
        this.config = {};
    }
}

suite('ConfigurationManager Test Suite', () => {
    let configManager: ConfigurationManager;
    let mockConfig: MockWorkspaceConfiguration;
    let originalGetConfiguration: typeof vscode.workspace.getConfiguration;

    setup(() => {
        configManager = new ConfigurationManager();
        mockConfig = new MockWorkspaceConfiguration();
        
        // Mock vscode.workspace.getConfiguration
        originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = () => mockConfig;
    });

    teardown(() => {
        // Restore original function
        vscode.workspace.getConfiguration = originalGetConfiguration;
    });

    test('Should return default configuration when no settings are configured', () => {
        const config = configManager.getConfiguration();
        const defaultConfig = configManager.getDefaultConfiguration();
        
        assert.deepStrictEqual(config, defaultConfig);
    });

    test('Should validate and return valid session duration', () => {
        mockConfig.setConfig('sessionDuration', 30);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.sessionDuration, 30);
    });

    test('Should clamp session duration to minimum value', () => {
        mockConfig.setConfig('sessionDuration', 0);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.sessionDuration, 1);
    });

    test('Should clamp session duration to maximum value', () => {
        mockConfig.setConfig('sessionDuration', 150);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.sessionDuration, 120);
    });

    test('Should use default for invalid session duration', () => {
        mockConfig.setConfig('sessionDuration', 'invalid');
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.sessionDuration, 25); // default value
    });

    test('Should validate and return valid rest duration', () => {
        mockConfig.setConfig('restDuration', 10);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.restDuration, 10);
    });

    test('Should clamp rest duration to minimum value', () => {
        mockConfig.setConfig('restDuration', 0);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.restDuration, 1);
    });

    test('Should clamp rest duration to maximum value', () => {
        mockConfig.setConfig('restDuration', 70);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.restDuration, 60);
    });

    test('Should accept valid hex colors', () => {
        mockConfig.setConfig('workSessionColor', '#FF0000');
        mockConfig.setConfig('restPeriodColor', '#00FF00');
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.workSessionColor, '#FF0000');
        assert.strictEqual(config.restPeriodColor, '#00FF00');
    });

    test('Should accept valid 3-digit hex colors', () => {
        mockConfig.setConfig('workSessionColor', '#F00');
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.workSessionColor, '#F00');
    });

    test('Should accept valid CSS color names', () => {
        mockConfig.setConfig('workSessionColor', 'red');
        mockConfig.setConfig('restPeriodColor', 'blue');
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.workSessionColor, 'red');
        assert.strictEqual(config.restPeriodColor, 'blue');
    });

    test('Should reject invalid color formats', () => {
        mockConfig.setConfig('workSessionColor', 'invalid-color');
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.workSessionColor, '#4CAF50'); // default value
    });

    test('Should handle boolean configuration values', () => {
        mockConfig.setConfig('soundEnabled', false);
        mockConfig.setConfig('showCountdown', false);
        mockConfig.setConfig('showStatusDot', true);
        mockConfig.setConfig('autoStartRest', false);
        mockConfig.setConfig('autoStartWork', true);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.soundEnabled, false);
        assert.strictEqual(config.showCountdown, false);
        assert.strictEqual(config.showStatusDot, true);
        assert.strictEqual(config.autoStartRest, false);
        assert.strictEqual(config.autoStartWork, true);
    });

    test('Should get specific configuration values', () => {
        mockConfig.setConfig('sessionDuration', 45);
        
        const sessionDuration = configManager.getConfigValue('sessionDuration');
        assert.strictEqual(sessionDuration, 45);
    });

    test('Should validate entire configuration', () => {
        // Set valid configuration
        mockConfig.setConfig('sessionDuration', 25);
        mockConfig.setConfig('restDuration', 5);
        mockConfig.setConfig('workSessionColor', '#4CAF50');
        mockConfig.setConfig('restPeriodColor', '#F44336');
        
        const validation = configManager.validateConfiguration();
        assert.strictEqual(validation.isValid, true);
        assert.strictEqual(validation.errors.length, 0);
    });

    test('Should detect invalid configuration', () => {
        // Set invalid configuration
        mockConfig.setConfig('sessionDuration', 150); // Too high
        mockConfig.setConfig('restDuration', 0); // Too low
        mockConfig.setConfig('workSessionColor', 'invalid-color');
        
        const validation = configManager.validateConfiguration();
        assert.strictEqual(validation.isValid, false);
        assert.ok(validation.errors.length > 0);
        assert.ok(validation.errors.some(error => error.includes('sessionDuration')));
        assert.ok(validation.errors.some(error => error.includes('restDuration')));
        assert.ok(validation.errors.some(error => error.includes('workSessionColor')));
    });

    test('Should handle decimal values by flooring them', () => {
        mockConfig.setConfig('sessionDuration', 25.7);
        mockConfig.setConfig('restDuration', 5.9);
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.sessionDuration, 25);
        assert.strictEqual(config.restDuration, 5);
    });

    test('Should handle case-insensitive CSS color names', () => {
        mockConfig.setConfig('workSessionColor', 'RED');
        mockConfig.setConfig('restPeriodColor', 'Blue');
        
        const config = configManager.getConfiguration();
        assert.strictEqual(config.workSessionColor, 'RED');
        assert.strictEqual(config.restPeriodColor, 'Blue');
    });

    test('Should handle undefined boolean values with defaults', () => {
        // Don't set any boolean values, should use defaults
        mockConfig.clearConfig();
        
        const config = configManager.getConfiguration();
        const defaults = configManager.getDefaultConfiguration();
        
        assert.strictEqual(config.soundEnabled, defaults.soundEnabled);
        assert.strictEqual(config.showCountdown, defaults.showCountdown);
        assert.strictEqual(config.showStatusDot, defaults.showStatusDot);
        assert.strictEqual(config.autoStartRest, defaults.autoStartRest);
        assert.strictEqual(config.autoStartWork, defaults.autoStartWork);
    });

    test('Should get theme colors', () => {
        mockConfig.setConfig('workSessionColor', '#00FF00');
        mockConfig.setConfig('restPeriodColor', '#FF0000');
        
        const themeColors = configManager.getThemeColors();
        assert.strictEqual(themeColors.workSessionColor, '#00FF00');
        assert.strictEqual(themeColors.restPeriodColor, '#FF0000');
    });

    test('Should convert hex colors to RGB', () => {
        const rgb1 = configManager.colorToRgb('#FF0000');
        assert.deepStrictEqual(rgb1, { r: 255, g: 0, b: 0 });
        
        const rgb2 = configManager.colorToRgb('#00FF00');
        assert.deepStrictEqual(rgb2, { r: 0, g: 255, b: 0 });
        
        const rgb3 = configManager.colorToRgb('#0000FF');
        assert.deepStrictEqual(rgb3, { r: 0, g: 0, b: 255 });
    });

    test('Should convert 3-digit hex colors to RGB', () => {
        const rgb = configManager.colorToRgb('#F00');
        assert.deepStrictEqual(rgb, { r: 255, g: 0, b: 0 });
    });

    test('Should convert CSS color names to RGB', () => {
        const rgb1 = configManager.colorToRgb('red');
        assert.deepStrictEqual(rgb1, { r: 255, g: 0, b: 0 });
        
        const rgb2 = configManager.colorToRgb('green');
        assert.deepStrictEqual(rgb2, { r: 0, g: 128, b: 0 });
        
        const rgb3 = configManager.colorToRgb('blue');
        assert.deepStrictEqual(rgb3, { r: 0, g: 0, b: 255 });
    });

    test('Should return null for invalid colors in RGB conversion', () => {
        const rgb = configManager.colorToRgb('invalid-color');
        assert.strictEqual(rgb, null);
    });

    test('Should lighten colors correctly', () => {
        const lightened = configManager.lightenColor('#808080', 0.5);
        // Should be lighter than original
        const originalRgb = configManager.colorToRgb('#808080');
        const lightenedRgb = configManager.colorToRgb(lightened);
        
        assert.ok(originalRgb && lightenedRgb);
        assert.ok(lightenedRgb.r > originalRgb.r);
        assert.ok(lightenedRgb.g > originalRgb.g);
        assert.ok(lightenedRgb.b > originalRgb.b);
    });

    test('Should darken colors correctly', () => {
        const darkened = configManager.darkenColor('#808080', 0.5);
        // Should be darker than original
        const originalRgb = configManager.colorToRgb('#808080');
        const darkenedRgb = configManager.colorToRgb(darkened);
        
        assert.ok(originalRgb && darkenedRgb);
        assert.ok(darkenedRgb.r < originalRgb.r);
        assert.ok(darkenedRgb.g < originalRgb.g);
        assert.ok(darkenedRgb.b < originalRgb.b);
    });

    test('Should detect light colors correctly', () => {
        assert.strictEqual(configManager.isLightColor('#FFFFFF'), true);
        assert.strictEqual(configManager.isLightColor('#FFFF00'), true);
        assert.strictEqual(configManager.isLightColor('#000000'), false);
        assert.strictEqual(configManager.isLightColor('#800000'), false);
    });

    test('Should provide appropriate contrast text colors', () => {
        assert.strictEqual(configManager.getContrastTextColor('#FFFFFF'), '#000000');
        assert.strictEqual(configManager.getContrastTextColor('#000000'), '#FFFFFF');
        assert.strictEqual(configManager.getContrastTextColor('#FFFF00'), '#000000');
        assert.strictEqual(configManager.getContrastTextColor('#800000'), '#FFFFFF');
    });

    test('Should handle invalid colors gracefully in theme functions', () => {
        const lightened = configManager.lightenColor('invalid-color');
        assert.strictEqual(lightened, 'invalid-color');
        
        const darkened = configManager.darkenColor('invalid-color');
        assert.strictEqual(darkened, 'invalid-color');
        
        const isLight = configManager.isLightColor('invalid-color');
        assert.strictEqual(isLight, true); // Default to light
        
        const contrastColor = configManager.getContrastTextColor('invalid-color');
        assert.strictEqual(contrastColor, '#000000'); // Default to black for light
    });
});