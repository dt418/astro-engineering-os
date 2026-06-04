import { describe, it, expect } from 'vitest';
import { createQueue } from '../src/queue.js';
import type { TaskId, TaskNode } from '../src/types.js';

const makeNode = (id: string, priority: number): TaskNode => ({
  id: id as TaskId,
  rule: 'r',
  input: { task: 't', context: { priority } },
  state: 'ready' as TaskNode['state'],
  dependsOn: [],
  attempts: 0,
});

describe('Queue', () => {
  it('enqueues and dequeues in priority order', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    q.enqueue(makeNode('b', 5));
    q.enqueue(makeNode('c', 3));
    expect(q.dequeue()?.id).toBe('b');
    expect(q.dequeue()?.id).toBe('c');
    expect(q.dequeue()?.id).toBe('a');
  });

  it('returns null when empty', () => {
    const q = createQueue();
    expect(q.dequeue()).toBeNull();
  });

  it('reports size', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    q.enqueue(makeNode('b', 2));
    expect(q.size()).toBe(2);
  });
});
