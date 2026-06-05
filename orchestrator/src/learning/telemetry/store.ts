import type { TelemetryEvent, EventType } from './events.js';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface TelemetryQuery {
  requestId?: string;
  intent?: string;
  types?: EventType[];
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

export interface TelemetryStats {
  total: number;
  byType: Record<EventType, number>;
  byIntent: Record<string, number>;
}

export interface TelemetryStore {
  store(event: TelemetryEvent): Promise<void>;
  query(filter: TelemetryQuery): Promise<TelemetryEvent[]>;
  getStats(timeRange: TimeRange): Promise<TelemetryStats>;
  close(): void;
}

export interface TelemetryStoreOptions {
  dbPath: string;
  retentionDays?: number;
}

function createInMemoryStore(): TelemetryStore {
  const store = new Map<string, TelemetryEvent>();

  return {
    async store(event) {
      store.set(event.id, event);
    },
    async query(filter) {
      let results = [...store.values()];

      if (filter.requestId) {
        results = results.filter((e) => e.requestId === filter.requestId);
      }
      if (filter.intent) {
        results = results.filter((e) => e.intent === filter.intent);
      }
      if (filter.types?.length) {
        results = results.filter((e) => filter.types!.includes(e.type));
      }
      if (filter.timeRange) {
        results = results.filter(
          (e) => e.timestamp >= filter.timeRange!.start && e.timestamp <= filter.timeRange!.end,
        );
      }

      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? 100;
      return results.slice(offset, offset + limit);
    },
    async getStats(timeRange) {
      const events = await this.query({ timeRange });
      const byType: Record<string, number> = {};
      const byIntent: Record<string, number> = {};

      for (const event of events) {
        byType[event.type] = (byType[event.type] ?? 0) + 1;
        if (event.intent) {
          byIntent[event.intent] = (byIntent[event.intent] ?? 0) + 1;
        }
      }

      return {
        total: events.length,
        byType: byType as Record<EventType, number>,
        byIntent,
      };
    },
    close() {
      store.clear();
    },
  };
}

export async function createTelemetryStore(options: TelemetryStoreOptions): Promise<TelemetryStore> {
  if (options.dbPath === ':memory:') {
    return createInMemoryStore();
  }
  return createInMemoryStore();
}
