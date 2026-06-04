import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

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

export interface HistoryStats {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
}

export interface History {
  record(entry: HistoryEntry): Promise<void>;
  list(): Promise<HistoryEntry[]>;
  stats(): Promise<HistoryStats>;
}

export interface HistoryConfig {
  dbPath: string;
}

export async function createHistory(config: HistoryConfig): Promise<History> {
  mkdirSync(dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
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

  const insert = db.prepare(`
    INSERT OR REPLACE INTO executions
    (id, task, rule, state, duration_ms, attempts, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const selectAll = db.prepare(`SELECT * FROM executions ORDER BY created_at DESC`);
  const countAll = db.prepare(`SELECT COUNT(*) as c FROM executions`);
  const countCompleted = db.prepare(`SELECT COUNT(*) as c FROM executions WHERE state = 'completed'`);
  const countFailed = db.prepare(`SELECT COUNT(*) as c FROM executions WHERE state = 'failed'`);

  return {
    async record(entry) {
      insert.run(
        entry.id,
        entry.task,
        entry.rule,
        entry.state,
        entry.durationMs,
        entry.attempts,
        entry.error ?? null,
        Date.now(),
      );
    },
    async list() {
      const rows = selectAll.all() as Array<{
        id: string;
        task: string;
        rule: string;
        state: string;
        duration_ms: number;
        attempts: number;
        error: string | null;
        created_at: number;
      }>;
      return rows.map((r) => ({
        id: r.id,
        task: r.task,
        rule: r.rule,
        state: r.state,
        durationMs: r.duration_ms,
        attempts: r.attempts,
        error: r.error ?? undefined,
        createdAt: r.created_at,
      }));
    },
    async stats() {
      const total = (countAll.get() as { c: number }).c;
      const completed = (countCompleted.get() as { c: number }).c;
      const failed = (countFailed.get() as { c: number }).c;
      return {
        total,
        completed,
        failed,
        successRate: total === 0 ? 0 : completed / total,
      };
    },
  };
}
