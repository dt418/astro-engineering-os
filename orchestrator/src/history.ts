import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { TaskState } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Database: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite3 = require('better-sqlite3') as { default?: unknown } | undefined;
  Database = BetterSqlite3?.default ?? BetterSqlite3;
} catch {
  Database = null;
}

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

function createInMemoryHistory(): History {
  const store = new Map<string, HistoryEntry & { createdAt: number }>();

  return {
    async record(entry) {
      store.set(entry.id, {
        ...entry,
        createdAt: entry.createdAt ?? Date.now(),
      });
    },
    async list(options = {}) {
      const limit = options.limit ?? 100;
      const offset = options.offset ?? 0;
      const all = [...store.values()].sort((a, b) => b.createdAt - a.createdAt);
      return all.slice(offset, offset + limit);
    },
    async stats() {
      const byState: Record<TaskState, number> = {
        pending: 0, ready: 0, running: 0, completed: 0, failed: 0, blocked: 0,
      };
      let total = 0;
      for (const e of store.values()) {
        if ((ALL_STATES as readonly string[]).includes(e.state)) {
          byState[e.state as TaskState]++;
        }
        total++;
      }
      return { total, byState, successRate: total === 0 ? 0 : (byState.completed ?? 0) / total };
    },
    close() {
      store.clear();
    },
  };
}

async function createSqlJsHistory(dbPath: string): Promise<History> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js') as { default?: (config?: unknown) => Promise<{ Database: new (data?: ArrayLike<number>) => SqlJsDatabase }> } & ((config?: unknown) => Promise<{ Database: new (data?: ArrayLike<number>) => SqlJsDatabase }>);
  const SQLPromise = 'default' in initSqlJs && typeof initSqlJs.default === 'function' ? initSqlJs.default() : initSqlJs();
  const SQL = await SQLPromise;
  const SqlJsDatabaseCtor = SQL.Database;

  let db: SqlJsDatabase;
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SqlJsDatabaseCtor(fileBuffer);
  } else {
    db = new SqlJsDatabaseCtor();
    db.run(`
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
    db.run(`CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC)`);
  }

  return {
    async record(entry) {
      db.run(
        `INSERT OR REPLACE INTO executions (id, task, rule, state, duration_ms, attempts, error, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry.id, entry.task, entry.rule, entry.state, entry.durationMs, entry.attempts, entry.error ?? null, entry.createdAt ?? Date.now()],
      );
      writeFileSync(dbPath, Buffer.from(db.export()));
    },
    async list(options = {}) {
      const limit = options.limit ?? 100;
      const offset = options.offset ?? 0;
      const result = db.exec(`SELECT * FROM executions ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
      if (!result?.length || !result[0]?.values?.length) return [];
      return result[0].values.map((row) =>
        rowToEntry({ id: row[0] as string, task: row[1] as string, rule: row[2] as string, state: row[3] as string,
          duration_ms: row[4] as number, attempts: row[5] as number, error: row[6] as string | null, created_at: row[7] as number }),
      );
    },
    async stats() {
      const byState: Record<TaskState, number> = { pending: 0, ready: 0, running: 0, completed: 0, failed: 0, blocked: 0 };
      let total = 0;
      const result = db.exec(`SELECT state, COUNT(*) AS n FROM executions GROUP BY state`);
      if (result?.length && result[0]?.values?.length) {
        for (const row of result[0].values) {
          if ((ALL_STATES as readonly string[]).includes(row[0] as string)) {
            byState[row[0] as TaskState] = row[1] as number;
          }
          total += row[1] as number;
        }
      }
      return { total, byState, successRate: total === 0 ? 0 : (byState.completed ?? 0) / total };
    },
    close() {
      writeFileSync(dbPath, Buffer.from(db.export()));
      db.close();
    },
  };
}

function createBetterSqliteHistory(dbPath: string): History {
  const db = new Database!(dbPath);
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC)`);

  const insert = db.prepare(`
    INSERT INTO executions (id, task, rule, state, duration_ms, attempts, error, created_at)
    VALUES (@id, @task, @rule, @state, @durationMs, @attempts, @error, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      task = excluded.task, rule = excluded.rule, state = excluded.state,
      duration_ms = excluded.duration_ms, attempts = excluded.attempts, error = excluded.error
  `);
  const selectAll = db.prepare(`SELECT * FROM executions ORDER BY created_at DESC LIMIT @limit OFFSET @offset`);
  const countByState = db.prepare(`SELECT state, COUNT(*) AS n FROM executions GROUP BY state`);

  return {
    async record(entry) {
      insert.run({ id: entry.id, task: entry.task, rule: entry.rule, state: entry.state,
        durationMs: entry.durationMs, attempts: entry.attempts, error: entry.error ?? null,
        createdAt: entry.createdAt ?? Date.now() });
    },
    async list(options = {}) {
      const rows = selectAll.all({ limit: options.limit ?? 100, offset: options.offset ?? 0 }) as Row[];
      return rows.map(rowToEntry);
    },
    async stats() {
      const byState: Record<TaskState, number> = { pending: 0, ready: 0, running: 0, completed: 0, failed: 0, blocked: 0 };
      let total = 0;
      for (const row of countByState.all() as Array<{ state: string; n: number }>) {
        if ((ALL_STATES as readonly string[]).includes(row.state)) byState[row.state as TaskState] = row.n;
        total += row.n;
      }
      return { total, byState, successRate: total === 0 ? 0 : (byState.completed ?? 0) / total };
    },
    close() { db.close(); },
  };
}

export async function createHistory(config: HistoryConfig): Promise<History> {
  if (Database) {
    await mkdir(dirname(config.dbPath), { recursive: true });
    return createBetterSqliteHistory(config.dbPath);
  }
  // Fallback: try sql.js (WebAssembly SQLite)
  try {
    return await createSqlJsHistory(config.dbPath);
  } catch {
    // Final fallback: in-memory store
    return createInMemoryHistory();
  }
}

interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  export(): Uint8Array;
  close(): void;
}