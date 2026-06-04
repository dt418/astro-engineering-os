import type { Agent, AgentRegistry } from './registry.js';
import { createAgentRegistry } from './registry.js';
import type { TaskNode, TaskResult } from '../types.js';

const architect: Agent = {
  name: 'architect',
  async execute(node: TaskNode): Promise<TaskResult> {
    const start = Date.now();
    return {
      output: {
        type: 'design',
        task: node.input.task,
        design: `Architectural design for: ${node.input.task}`,
      },
      durationMs: Date.now() - start,
    };
  },
};

const implementer: Agent = {
  name: 'implementer',
  async execute(node: TaskNode): Promise<TaskResult> {
    const start = Date.now();
    return {
      output: {
        type: 'implementation',
        task: node.input.task,
        plan: `Implementation plan for: ${node.input.task}`,
      },
      durationMs: Date.now() - start,
    };
  },
};

const reviewer: Agent = {
  name: 'reviewer',
  async execute(node: TaskNode): Promise<TaskResult> {
    const start = Date.now();
    return {
      output: {
        type: 'review',
        task: node.input.task,
        verdict: 'approved',
        notes: `Review notes for: ${node.input.task}`,
      },
      durationMs: Date.now() - start,
    };
  },
};

export function createBuiltinAgents(): AgentRegistry {
  const reg = createAgentRegistry();
  reg.register(architect);
  reg.register(implementer);
  reg.register(reviewer);
  return reg;
}
