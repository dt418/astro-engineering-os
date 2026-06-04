import { describe, it, expect } from 'vitest';
import { createBuiltinAgents } from '../src/agents/builtin.js';

describe('builtin agents', () => {
  it('creates architect agent', () => {
    const agents = createBuiltinAgents();
    const arch = agents.get('architect');
    expect(arch).not.toBeNull();
    expect(arch?.name).toBe('architect');
  });

  it('creates implementer agent', () => {
    const agents = createBuiltinAgents();
    expect(agents.get('implementer')).not.toBeNull();
  });

  it('creates reviewer agent', () => {
    const agents = createBuiltinAgents();
    expect(agents.get('reviewer')).not.toBeNull();
  });

  it('created agents execute tasks', async () => {
    const agents = createBuiltinAgents();
    const node = {
      id: 't1' as never,
      rule: 'r',
      input: { task: 'do-thing' },
      state: 'running' as const,
      dependsOn: [],
      attempts: 0,
    };
    const result = await agents.get('implementer')!.execute(node);
    expect(result.output).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
