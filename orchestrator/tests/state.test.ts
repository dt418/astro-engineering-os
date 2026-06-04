import { describe, it, expect } from 'vitest';
import { createStateMachine } from '../src/state.js';
import type { TaskNode, TaskId } from '../src/types.js';

const makeNode = (state: TaskNode['state'] = 'pending'): TaskNode => ({
  id: 't1' as TaskId,
  rule: 'rule-1',
  input: { task: 'test' },
  state,
  dependsOn: [],
  attempts: 0,
});

describe('StateMachine', () => {
  it('transitions pending -> ready', () => {
    const sm = createStateMachine();
    const node = makeNode('pending');
    const next = sm.transition(node, 'ready');
    expect(next.state).toBe('ready');
  });

  it('rejects invalid transition pending -> completed', () => {
    const sm = createStateMachine();
    const node = makeNode('pending');
    expect(() => sm.transition(node, 'completed')).toThrow();
  });

  it('allows running -> failed', () => {
    const sm = createStateMachine();
    const node = makeNode('running');
    const next = sm.transition(node, 'failed');
    expect(next.state).toBe('failed');
  });

  it('allows failed -> running (retry)', () => {
    const sm = createStateMachine();
    const node = makeNode('failed');
    const next = sm.transition(node, 'running');
    expect(next.state).toBe('running');
  });

  it('isTerminal returns true for completed/failed', () => {
    const sm = createStateMachine();
    expect(sm.isTerminal('completed')).toBe(true);
    expect(sm.isTerminal('failed')).toBe(true);
    expect(sm.isTerminal('pending')).toBe(false);
  });
});
