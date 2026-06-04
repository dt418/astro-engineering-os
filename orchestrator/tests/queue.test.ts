import { describe, it, expect } from 'vitest';
import { createQueue } from '../src/queue.js';
import type { TaskId, TaskNode } from '../src/types.js';

// `context: { priority }` is required for the ordering test to actually
// exercise the sort path — without it all nodes default to priority 0 and
// V8's stable sort preserves insertion order, breaking the b/c/a assertion.
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

  it('isEmpty reflects queue state', () => {
    const q = createQueue();
    expect(q.isEmpty()).toBe(true);
    q.enqueue(makeNode('a', 1));
    expect(q.isEmpty()).toBe(false);
    q.dequeue();
    expect(q.isEmpty()).toBe(true);
  });

  it('dequeues all items at higher priority first', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    q.enqueue(makeNode('b', 1));
    q.enqueue(makeNode('c', 2));
    const ids = new Set([q.dequeue()?.id, q.dequeue()?.id, q.dequeue()?.id]);
    expect(ids).toEqual(new Set(['a', 'b', 'c']));
    expect(q.isEmpty()).toBe(true);
  });

  it('toArray returns a defensive copy', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    const arr = q.toArray();
    arr.pop();
    expect(q.size()).toBe(1);
    expect(q.dequeue()?.id).toBe('a');
  });

  it('handles 100 items in priority order', () => {
    const q = createQueue();
    for (let i = 0; i < 100; i++) {
      q.enqueue(makeNode(`n${i}`, Math.floor(Math.random() * 100)));
    }
    let last = Infinity;
    while (!q.isEmpty()) {
      const n = q.dequeue();
      const p = (n!.input.context as { priority: number }).priority;
      expect(p).toBeLessThanOrEqual(last);
      last = p;
    }
  });
});
