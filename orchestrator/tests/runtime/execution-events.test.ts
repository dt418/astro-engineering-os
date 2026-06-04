import { describe, it, expect, vi } from 'vitest';
import { ExecutionEventEmitter, type ExecutionEvent, type ExecutionEventType } from '../../src/runtime/execution-events.js';

describe('ExecutionEventEmitter', () => {
  describe('on/off', () => {
    it('should register and call listener for event', () => {
      const emitter = new ExecutionEventEmitter();
      const listener = vi.fn();
      emitter.on('execution:started', listener);
      emitter.emit({ type: 'execution:started', requestId: '123', timestamp: new Date(), data: {} });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const emitter = new ExecutionEventEmitter();
      const listener = vi.fn();
      const unsubscribe = emitter.on('execution:started', listener);
      unsubscribe();
      emitter.emit({ type: 'execution:started', requestId: '123', timestamp: new Date(), data: {} });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should unsubscribe with off()', () => {
      const emitter = new ExecutionEventEmitter();
      const listener = vi.fn();
      emitter.on('execution:started', listener);
      emitter.off('execution:started', listener);
      emitter.emit({ type: 'execution:started', requestId: '123', timestamp: new Date(), data: {} });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const emitter = new ExecutionEventEmitter();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.on('execution:started', listener1);
      emitter.on('execution:started', listener2);
      emitter.emit({ type: 'execution:started', requestId: '123', timestamp: new Date(), data: {} });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners', () => {
      const emitter = new ExecutionEventEmitter();
      const listener = vi.fn();
      emitter.on('execution:started', listener);
      emitter.on('task:completed', listener);
      emitter.removeAllListeners();
      emitter.emit({ type: 'execution:started', requestId: '123', timestamp: new Date(), data: {} });
      emitter.emit({ type: 'task:completed', requestId: '123', timestamp: new Date(), data: {} });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('event types', () => {
    it('should emit all event types', () => {
      const emitter = new ExecutionEventEmitter();
      const eventTypes: ExecutionEventType[] = [
        'execution:started',
        'execution:completed',
        'execution:failed',
        'execution:cancelled',
        'task:started',
        'task:completed',
        'task:failed',
        'task:cancelled',
      ];

      for (const type of eventTypes) {
        const listener = vi.fn();
        emitter.on(type, listener);
        emitter.emit({ type, requestId: '123', timestamp: new Date(), data: {} });
        expect(listener).toHaveBeenCalledTimes(1);
      }
    });
  });
});
