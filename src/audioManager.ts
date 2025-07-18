import * as vscode from 'vscode';
import * as os from 'os';
import { exec } from 'child_process';

/**
 * Manages cross-platform audio notifications for session transitions
 * Provides graceful fallback mechanisms for different operating systems
 */
export class AudioManager {
    private isAudioEnabled: boolean = true;
    private audioCapabilities: AudioCapabilities;

    constructor(isEnabled: boolean = true) {
        this.isAudioEnabled = isEnabled;
        this.audioCapabilities = this.detectAudioCapabilities();
    }

    /**
     * Plays notification sound when a work session ends
     */
    public async playSessionEndSound(): Promise<void> {
        if (!this.isAudioEnabled) {
            return;
        }

        try {
            await this.playNotificationSound('session_end');
        } catch (error) {
            console.warn('Work Session Manager: Failed to play session end sound:', error);
            // Graceful fallback - could show visual notification instead
        }
    }

    /**
     * Plays notification sound when a rest period ends
     */
    public async playRestEndSound(): Promise<void> {
        if (!this.isAudioEnabled) {
            return;
        }

        try {
            await this.playNotificationSound('rest_end');
        } catch (error) {
            console.warn('Work Session Manager: Failed to play rest end sound:', error);
            // Graceful fallback - could show visual notification instead
        }
    }

    /**
     * Checks if audio is supported on the current platform
     */
    public isAudioSupported(): boolean {
        return this.audioCapabilities.hasAudioSupport;
    }

    /**
     * Enables or disables audio notifications
     */
    public setAudioEnabled(enabled: boolean): void {
        this.isAudioEnabled = enabled;
    }

    /**
     * Gets current audio enabled state
     */
    public getAudioEnabled(): boolean {
        return this.isAudioEnabled;
    }

    /**
     * Gets audio capabilities information
     */
    public getAudioCapabilities(): AudioCapabilities {
        return { ...this.audioCapabilities };
    }

    /**
     * Plays a notification sound based on the platform
     */
    private async playNotificationSound(soundType: 'session_end' | 'rest_end'): Promise<void> {
        const platform = os.platform();

        switch (platform) {
            case 'darwin': // macOS
                await this.playMacOSSound(soundType);
                break;
            case 'win32': // Windows
                await this.playWindowsSound(soundType);
                break;
            case 'linux': // Linux
                await this.playLinuxSound(soundType);
                break;
            default:
                // Fallback for other platforms
                await this.playFallbackSound();
                break;
        }
    }

    /**
     * Plays sound on macOS using the 'afplay' command or system sounds
     */
    private async playMacOSSound(soundType: 'session_end' | 'rest_end'): Promise<void> {
        return new Promise((resolve, reject) => {
            // Use system sounds that are available on macOS
            const soundName = soundType === 'session_end' ? 'Glass' : 'Ping';
            
            exec(`afplay /System/Library/Sounds/${soundName}.aiff`, (error) => {
                if (error) {
                    // Fallback to system beep
                    exec('osascript -e "beep"', (fallbackError) => {
                        if (fallbackError) {
                            reject(fallbackError);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Plays sound on Windows using PowerShell or system beep
     */
    private async playWindowsSound(soundType: 'session_end' | 'rest_end'): Promise<void> {
        return new Promise((resolve, reject) => {
            // Try to use Windows system sounds
            const frequency = soundType === 'session_end' ? 800 : 1000;
            const duration = 200;
            
            // Use PowerShell to play a beep
            const command = `powershell -c "[console]::beep(${frequency},${duration})"`;
            
            exec(command, (error) => {
                if (error) {
                    // Fallback to simple console beep
                    exec('echo \u0007', (fallbackError) => {
                        if (fallbackError) {
                            reject(fallbackError);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Plays sound on Linux using various available sound systems
     */
    private async playLinuxSound(soundType: 'session_end' | 'rest_end'): Promise<void> {
        return new Promise((resolve, reject) => {
            // Try different Linux audio systems in order of preference
            const commands = [
                'paplay /usr/share/sounds/alsa/Front_Left.wav', // PulseAudio
                'aplay /usr/share/sounds/alsa/Front_Left.wav',  // ALSA
                'speaker-test -t sine -f 1000 -l 1',           // Speaker test
                'echo -e "\\a"'                                // Terminal bell
            ];

            this.tryCommands(commands, 0, resolve, reject);
        });
    }

    /**
     * Tries multiple commands in sequence until one succeeds
     */
    private tryCommands(
        commands: string[], 
        index: number, 
        resolve: () => void, 
        reject: (error: any) => void
    ): void {
        if (index >= commands.length) {
            reject(new Error('No audio command succeeded'));
            return;
        }

        exec(commands[index], (error) => {
            if (error) {
                // Try next command
                this.tryCommands(commands, index + 1, resolve, reject);
            } else {
                resolve();
            }
        });
    }

    /**
     * Fallback sound method for unsupported platforms
     */
    private async playFallbackSound(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Try basic terminal bell
            exec('echo -e "\\a"', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Detects audio capabilities of the current platform
     */
    private detectAudioCapabilities(): AudioCapabilities {
        const platform = os.platform();
        
        const capabilities: AudioCapabilities = {
            hasAudioSupport: true,
            platform: platform,
            supportedFormats: [],
            fallbackAvailable: true
        };

        switch (platform) {
            case 'darwin':
                capabilities.supportedFormats = ['aiff', 'wav', 'mp3'];
                capabilities.audioSystem = 'CoreAudio';
                break;
            case 'win32':
                capabilities.supportedFormats = ['wav', 'mp3'];
                capabilities.audioSystem = 'DirectSound';
                break;
            case 'linux':
                capabilities.supportedFormats = ['wav', 'ogg'];
                capabilities.audioSystem = 'ALSA/PulseAudio';
                break;
            default:
                capabilities.hasAudioSupport = false;
                capabilities.audioSystem = 'Unknown';
                break;
        }

        return capabilities;
    }

    /**
     * Tests audio functionality
     */
    public async testAudio(): Promise<boolean> {
        if (!this.isAudioEnabled || !this.audioCapabilities.hasAudioSupport) {
            return false;
        }

        try {
            await this.playNotificationSound('session_end');
            return true;
        } catch (error) {
            console.warn('Work Session Manager: Audio test failed:', error);
            return false;
        }
    }

    /**
     * Gets a user-friendly description of audio capabilities
     */
    public getAudioDescription(): string {
        if (!this.audioCapabilities.hasAudioSupport) {
            return 'Audio notifications are not supported on this platform';
        }

        if (!this.isAudioEnabled) {
            return 'Audio notifications are disabled';
        }

        return `Audio notifications are enabled (${this.audioCapabilities.audioSystem})`;
    }

    /**
     * Cleanup method
     */
    public dispose(): void {
        // No cleanup needed for this implementation
    }
}

/**
 * Interface describing audio capabilities of the current platform
 */
export interface AudioCapabilities {
    hasAudioSupport: boolean;
    platform: string;
    supportedFormats: string[];
    audioSystem?: string;
    fallbackAvailable: boolean;
}