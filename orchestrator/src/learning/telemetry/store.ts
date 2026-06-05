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

export const TIME_RANGE_DAYS_DEFAULT = 1;

export function daysToTimeRange(days: number, end: Date = new Date()): TimeRange {
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
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
        const types = filter.types;
        results = results.filter((e) => types.includes(e.type));
      }
      if (filter.timeRange) {
        const range = filter.timeRange;
        results = results.filter(
          (e) => e.timestamp >= range.start && e.timestamp <= range.end,
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
  if (!options.dbPath) {
    throw new Error('createTelemetryStore: dbPath is required (use ":memory:" for in-memory)');
  }
  return createInMemoryStore();
}
