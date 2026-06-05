import { describe, it, expect } from 'vitest';
import { ExecutionStateMachine, type ExecutionState } from '../../src/runtime/execution-state-machine.js';

describe('ExecutionStateMachine', () => {
  describe('initialization', () => {
    it('should start with "planned" state by default', () => {
      const sm = new ExecutionStateMachine();
      expect(sm.state).toBe('planned');
    });

    it('should start with custom initial state', () => {
      const sm = new ExecutionStateMachine('running');
      expect(sm.state).toBe('running');
    });
  });

  describe('canTransition', () => {
    it('should allow planned -> running', () => {
      const sm = new ExecutionStateMachine();
      expect(sm.canTransition('running')).toBe(true);
    });

    it('should allow planned -> cancelled', () => {
      const sm = new ExecutionStateMachine();
      expect(sm.canTransition('cancelled')).toBe(true);
    });

    it('should allow running -> completed', () => {
      const sm = new ExecutionStateMachine('running');
      expect(sm.canTransition('completed')).toBe(true);
    });

    it('should allow running -> failed', () => {
      const sm = new ExecutionStateMachine('running');
      expect(sm.canTransition('failed')).toBe(true);
    });

    it('should allow running -> cancelled', () => {
      const sm = new ExecutionStateMachine('running');
      expect(sm.canTransition('cancelled')).toBe(true);
    });

    it('should NOT allow planned -> completed', () => {
      const sm = new ExecutionStateMachine();
      expect(sm.canTransition('completed')).toBe(false);
    });

    it('should NOT allow completed -> any state', () => {
      const sm = new ExecutionStateMachine('completed');
      expect(sm.canTransition('planned')).toBe(false);
      expect(sm.canTransition('running')).toBe(false);
      expect(sm.canTransition('failed')).toBe(false);
    });

    it('should NOT allow failed -> any state', () => {
      const sm = new ExecutionStateMachine('failed');
      expect(sm.canTransition('planned')).toBe(false);
      expect(sm.canTransition('running')).toBe(false);
    });

    it('should NOT allow cancelled -> any state', () => {
      const sm = new ExecutionStateMachine('cancelled');
      expect(sm.canTransition('planned')).toBe(false);
      expect(sm.canTransition('running')).toBe(false);
    });
  });

  describe('transition', () => {
    it('should transition successfully for valid transitions', () => {
      const sm = new ExecutionStateMachine();
      expect(sm.transition('running')).toBe(true);
      expect(sm.state).toBe('running');
    });

    it('should return false and not change state for invalid transitions', () => {
      const sm = new ExecutionStateMachine();
      expect(sm.transition('completed')).toBe(false);
      expect(sm.state).toBe('planned');
    });

    it('should follow full lifecycle: planned -> running -> completed', () => {
      const sm = new ExecutionStateMachine();
      sm.transition('running');
      expect(sm.transition('completed')).toBe(true);
      expect(sm.state).toBe('completed');
    });
  });

  describe('reset', () => {
    it('should reset to planned state', () => {
      const sm = new ExecutionStateMachine('running');
      sm.reset();
      expect(sm.state).toBe('planned');
    });
  });

  describe('getTransition', () => {
    it('should return transition info', () => {
      const sm = new ExecutionStateMachine();
      const result = sm.getTransition('running');
      expect(result.from).toBe('planned');
      expect(result.to).toBe('running');
      expect(result.allowed).toBe(true);
    });
  });
});
