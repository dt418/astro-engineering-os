import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRules, matchRule } from './engine.js';
import { createStateMachine, type StateMachine } from './state.js';
import {
  DEFAULT_CONFIG,
  type OrchestratorConfig,
  type RoutingRule,
  type TaskId,
  type TaskNode,
  type TaskState,
} from './types.js';

export interface Orchestrator {
  run(task: string): Promise<TaskNode>;
  getConfig(): OrchestratorConfig;
  listRules(): RoutingRule[];
  getStateMachine(): StateMachine;
}

export function createOrchestrator(
  overrides?: Partial<OrchestratorConfig>,
): Orchestrator {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...overrides };
  const stateMachine = createStateMachine();

  let cachedRules: RoutingRule[] | null = null;

  const loadRules = (): RoutingRule[] => {
    if (cachedRules) return cachedRules;
    const path = resolve(config.rulesPath);
    if (!existsSync(path)) {
      cachedRules = [];
      return cachedRules;
    }
    const md = readFileSync(path, 'utf-8');
    cachedRules = parseRules(md);
    return cachedRules;
  };

  return {
    async run(task: string): Promise<TaskNode> {
      const rules = loadRules();
      const rule = matchRule(rules, task);
      if (!rule) {
        throw new Error(`No routing rule matched for task: ${task}`);
      }
      const node: TaskNode = {
        id: `t-${Date.now()}` as TaskId,
        rule: rule.id,
        input: { task },
        state: 'pending' as TaskState,
        dependsOn: [],
        attempts: 0,
      };
      return stateMachine.transition(node, 'ready');
    },
    getConfig() {
      return config;
    },
    listRules() {
      return loadRules();
    },
    getStateMachine() {
      return stateMachine;
    },
  };
}

export * from './types.js';
export * from './state.js';
export * from './engine.js';
