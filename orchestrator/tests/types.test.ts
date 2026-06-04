import { describe, it, expect } from 'vitest';
import type { TaskId, RoutingRule, TaskNode, TaskState } from '../src/types.js';

describe('types', () => {
  it('TaskId is a branded string', () => {
    const id: TaskId = 'task-1' as TaskId;
    expect(id).toBe('task-1');
  });

  it('RoutingRule has required fields', () => {
    const rule: RoutingRule = {
      id: 'rule-1',
      pattern: 'implement-*',
      agent: 'implementer',
      priority: 10,
    };
    expect(rule.pattern).toBe('implement-*');
  });

  it('TaskNode has initial state pending', () => {
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'rule-1',
      input: { task: 'implement-auth' },
      state: 'pending' as TaskState,
      dependsOn: [],
      attempts: 0,
    };
    expect(node.state).toBe('pending');
  });
});
