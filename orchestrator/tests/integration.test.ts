import { describe, it, expect, afterEach } from 'vitest';
import { createOrchestrator, createOrchestratorAsync } from '../src/index.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBuiltinAgents } from '../src/agents/builtin.js';
import { createExecutor } from '../src/executor.js';

const RULES_PATH = join(import.meta.dirname, '..', 'fixtures', 'astro-orchestrator.md');
let dir: string;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('phase 1 integration', () => {
  it('orchestrator loads real rules file', () => {
    const md = readFileSync(RULES_PATH, 'utf-8');
    expect(md).toContain('## rule:');
    const orch = createOrchestrator({ rulesPath: RULES_PATH });
    const rules = orch.listRules();
    expect(rules.length).toBeGreaterThan(0);
  });

  it('state machine validates transitions', () => {
    const orch = createOrchestrator();
    const sm = orch.getStateMachine();
    expect(sm.canTransition('pending', 'ready')).toBe(true);
    expect(sm.canTransition('pending', 'completed')).toBe(false);
  });

  it('end-to-end: create, run, inspect', async () => {
    const orch = createOrchestrator({ rulesPath: RULES_PATH });
    const node = await orch.run('implement-auth');
    expect(node.state).toBe('ready');
    expect(node.input.task).toBe('implement-auth');
    expect(node.id).toMatch(/^t-[0-9a-f-]{36}$/i);
  });
});

describe('phase 2 integration', () => {
  it('runs task through executor with builtin agents', async () => {
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const node = await createOrchestrator({ rulesPath: RULES_PATH }).run(
      'implement-auth',
    );
    const results = await exec.execute([node]);
    expect(results[0]!.state).toBe('completed');
    expect(results[0]!.result?.output).toBeDefined();
  });
});

describe('phase 3 integration', () => {
  it('async orchestrator records to history', async () => {
    dir = mkdtempSync(join(tmpdir(), 'orch-int-'));
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    await orch.recordExecution({
      id: 't1',
      task: 'test',
      rule: 'r',
      state: 'completed',
      durationMs: 50,
      attempts: 1,
    });
    const stats = await orch.getHistory().stats();
    expect(stats.total).toBe(1);
    expect(stats.byState.completed).toBe(1);
    await orch.close();
  });
});
