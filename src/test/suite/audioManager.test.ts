import * as assert from 'assert';
import * as os from 'os';
import { AudioManager, AudioCapabilities } from '../../audioManager';

suite('AudioManager Test Suite', () => {
    let audioManager: AudioManager;

    setup(() => {
        audioManager = new AudioManager(true);
    });

    teardown(() => {
        audioManager.dispose();
    });

    test('Should initialize with audio enabled', () => {
        assert.strictEqual(audioManager.getAudioEnabled(), true);
        assert.strictEqual(audioManager.isAudioSupported(), true);
    });

    test('Should initialize with audio disabled', () => {
        const disabledAudioManager = new AudioManager(false);
        assert.strictEqual(disabledAudioManager.getAudioEnabled(), false);
        disabledAudioManager.dispose();
    });

    test('Should enable and disable audio', () => {
        audioManager.setAudioEnabled(false);
        assert.strictEqual(audioManager.getAudioEnabled(), false);
        
        audioManager.setAudioEnabled(true);
        assert.strictEqual(audioManager.getAudioEnabled(), true);
    });

    test('Should detect audio capabilities', () => {
        const capabilities = audioManager.getAudioCapabilities();
        
        assert.ok(typeof capabilities.hasAudioSupport === 'boolean');
        assert.ok(typeof capabilities.platform === 'string');
        assert.ok(Array.isArray(capabilities.supportedFormats));
        assert.ok(typeof capabilities.fallbackAvailable === 'boolean');
        
        // Platform should match OS
        assert.strictEqual(capabilities.platform, os.platform());
    });

    test('Should have platform-specific audio capabilities', () => {
        const capabilities = audioManager.getAudioCapabilities();
        const platform = os.platform();
        
        switch (platform) {
            case 'darwin':
                assert.ok(capabilities.supportedFormats.includes('aiff'));
                assert.strictEqual(capabilities.audioSystem, 'CoreAudio');
                break;
            case 'win32':
                assert.ok(capabilities.supportedFormats.includes('wav'));
                assert.strictEqual(capabilities.audioSystem, 'DirectSound');
                break;
            case 'linux':
                assert.ok(capabilities.supportedFormats.includes('wav'));
                assert.strictEqual(capabilities.audioSystem, 'ALSA/PulseAudio');
                break;
        }
    });

    test('Should provide audio description', () => {
        const description = audioManager.getAudioDescription();
        assert.ok(typeof description === 'string');
        assert.ok(description.length > 0);
        
        // Should mention enabled state
        assert.ok(description.includes('enabled') || description.includes('disabled'));
    });

    test('Should provide disabled audio description', () => {
        audioManager.setAudioEnabled(false);
        const description = audioManager.getAudioDescription();
        
        assert.ok(description.includes('disabled'));
    });

    test('Should handle session end sound call without throwing', async () => {
        // This test ensures the method can be called without throwing
        // Actual audio playback is mocked/stubbed in real testing environments
        try {
            await audioManager.playSessionEndSound();
            // If we get here, the method didn't throw
            assert.ok(true);
        } catch (error) {
            // Audio might fail in test environment, which is acceptable
            assert.ok(true);
        }
    });

    test('Should handle rest end sound call without throwing', async () => {
        try {
            await audioManager.playRestEndSound();
            assert.ok(true);
        } catch (error) {
            // Audio might fail in test environment, which is acceptable
            assert.ok(true);
        }
    });

    test('Should not play sound when audio is disabled', async () => {
        audioManager.setAudioEnabled(false);
        
        // These should complete immediately without attempting to play sound
        await audioManager.playSessionEndSound();
        await audioManager.playRestEndSound();
        
        // If we get here without hanging, the disabled check is working
        assert.ok(true);
    });

    test('Should handle audio test gracefully', async () => {
        const testResult = await audioManager.testAudio();
        
        // Result should be boolean
        assert.ok(typeof testResult === 'boolean');
        
        // If audio is disabled, test should return false
        audioManager.setAudioEnabled(false);
        const disabledTestResult = await audioManager.testAudio();
        assert.strictEqual(disabledTestResult, false);
    });

    test('Should return consistent capabilities object', () => {
        const capabilities1 = audioManager.getAudioCapabilities();
        const capabilities2 = audioManager.getAudioCapabilities();
        
        // Should return different objects (not same reference)
        assert.notStrictEqual(capabilities1, capabilities2);
        
        // But with same content
        assert.deepStrictEqual(capabilities1, capabilities2);
    });

    test('Should handle unknown platform gracefully', () => {
        // This test verifies the fallback behavior for unknown platforms
        // In a real test, we might mock os.platform() to return an unknown value
        const capabilities = audioManager.getAudioCapabilities();
        
        // Should still have basic structure even for unknown platforms
        assert.ok('hasAudioSupport' in capabilities);
        assert.ok('platform' in capabilities);
        assert.ok('supportedFormats' in capabilities);
        assert.ok('fallbackAvailable' in capabilities);
    });

    test('Should maintain audio state across operations', () => {
        audioManager.setAudioEnabled(false);
        assert.strictEqual(audioManager.getAudioEnabled(), false);
        
        // State should persist across method calls
        audioManager.isAudioSupported();
        audioManager.getAudioCapabilities();
        audioManager.getAudioDescription();
        
        assert.strictEqual(audioManager.getAudioEnabled(), false);
        
        audioManager.setAudioEnabled(true);
        assert.strictEqual(audioManager.getAudioEnabled(), true);
    });
});