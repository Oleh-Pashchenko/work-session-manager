import * as vscode from 'vscode';
import { ExtensionConfig, ThemeColors } from './types';

/**
 * Manages VS Code configuration settings for the Work Session Manager extension
 * Handles validation, default values, and configuration change notifications
 */
export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'workSessionManager';
    private readonly defaultConfig: ExtensionConfig = {
        sessionDuration: 25,
        restDuration: 5,
        workSessionColor: '#4CAF50',
        restPeriodColor: '#64B5F6',
        soundEnabled: true,
        showCountdown: true,
        showStatusDot: true,
        autoStartRest: true,
        autoStartWork: false,
        showPausePlayButton: true,
        autoStartOnOpen: false
    };

    /**
     * Gets the current configuration with validation and defaults
     */
    public getConfiguration(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        
        return {
            sessionDuration: this.validateSessionDurationInternal(config.get<number>('sessionDuration')),
            restDuration: this.validateRestDurationInternal(config.get<number>('restDuration')),
            workSessionColor: this.validateColorInternal(config.get<string>('workSessionColor')),
            restPeriodColor: this.validateColorInternal(config.get<string>('restPeriodColor')),
            soundEnabled: config.get<boolean>('soundEnabled') ?? this.defaultConfig.soundEnabled,
            showCountdown: config.get<boolean>('showCountdown') ?? this.defaultConfig.showCountdown,
            showStatusDot: config.get<boolean>('showStatusDot') ?? this.defaultConfig.showStatusDot,
            autoStartRest: config.get<boolean>('autoStartRest') ?? this.defaultConfig.autoStartRest,
            autoStartWork: config.get<boolean>('autoStartWork') ?? this.defaultConfig.autoStartWork,
            showPausePlayButton: config.get<boolean>('showPausePlayButton') ?? this.defaultConfig.showPausePlayButton,
            autoStartOnOpen: config.get<boolean>('autoStartOnOpen') ?? this.defaultConfig.autoStartOnOpen
        };
    }

    /**
     * Gets a specific configuration value with validation
     */
    public getConfigValue<K extends keyof ExtensionConfig>(key: K): ExtensionConfig[K] {
        const fullConfig = this.getConfiguration();
        return fullConfig[key];
    }

    /**
     * Updates a configuration value
     */
    public async updateConfiguration<K extends keyof ExtensionConfig>(
        key: K, 
        value: ExtensionConfig[K], 
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        await config.update(key, value, target);
    }

    /**
     * Registers a configuration change listener
     */
    public onConfigurationChanged(callback: (config: ExtensionConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
                callback(this.getConfiguration());
            }
        });
    }

    /**
     * Validates session duration (1-120 minutes) - public method
     */
    public validateSessionDuration(value: number | undefined): boolean {
        if (typeof value !== 'number' || isNaN(value)) {
            return false;
        }
        return value >= 1 && value <= 120;
    }

    /**
     * Validates rest duration (1-60 minutes) - public method
     */
    public validateRestDuration(value: number | undefined): boolean {
        if (typeof value !== 'number' || isNaN(value)) {
            return false;
        }
        return value >= 1 && value <= 60;
    }

    /**
     * Validates color (hex or CSS color name) - public method
     */
    public validateColor(value: string | undefined): boolean {
        if (typeof value !== 'string') {
            return false;
        }
        const trimmedValue = value.trim();
        return this.isValidHexColor(trimmedValue) || this.isValidCSSColorName(trimmedValue);
    }

    /**
     * Validates session duration (1-120 minutes) - private method
     */
    private validateSessionDurationInternal(value: number | undefined): number {
        if (typeof value !== 'number' || isNaN(value)) {
            this.showValidationWarning('sessionDuration', 'must be a number', this.defaultConfig.sessionDuration);
            return this.defaultConfig.sessionDuration;
        }

        if (value < 1) {
            this.showValidationWarning('sessionDuration', 'must be at least 1 minute', this.defaultConfig.sessionDuration);
            return 1;
        }

        if (value > 120) {
            this.showValidationWarning('sessionDuration', 'cannot exceed 120 minutes', this.defaultConfig.sessionDuration);
            return 120;
        }

        return Math.floor(value); // Ensure integer value
    }

    /**
     * Validates rest duration (1-60 minutes) - private method
     */
    private validateRestDurationInternal(value: number | undefined): number {
        if (typeof value !== 'number' || isNaN(value)) {
            this.showValidationWarning('restDuration', 'must be a number', this.defaultConfig.restDuration);
            return this.defaultConfig.restDuration;
        }

        if (value < 1) {
            this.showValidationWarning('restDuration', 'must be at least 1 minute', this.defaultConfig.restDuration);
            return 1;
        }

        if (value > 60) {
            this.showValidationWarning('restDuration', 'cannot exceed 60 minutes', this.defaultConfig.restDuration);
            return 60;
        }

        return Math.floor(value); // Ensure integer value
    }

    /**
     * Validates color values (hex codes or CSS color names) - private method
     */
    private validateColorInternal(value: string | undefined): string {
        if (typeof value !== 'string') {
            return this.defaultConfig.workSessionColor; // Default fallback
        }

        const trimmedValue = value.trim();
        
        // Check for hex color format
        if (this.isValidHexColor(trimmedValue)) {
            return trimmedValue;
        }

        // Check for CSS color names
        if (this.isValidCSSColorName(trimmedValue)) {
            return trimmedValue;
        }

        // Invalid color, show warning and return default
        this.showValidationWarning('color', 'must be a valid hex color (e.g., #FF0000) or CSS color name (e.g., red)', this.defaultConfig.workSessionColor);
        return this.defaultConfig.workSessionColor;
    }

    /**
     * Checks if a string is a valid hex color
     */
    private isValidHexColor(color: string): boolean {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexColorRegex.test(color);
    }

    /**
     * Checks if a string is a valid CSS color name
     */
    private isValidCSSColorName(color: string): boolean {
        // List of common CSS color names
        const cssColors = [
            'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
            'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
            'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
            'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
            'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
            'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
            'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
            'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite',
            'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink',
            'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen',
            'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow',
            'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen',
            'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow',
            'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue',
            'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
            'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose',
            'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
            'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
            'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'red',
            'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen',
            'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey',
            'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise',
            'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen'
        ];

        return cssColors.includes(color.toLowerCase());
    }

    /**
     * Shows a validation warning to the user
     */
    private showValidationWarning(setting: string, message: string, defaultValue: any): void {
        const fullMessage = `Work Session Manager: Invalid value for '${setting}' - ${message}. Using default value: ${defaultValue}`;
        vscode.window.showWarningMessage(fullMessage);
    }

    /**
     * Resets all configuration to defaults
     */
    public async resetToDefaults(target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        
        for (const [key, value] of Object.entries(this.defaultConfig)) {
            await config.update(key, value, target);
        }
    }

    /**
     * Gets the default configuration
     */
    public getDefaultConfiguration(): ExtensionConfig {
        return { ...this.defaultConfig };
    }

    /**
     * Gets theme colors for work session and rest period
     */
    public getThemeColors(): ThemeColors {
        const config = this.getConfiguration();
        return {
            workSessionColor: config.workSessionColor,
            restPeriodColor: config.restPeriodColor
        };
    }

    /**
     * Updates theme colors
     */
    public async updateThemeColors(
        colors: ThemeColors, 
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        await this.updateConfiguration('workSessionColor', colors.workSessionColor, target);
        await this.updateConfiguration('restPeriodColor', colors.restPeriodColor, target);
    }

    /**
     * Converts color to RGB values for theme integration
     */
    public colorToRgb(color: string): { r: number; g: number; b: number } | null {
        // Handle hex colors
        if (this.isValidHexColor(color)) {
            return this.hexToRgb(color);
        }

        // Handle CSS color names - convert to hex first
        if (this.isValidCSSColorName(color)) {
            const hexColor = this.cssColorToHex(color);
            if (hexColor) {
                return this.hexToRgb(hexColor);
            }
        }

        return null;
    }

    /**
     * Converts hex color to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Handle 3-digit hex
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    /**
     * Converts CSS color name to hex (basic implementation for common colors)
     */
    private cssColorToHex(colorName: string): string | null {
        const colorMap: { [key: string]: string } = {
            'red': '#FF0000',
            'green': '#008000',
            'blue': '#0000FF',
            'yellow': '#FFFF00',
            'orange': '#FFA500',
            'purple': '#800080',
            'pink': '#FFC0CB',
            'brown': '#A52A2A',
            'black': '#000000',
            'white': '#FFFFFF',
            'gray': '#808080',
            'grey': '#808080',
            'cyan': '#00FFFF',
            'magenta': '#FF00FF',
            'lime': '#00FF00',
            'maroon': '#800000',
            'navy': '#000080',
            'olive': '#808000',
            'silver': '#C0C0C0',
            'teal': '#008080'
        };

        return colorMap[colorName.toLowerCase()] || null;
    }

    /**
     * Generates a lighter version of a color for hover states
     */
    public lightenColor(color: string, amount: number = 0.2): string {
        const rgb = this.colorToRgb(color);
        if (!rgb) {
            return color; // Return original if conversion fails
        }

        const lighten = (value: number) => Math.min(255, Math.floor(value + (255 - value) * amount));
        
        const newR = lighten(rgb.r);
        const newG = lighten(rgb.g);
        const newB = lighten(rgb.b);

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Generates a darker version of a color for pressed states
     */
    public darkenColor(color: string, amount: number = 0.2): string {
        const rgb = this.colorToRgb(color);
        if (!rgb) {
            return color; // Return original if conversion fails
        }

        const darken = (value: number) => Math.max(0, Math.floor(value * (1 - amount)));
        
        const newR = darken(rgb.r);
        const newG = darken(rgb.g);
        const newB = darken(rgb.b);

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Determines if a color is light or dark (for contrast calculations)
     */
    public isLightColor(color: string): boolean {
        const rgb = this.colorToRgb(color);
        if (!rgb) {
            return true; // Default to light if conversion fails
        }

        // Calculate luminance using standard formula
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5;
    }

    /**
     * Gets appropriate text color (black or white) for a given background color
     */
    public getContrastTextColor(backgroundColor: string): string {
        return this.isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
    }

    /**
     * Validates the entire configuration and returns validation results
     */
    public validateConfiguration(): { isValid: boolean; errors: string[] } {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        const errors: string[] = [];

        // Validate session duration
        const sessionDuration = config.get<number>('sessionDuration');
        if (typeof sessionDuration !== 'number' || sessionDuration < 1 || sessionDuration > 120) {
            errors.push('sessionDuration must be a number between 1 and 120');
        }

        // Validate rest duration
        const restDuration = config.get<number>('restDuration');
        if (typeof restDuration !== 'number' || restDuration < 1 || restDuration > 60) {
            errors.push('restDuration must be a number between 1 and 60');
        }

        // Validate colors
        const workColor = config.get<string>('workSessionColor');
        if (typeof workColor === 'string' && !this.isValidHexColor(workColor) && !this.isValidCSSColorName(workColor)) {
            errors.push('workSessionColor must be a valid hex color or CSS color name');
        }

        const restColor = config.get<string>('restPeriodColor');
        if (typeof restColor === 'string' && !this.isValidHexColor(restColor) && !this.isValidCSSColorName(restColor)) {
            errors.push('restPeriodColor must be a valid hex color or CSS color name');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}