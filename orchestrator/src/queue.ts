import type { TaskNode } from './types.js';

export interface Queue {
  enqueue(node: TaskNode): void;
  dequeue(): TaskNode | null;
  size(): number;
  isEmpty(): boolean;
  toArray(): TaskNode[];
}

export function createQueue(): Queue {
  let items: TaskNode[] = [];

  return {
    enqueue(node) {
      items.push(node);
      items.sort((a, b) => {
        const paRaw = a.input.context?.priority;
        const pa = typeof paRaw === 'number' ? paRaw : 0;
        const pbRaw = b.input.context?.priority;
        const pb = typeof pbRaw === 'number' ? pbRaw : 0;
        return pb - pa;
      });
    },
    dequeue() {
      return items.shift() ?? null;
    },
    size() {
      return items.length;
    },
    isEmpty() {
      return items.length === 0;
    },
    toArray() {
      return [...items];
    },
  };
}
