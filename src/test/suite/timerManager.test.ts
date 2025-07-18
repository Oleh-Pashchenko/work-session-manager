import * as assert from 'assert';
import { TimerManager } from '../../timerManager';
import { TimerState, TimerEventData } from '../../types';

suite('TimerManager Test Suite', () => {
    let timerManager: TimerManager;

    setup(() => {
        timerManager = new TimerManager(25, 5); // 25 min work, 5 min rest
    });

    teardown(() => {
        timerManager.dispose();
    });

    test('Initial state should be IDLE', () => {
        const state = timerManager.getCurrentState();
        assert.strictEqual(state.currentState, TimerState.IDLE);
        assert.strictEqual(state.remainingTime, 0);
        assert.strictEqual(state.sessionDuration, 25);
        assert.strictEqual(state.restDuration, 5);
    });

    test('Starting work session should set correct state', () => {
        timerManager.startSession();
        const state = timerManager.getCurrentState();
        
        assert.strictEqual(state.currentState, TimerState.WORK_SESSION);
        assert.strictEqual(state.remainingTime, 25 * 60); // 25 minutes in seconds
        assert.ok(state.sessionStartTime);
        assert.strictEqual(timerManager.isRunning(), true);
        assert.strictEqual(timerManager.isPaused(), false);
    });

    test('Starting rest period should set correct state', () => {
        timerManager.startRest();
        const state = timerManager.getCurrentState();
        
        assert.strictEqual(state.currentState, TimerState.REST_PERIOD);
        assert.strictEqual(state.remainingTime, 5 * 60); // 5 minutes in seconds
        assert.ok(state.sessionStartTime);
        assert.strictEqual(timerManager.isRunning(), true);
        assert.strictEqual(timerManager.isPaused(), false);
    });

    test('Pausing work session should set PAUSED state', () => {
        timerManager.startSession();
        timerManager.pause();
        const state = timerManager.getCurrentState();
        
        assert.strictEqual(state.currentState, TimerState.PAUSED);
        assert.ok(state.pausedAt);
        assert.strictEqual(timerManager.isRunning(), false);
        assert.strictEqual(timerManager.isPaused(), true);
    });

    test('Resuming paused session should restore previous state', () => {
        timerManager.startSession();
        const initialTime = timerManager.getCurrentState().remainingTime;
        
        timerManager.pause();
        assert.strictEqual(timerManager.getCurrentState().currentState, TimerState.PAUSED);
        
        timerManager.resume();
        const resumedState = timerManager.getCurrentState();
        
        assert.strictEqual(resumedState.currentState, TimerState.WORK_SESSION);
        assert.strictEqual(resumedState.remainingTime, initialTime);
        assert.strictEqual(timerManager.isRunning(), true);
        assert.strictEqual(timerManager.isPaused(), false);
    });

    test('Reset should return to IDLE state', () => {
        timerManager.startSession();
        timerManager.reset();
        const state = timerManager.getCurrentState();
        
        assert.strictEqual(state.currentState, TimerState.IDLE);
        assert.strictEqual(state.remainingTime, 0);
        assert.strictEqual(state.sessionStartTime, undefined);
        assert.strictEqual(state.pausedAt, undefined);
        assert.strictEqual(timerManager.isRunning(), false);
        assert.strictEqual(timerManager.isPaused(), false);
    });

    test('Update durations should change session and rest durations', () => {
        timerManager.updateDurations(30, 10);
        const state = timerManager.getCurrentState();
        
        assert.strictEqual(state.sessionDuration, 30);
        assert.strictEqual(state.restDuration, 10);
    });

    test('Format time should return correct MM:SS format', () => {
        assert.strictEqual(timerManager.formatTime(0), '00:00');
        assert.strictEqual(timerManager.formatTime(59), '00:59');
        assert.strictEqual(timerManager.formatTime(60), '01:00');
        assert.strictEqual(timerManager.formatTime(125), '02:05');
        assert.strictEqual(timerManager.formatTime(3661), '61:01');
    });

    test('State change events should be emitted', (done) => {
        let eventCount = 0;
        
        timerManager.on('stateChange', (eventData: TimerEventData) => {
            eventCount++;
            
            if (eventCount === 1) {
                // First event: starting work session
                assert.strictEqual(eventData.state, TimerState.WORK_SESSION);
                assert.strictEqual(eventData.remainingTime, 25 * 60);
                assert.strictEqual(eventData.isTransition, false);
                
                // Pause the timer
                timerManager.pause();
            } else if (eventCount === 2) {
                // Second event: pausing
                assert.strictEqual(eventData.state, TimerState.PAUSED);
                assert.strictEqual(eventData.isTransition, false);
                done();
            }
        });
        
        timerManager.startSession();
    });

    test('Timer completion should emit transition event', function(done) {
        this.timeout(5000); // Increase timeout for this test
        
        // Create a timer with very short duration for testing
        const shortTimer = new TimerManager(1/60, 1/60); // 1 second each
        let completionEventReceived = false;
        
        shortTimer.on('timerComplete', (eventData: TimerEventData) => {
            completionEventReceived = true;
            assert.strictEqual(eventData.isTransition, true);
            assert.strictEqual(eventData.state, TimerState.WORK_SESSION);
        });
        
        shortTimer.on('stateChange', (eventData: TimerEventData) => {
            if (eventData.state === TimerState.IDLE && completionEventReceived) {
                shortTimer.dispose();
                done();
            }
        });
        
        shortTimer.startSession();
    });

    test('Cannot pause when timer is idle', () => {
        const initialState = timerManager.getCurrentState();
        timerManager.pause();
        const afterPauseState = timerManager.getCurrentState();
        
        assert.deepStrictEqual(initialState, afterPauseState);
        assert.strictEqual(afterPauseState.currentState, TimerState.IDLE);
    });

    test('Cannot resume when timer is not paused', () => {
        timerManager.startSession();
        const runningState = timerManager.getCurrentState();
        
        timerManager.resume(); // Should have no effect
        const afterResumeState = timerManager.getCurrentState();
        
        assert.strictEqual(runningState.currentState, afterResumeState.currentState);
        assert.strictEqual(afterResumeState.currentState, TimerState.WORK_SESSION);
    });
});