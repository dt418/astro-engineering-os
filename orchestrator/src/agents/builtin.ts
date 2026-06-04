import type { Agent, AgentRegistry } from './registry.js';
import { createAgentRegistry } from './registry.js';
import type { TaskNode, TaskResult } from '../types.js';

function createStubAgent(
  name: string,
  outputType: string,
  build: (task: string) => Record<string, unknown>,
): Agent {
  return {
    name,
    async execute(node: TaskNode): Promise<TaskResult> {
      const start = Date.now();
      // One real microtask hop so `durationMs` is observably non-zero.
      await Promise.resolve();
      return {
        output: { type: outputType, task: node.input.task, ...build(node.input.task) },
        durationMs: Math.max(1, Date.now() - start),
      };
    },
  };
}

const architect = createStubAgent('architect', 'design', (task) => ({
  design: `Architectural design for: ${task}`,
}));

const implementer = createStubAgent('implementer', 'implementation', (task) => ({
  plan: `Implementation plan for: ${task}`,
}));

const reviewer = createStubAgent('reviewer', 'review', (task) => ({
  verdict: 'approved',
  notes: `Review notes for: ${task}`,
}));

export function createBuiltinAgents(): AgentRegistry {
  const reg = createAgentRegistry();
  reg.register(architect);
  reg.register(implementer);
  reg.register(reviewer);
  return reg;
}
