import type { TaskNode, TaskError } from './types.js';
import { createStateMachine } from './state.js';
import type { AgentRegistry } from './agents/registry.js';

export interface ExecutorConfig {
  agents: AgentRegistry;
  concurrency: number;
  maxAttempts?: number;
}

export interface Executor {
  execute(nodes: TaskNode[]): Promise<TaskNode[]>;
}

function toError(err: unknown): TaskError {
  if (err instanceof Error) {
    return { code: 'TRANSIENT', message: err.message, cause: err };
  }
  return { code: 'TRANSIENT', message: String(err) };
}

export function createExecutor(config: ExecutorConfig): Executor {
  const { agents, concurrency } = config;
  const maxAttempts = config.maxAttempts ?? 2;
  const sm = createStateMachine();

  return {
    async execute(nodes: TaskNode[]): Promise<TaskNode[]> {
      const results: TaskNode[] = [];
      let index = 0;

      const worker = async (): Promise<void> => {
        while (index < nodes.length) {
          const i = index++;
          const node = nodes[i];
          if (!node) continue;
          const rule = node.rule;
          const agentName = rule.startsWith('implement-')
            ? 'implementer'
            : rule.startsWith('review-')
              ? 'reviewer'
              : rule.startsWith('design-')
                ? 'architect'
                : 'implementer';
          const agent = agents.get(agentName);
          if (!agent) {
            const failed = sm.transition(node, 'failed');
            failed.result = {
              output: null,
              durationMs: 0,
              error: { code: 'FATAL', message: `No agent for: ${agentName}` },
            };
            results.push(failed);
            continue;
          }

          let attempt = 0;
          let lastError: TaskError | undefined;
          let finalNode: TaskNode = sm.transition(node, 'running');

          while (attempt < maxAttempts) {
            try {
              const result = await agent.execute(finalNode);
              finalNode = sm.transition(finalNode, 'completed');
              finalNode.result = result;
              lastError = undefined;
              break;
            } catch (err) {
              attempt++;
              lastError = toError(err);
              if (attempt < maxAttempts) {
                finalNode.attempts = attempt;
                // state is already 'running' from the initial transition; no need to re-transition
              }
            }
          }

          if (lastError) {
            if (finalNode.state === 'running') {
              finalNode = sm.transition(finalNode, 'failed');
            }
            finalNode.result = {
              output: null,
              durationMs: 0,
              error: lastError,
            };
          }

          results.push(finalNode);
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, nodes.length) },
        () => worker(),
      );
      await Promise.all(workers);
      return results;
    },
  };
}
