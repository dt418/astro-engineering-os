import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { TaskState } from './types.js';

export interface HistoryEntry {
  id: string;
  task: string;
  rule: string;
  state: string;
  durationMs: number;
  attempts: number;
  error?: string;
  createdAt?: number;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export interface HistoryStats {
  total: number;
  byState: Record<TaskState, number>;
  successRate: number;
}

export interface History {
  record(entry: HistoryEntry): Promise<void>;
  list(options?: ListOptions): Promise<HistoryEntry[]>;
  stats(): Promise<HistoryStats>;
  close(): void;
}

export interface HistoryConfig {
  dbPath: string;
}

interface Row {
  id: string;
  task: string;
  rule: string;
  state: string;
  duration_ms: number;
  attempts: number;
  error: string | null;
  created_at: number;
}

function rowToEntry(r: Row): HistoryEntry {
  return {
    id: r.id,
    task: r.task,
    rule: r.rule,
    state: r.state,
    durationMs: r.duration_ms,
    attempts: r.attempts,
    error: r.error ?? undefined,
    createdAt: r.created_at,
  };
}

const ALL_STATES: readonly TaskState[] = [
  'pending',
  'ready',
  'running',
  'completed',
  'failed',
  'blocked',
] as const;

export async function createHistory(config: HistoryConfig): Promise<History> {
  await mkdir(dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      rule TEXT NOT NULL,
      state TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      attempts INTEGER NOT NULL,
      error TEXT,
      created_at INTEGER NOT NULL
    )
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC)`,
  );

  const insert = db.prepare(`
    INSERT INTO executions
      (id, task, rule, state, duration_ms, attempts, error, created_at)
    VALUES (@id, @task, @rule, @state, @durationMs, @attempts, @error, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      task = excluded.task,
      rule = excluded.rule,
      state = excluded.state,
      duration_ms = excluded.duration_ms,
      attempts = excluded.attempts,
      error = excluded.error
  `);
  const selectAll = db.prepare(
    `SELECT * FROM executions ORDER BY created_at DESC LIMIT @limit OFFSET @offset`,
  );
  const countByState = db.prepare(
    `SELECT state, COUNT(*) AS n FROM executions GROUP BY state`,
  );

  return {
    async record(entry) {
      insert.run({
        id: entry.id,
        task: entry.task,
        rule: entry.rule,
        state: entry.state,
        durationMs: entry.durationMs,
        attempts: entry.attempts,
        error: entry.error ?? null,
        createdAt: entry.createdAt ?? Date.now(),
      });
    },
    async list(options = {}) {
      const limit = options.limit ?? 100;
      const offset = options.offset ?? 0;
      const rows = selectAll.all({ limit, offset }) as Row[];
      return rows.map(rowToEntry);
    },
    async stats() {
      const byState: Record<TaskState, number> = {
        pending: 0,
        ready: 0,
        running: 0,
        completed: 0,
        failed: 0,
        blocked: 0,
      };
      let total = 0;
      for (const row of countByState.all() as Array<{ state: string; n: number }>) {
        if ((ALL_STATES as readonly string[]).includes(row.state)) {
          byState[row.state as TaskState] = row.n;
        }
        total += row.n;
      }
      const completed = byState.completed;
      return {
        total,
        byState,
        successRate: total === 0 ? 0 : completed / total,
      };
    },
    close() {
      db.close();
    },
  };
}
