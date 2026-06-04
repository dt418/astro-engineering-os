import type { TaskNode } from './types.js';

export interface Queue {
  enqueue(node: TaskNode): void;
  dequeue(): TaskNode | null;
  size(): number;
  isEmpty(): boolean;
  toArray(): TaskNode[];
}

function priorityOf(node: TaskNode): number {
  const p = node.input.context?.priority;
  return typeof p === 'number' ? p : 0;
}

export function createQueue(): Queue {
  let items: TaskNode[] = [];
  let head = 0;
  const COMPACT_THRESHOLD = 64;

  const compact = (): void => {
    if (head > 0) {
      items = items.slice(head);
      head = 0;
    }
  };

  return {
    enqueue(node) {
      items.push(node);
    },
    dequeue() {
      if (head >= items.length) return null;
      // Linear scan from head for max priority — O(n) but n is bounded by
      // queue depth. For very large queues, replace with a binary heap.
      let bestIdx = head;
      for (let i = head + 1; i < items.length; i++) {
        if (priorityOf(items[i]!) > priorityOf(items[bestIdx]!)) {
          bestIdx = i;
        }
      }
      const picked = items[bestIdx]!;
      // Swap-with-last trick: O(1) removal regardless of position.
      const last = items.length - 1;
      if (bestIdx !== last) {
        items[bestIdx] = items[last]!;
      }
      items.length = last;
      if (items.length - head < COMPACT_THRESHOLD && head > 0) {
        compact();
      }
      return picked;
    },
    size() {
      return items.length - head;
    },
    isEmpty() {
      return head >= items.length;
    },
    toArray() {
      return items.slice(head);
    },
  };
}
