import type { TelemetryEvent } from './events.js';
import type { TelemetryStore } from './store.js';

export interface TelemetryCollector {
  emit(event: TelemetryEvent): void;
  flush(): Promise<void>;
  getQueueSize(): number;
}

export function createTelemetryCollector(store: TelemetryStore): TelemetryCollector {
  const queue: TelemetryEvent[] = [];
  let flushing = false;

  const collector: TelemetryCollector = {
    emit(event: TelemetryEvent) {
      queue.push(event);

      if (queue.length >= 10 && !flushing) {
        void collector.flush().catch(console.error);
      }
    },

    async flush(): Promise<void> {
      if (queue.length === 0) return;

      flushing = true;
      const toFlush = queue.splice(0, queue.length);

      try {
        await Promise.all(toFlush.map((event) => store.store(event)));
      } finally {
        flushing = false;
      }
    },

    getQueueSize(): number {
      return queue.length;
    },
  };

  return collector;
}
