import { describe, it, expect } from 'vitest';
import { createOrchestrator, createOrchestratorAsync } from '../src/index.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';

let dir: string;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('createOrchestrator', () => {
  it('returns sync orchestrator instance', () => {
    const orch = createOrchestrator();
    expect(orch).toBeDefined();
    expect(typeof orch.run).toBe('function');
  });

  it('accepts config override', () => {
    const orch = createOrchestrator({ concurrency: 5 });
    expect(orch.getConfig().concurrency).toBe(5);
  });

  it('uses default config when none provided', () => {
    const orch = createOrchestrator();
    expect(orch.getConfig().concurrency).toBe(3);
  });

  it('mints UUID task ids', async () => {
    const orch = createOrchestrator({
      rulesPath: 'fixtures/astro-orchestrator.md',
    });
    const node = await orch.run('implement-foo');
    expect(node.id).toMatch(/^t-[0-9a-f-]{36}$/i);
  });
});

describe('createOrchestratorAsync', () => {
  it('returns async orchestrator with history', async () => {
    dir = mkdtempSync(join(tmpdir(), 'orch-async-'));
    const orch = await createOrchestratorAsync({ dbPath: join(dir, 'h.db') });
    expect(orch.getHistory()).toBeDefined();
    await orch.recordExecution({
      id: 'test-1',
      task: 't',
      rule: 'r',
      state: 'completed',
      durationMs: 1,
      attempts: 1,
    });
    const all = await orch.getHistory().list();
    expect(all).toHaveLength(1);
  });

  it('exposes close() that closes history', async () => {
    dir = mkdtempSync(join(tmpdir(), 'orch-async-close-'));
    const orch = await createOrchestratorAsync({ dbPath: join(dir, 'h.db') });
    await orch.close();
    // second close is a no-op (db already closed)
    await orch.close();
  });
});
