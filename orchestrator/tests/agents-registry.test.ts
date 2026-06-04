import { describe, it, expect } from 'vitest';
import { createAgentRegistry, type Agent } from '../src/agents/registry.js';
import type { TaskNode } from '../src/types.js';

const mockAgent: Agent = {
  name: 'mock',
  async execute(node: TaskNode) {
    return { output: `done:${node.input.task}`, durationMs: 10 };
  },
};

describe('AgentRegistry', () => {
  it('registers and retrieves agents', () => {
    const reg = createAgentRegistry();
    reg.register(mockAgent);
    expect(reg.get('mock')).toBe(mockAgent);
  });

  it('returns null for unknown agent', () => {
    const reg = createAgentRegistry();
    expect(reg.get('unknown')).toBeNull();
  });

  it('lists registered agent names', () => {
    const reg = createAgentRegistry();
    reg.register(mockAgent);
    reg.register({ ...mockAgent, name: 'other' });
    expect(reg.list()).toEqual(['mock', 'other']);
  });
});
