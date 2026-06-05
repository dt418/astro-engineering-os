import type { TelemetryEvent } from './events.js';
import type { TelemetryStore } from './store.js';

export const AUTO_FLUSH_THRESHOLD = 10;

export interface TelemetryCollector {
  emit(event: TelemetryEvent): void;
  flush(): Promise<void>;
  getQueueSize(): number;
}

export function createTelemetryCollector(store: TelemetryStore): TelemetryCollector {
  const queue: TelemetryEvent[] = [];
  let flushPromise: Promise<void> | null = null;

  const doFlush = async (): Promise<void> => {
    if (queue.length === 0) return;
    const toFlush = queue.splice(0, queue.length);
    try {
      await Promise.all(toFlush.map((event) => store.store(event)));
    } finally {
      flushPromise = null;
    }
  };

  const collector: TelemetryCollector = {
    emit(event: TelemetryEvent) {
      queue.push(event);

      if (queue.length >= AUTO_FLUSH_THRESHOLD && flushPromise === null) {
        flushPromise = doFlush().catch(console.error);
      }
    },

    async flush(): Promise<void> {
      if (queue.length === 0) return;
      if (flushPromise) {
        await flushPromise;
        return collector.flush();
      }
      flushPromise = doFlush();
      await flushPromise;
    },

    getQueueSize(): number {
      return queue.length;
    },
  };

  return collector;
}
