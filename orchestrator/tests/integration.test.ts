import { describe, it, expect } from 'vitest';
import { createOrchestrator } from '../src/index.js';
import { runCli } from '../src/cli.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('phase 1 integration', () => {
  it('orchestrator loads real rules file', () => {
    const md = readFileSync(
      join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md'),
      'utf-8',
    );
    const orch = createOrchestrator({ rulesPath: join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md') });
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
    const orch = createOrchestrator({
      rulesPath: join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md'),
    });
    const node = await orch.run('implement-auth');
    expect(node.state).toBe('ready');
    expect(node.input.task).toBe('implement-auth');
  });
});
