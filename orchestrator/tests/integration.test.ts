import { describe, it, expect } from 'vitest';
import { createOrchestrator } from '../src/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RULES_PATH = join(import.meta.dirname, '..', 'fixtures', 'astro-orchestrator.md');

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
  });
});

describe('phase 2 integration', () => {
  it('runs task through executor with builtin agents', async () => {
    const { createBuiltinAgents } = await import('../src/agents/builtin.js');
    const { createExecutor } = await import('../src/executor.js');
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const node = await createOrchestrator({ rulesPath: RULES_PATH }).run('implement-auth');
    const results = await exec.execute([node]);
    expect(results[0]!.state).toBe('completed');
    expect(results[0]!.result?.output).toBeDefined();
  });
});
