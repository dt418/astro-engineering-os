import { describe, it, expect, beforeEach } from 'vitest';
import { ReadyQueue } from '../../src/runtime/ready-queue.js';

describe('ReadyQueue', () => {
  let queue: ReadyQueue;

  beforeEach(() => {
    queue = new ReadyQueue();
  });

  it('enqueue adds item', () => {
    queue.enqueue('task-1');
    expect(queue.size()).toBe(1);
    expect(queue.peek()).toBe('task-1');
  });

  it('dequeue returns and removes first item', () => {
    queue.enqueue('task-1');
    queue.enqueue('task-2');
    expect(queue.dequeue()).toBe('task-1');
    expect(queue.size()).toBe(1);
  });

  it('dequeue returns null when empty', () => {
    expect(queue.dequeue()).toBeNull();
  });

  it('enqueueBatch adds multiple items', () => {
    queue.enqueueBatch(['a', 'b', 'c']);
    expect(queue.size()).toBe(3);
  });

  it('dequeueN returns N items', () => {
    queue.enqueueBatch(['a', 'b', 'c', 'd']);
    const items = queue.dequeueN(2);
    expect(items).toHaveLength(2);
    expect(queue.size()).toBe(2);
  });

  it('dequeueN returns all when fewer than N', () => {
    queue.enqueueBatch(['a', 'b']);
    const items = queue.dequeueN(5);
    expect(items).toHaveLength(2);
    expect(queue.isEmpty()).toBe(true);
  });

  it('isEmpty returns true for empty queue', () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue('a');
    expect(queue.isEmpty()).toBe(false);
  });

  it('clear removes all items', () => {
    queue.enqueueBatch(['a', 'b', 'c']);
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
  });

  it('enqueue prevents duplicates', () => {
    queue.enqueue('task-1');
    queue.enqueue('task-1');
    expect(queue.size()).toBe(1);
  });

  it('peek returns first without removing', () => {
    queue.enqueue('task-1');
    queue.enqueue('task-2');
    expect(queue.peek()).toBe('task-1');
    expect(queue.size()).toBe(2);
  });
});