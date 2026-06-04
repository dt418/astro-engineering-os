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

  it('aggregates success rate', async () => {
    const hist = await createHistory({ dbPath });
    await hist.record({ id: 'a', task: 't1', rule: 'r', state: 'completed', durationMs: 10, attempts: 1 });
    await hist.record({ id: 'b', task: 't2', rule: 'r', state: 'failed', durationMs: 10, attempts: 2 });
    const stats = await hist.stats();
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
  });

  it('returns empty for no history', async () => {
    const hist = await createHistory({ dbPath });
    const all = await hist.list();
    expect(all).toHaveLength(0);
  });
});
