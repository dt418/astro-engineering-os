import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { parseRules, matchRule } from './engine.js';
import { createStateMachine, type StateMachine } from './state.js';
import {
  DEFAULT_CONFIG,
  newTaskId,
  type OrchestratorConfig,
  type RoutingRule,
  type TaskNode,
  type TaskState,
} from './types.js';
import { createHistory, type History, type HistoryEntry } from './history.js';

export interface SyncOrchestrator {
  run(task: string): Promise<TaskNode>;
  getConfig(): OrchestratorConfig;
  listRules(): RoutingRule[];
  getStateMachine(): StateMachine;
}

export interface Orchestrator extends SyncOrchestrator {
  getHistory(): History;
  recordExecution(entry: HistoryEntry): Promise<void>;
  close(): Promise<void>;
}

function resolvePath(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

function buildLoadRules(rulesPath: string): () => RoutingRule[] {
  let cached: RoutingRule[] | null = null;
  const absPath = resolvePath(rulesPath);
  return (): RoutingRule[] => {
    if (cached) return cached;
    if (!existsSync(absPath)) {
      cached = [];
      return cached;
    }
    const md = readFileSync(absPath, 'utf-8');
    cached = parseRules(md);
    return cached;
  };
}

function makeRun(
  loadRules: () => RoutingRule[],
  stateMachine: StateMachine,
) {
  return async (task: string): Promise<TaskNode> => {
    const rules = loadRules();
    const rule = matchRule(rules, task);
    if (!rule) {
      throw new Error(`No routing rule matched for task: ${task}`);
    }
    const node: TaskNode = {
      id: newTaskId(),
      rule: rule.id,
      input: { task },
      state: 'pending' as TaskState,
      dependsOn: [],
      attempts: 0,
    };
    return stateMachine.transition(node, 'ready');
  };
}

export async function createOrchestratorAsync(
  overrides?: Partial<OrchestratorConfig>,
): Promise<Orchestrator> {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...overrides };
  const stateMachine = createStateMachine();
  const loadRules = buildLoadRules(config.rulesPath);
  const history = await createHistory({ dbPath: resolvePath(config.dbPath) });

  const exitHandler = (): void => {
    history.close();
  };
  process.once('exit', exitHandler);

  return {
    run: makeRun(loadRules, stateMachine),
    getConfig() {
      return config;
    },
    listRules() {
      return loadRules();
    },
    getStateMachine() {
      return stateMachine;
    },
    getHistory() {
      return history;
    },
    async recordExecution(entry) {
      await history.record(entry);
    },
    async close() {
      process.removeListener('exit', exitHandler);
      history.close();
    },
  };
}

export function createOrchestrator(
  overrides?: Partial<OrchestratorConfig>,
): SyncOrchestrator {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...overrides };
  const stateMachine = createStateMachine();
  const loadRules = buildLoadRules(config.rulesPath);

  return {
    run: makeRun(loadRules, stateMachine),
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

export {
  newTaskId,
  type TaskId,
  type TaskState,
  type TaskNode,
  type TaskInput,
  type TaskResult,
  type TaskError,
  type RoutingRule,
  type OrchestratorConfig,
  DEFAULT_CONFIG,
} from './types.js';
export { createStateMachine, TERMINAL_STATES, type StateMachine } from './state.js';
export { parseRules, matchRule } from './engine.js';
export {
  createHistory,
  type History,
  type HistoryEntry,
  type HistoryStats,
  type ListOptions,
} from './history.js';
