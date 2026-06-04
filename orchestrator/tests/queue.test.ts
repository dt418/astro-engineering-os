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

  it('preserves FIFO order for equal priority', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    q.enqueue(makeNode('b', 1));
    q.enqueue(makeNode('c', 2));
    expect(q.dequeue()?.id).toBe('c');
    expect(q.dequeue()?.id).toBe('a');
    expect(q.dequeue()?.id).toBe('b');
  });

  it('toArray returns a defensive copy', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    const arr = q.toArray();
    arr.pop();
    expect(q.size()).toBe(1);
    expect(q.dequeue()?.id).toBe('a');
  });
});
