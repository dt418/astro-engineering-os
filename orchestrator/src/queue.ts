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
        const pa = (a.input.context?.priority as number) ?? 0;
        const pb = (b.input.context?.priority as number) ?? 0;
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
