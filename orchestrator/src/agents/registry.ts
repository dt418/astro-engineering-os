import type { TaskNode, TaskResult } from '../types.js';

export interface Agent {
  name: string;
  execute(node: TaskNode): Promise<TaskResult>;
}

export interface AgentRegistry {
  register(agent: Agent): void;
  get(name: string): Agent | null;
  list(): string[];
}

export function createAgentRegistry(): AgentRegistry {
  const agents = new Map<string, Agent>();

  return {
    register(agent) {
      agents.set(agent.name, agent);
    },
    get(name) {
      return agents.get(name) ?? null;
    },
    list() {
      return Array.from(agents.keys());
    },
  };
}
