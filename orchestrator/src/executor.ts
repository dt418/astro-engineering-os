import type { TaskNode, TaskError, RoutingRule } from './types.js';
import { createStateMachine } from './state.js';
import type { AgentRegistry } from './agents/registry.js';

export interface ExecutorConfig {
  agents: AgentRegistry;
  concurrency: number;
  maxAttempts?: number;
  rules?: RoutingRule[];
}

export interface Executor {
  execute(nodes: TaskNode[]): Promise<TaskNode[]>;
}

function classifyError(err: unknown): TaskError['code'] {
  if (err instanceof TypeError) return 'FATAL';
  return 'TRANSIENT';
}

function toError(err: unknown): TaskError {
  const code = classifyError(err);
  if (err instanceof Error) {
    return { code, message: err.message, cause: err, causeMessage: err.message };
  }
  return { code, message: String(err) };
}

function resolveAgentName(ruleId: string, rules?: RoutingRule[]): string {
  if (rules) {
    const match = rules.find((r) => r.id === ruleId);
    if (match?.agent) return match.agent;
  }
  if (ruleId.startsWith('implement-')) return 'implementer';
  if (ruleId.startsWith('review-')) return 'reviewer';
  if (ruleId.startsWith('design-')) return 'architect';
  return 'implementer';
}

export function createExecutor(config: ExecutorConfig): Executor {
  const { agents, concurrency, rules } = config;
  if (concurrency < 1) {
    throw new Error('concurrency must be >= 1');
  }
  const maxAttempts = config.maxAttempts ?? 3;
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
          const agentName = resolveAgentName(node.rule, rules);
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
              if (lastError.code === 'FATAL') break;
              if (attempt < maxAttempts) {
                finalNode.attempts = attempt;
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
