import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHistory } from '../src/history.js';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'orch-test-'));
  dbPath = join(dir, 'test.db');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('History', () => {
  it('records and retrieves execution', async () => {
    const hist = await createHistory({ dbPath });
    await hist.record({
      id: 't1',
      task: 'implement-auth',
      rule: 'implement-*',
      state: 'completed',
      durationMs: 100,
      attempts: 1,
    });
    const all = await hist.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.task).toBe('implement-auth');
  });

  it('aggregates success rate via single GROUP BY query', async () => {
    const hist = await createHistory({ dbPath });
    await hist.record({ id: 'a', task: 't1', rule: 'r', state: 'completed', durationMs: 10, attempts: 1 });
    await hist.record({ id: 'b', task: 't2', rule: 'r', state: 'failed', durationMs: 10, attempts: 2 });
    const stats = await hist.stats();
    expect(stats.total).toBe(2);
    expect(stats.byState.completed).toBe(1);
    expect(stats.byState.failed).toBe(1);
    expect(stats.successRate).toBe(0.5);
  });

  it('returns empty for no history', async () => {
    const hist = await createHistory({ dbPath });
    const all = await hist.list();
    expect(all).toHaveLength(0);
  });

  it('respects explicit createdAt', async () => {
    const hist = await createHistory({ dbPath });
    const t = 1700000000000;
    await hist.record({
      id: 'a',
      task: 't',
      rule: 'r',
      state: 'completed',
      durationMs: 1,
      attempts: 1,
      createdAt: t,
    });
    const [row] = await hist.list();
    expect(row?.createdAt).toBe(t);
  });

  it('paginates with limit/offset', async () => {
    const hist = await createHistory({ dbPath });
    for (let i = 0; i < 5; i++) {
      await hist.record({
        id: `t${i}`,
        task: `task-${i}`,
        rule: 'r',
        state: 'completed',
        durationMs: 1,
        attempts: 1,
        createdAt: 1700000000000 + i,
      });
    }
    const first = await hist.list({ limit: 2, offset: 0 });
    expect(first).toHaveLength(2);
    expect(first[0]?.id).toBe('t4');
    expect(first[1]?.id).toBe('t3');
    const next = await hist.list({ limit: 2, offset: 2 });
    expect(next[0]?.id).toBe('t2');
    expect(next[1]?.id).toBe('t1');
  });

  it('upserts on conflict (idempotent retry)', async () => {
    const hist = await createHistory({ dbPath });
    await hist.record({
      id: 'a',
      task: 'first',
      rule: 'r',
      state: 'running',
      durationMs: 1,
      attempts: 0,
    });
    await hist.record({
      id: 'a',
      task: 'first',
      rule: 'r',
      state: 'completed',
      durationMs: 99,
      attempts: 1,
    });
    const all = await hist.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.state).toBe('completed');
    expect(all[0]?.attempts).toBe(1);
  });

  it('close() releases the database', async () => {
    const hist = await createHistory({ dbPath });
    hist.close();
    expect(() => hist.close()).not.toThrow();
  });
});
