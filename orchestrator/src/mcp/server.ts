import { randomUUID } from 'node:crypto';
import {
  createOrchestratorAsync,
  type Orchestrator,
  type SyncOrchestrator,
} from '../index.js';
import { createBuiltinAgents } from '../agents/builtin.js';
import { createExecutor } from '../executor.js';

export class McpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServer {
  serverInfo(): McpServerInfo;
  listTools(): McpTool[];
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
}

const SERVER_NAME = 'astro-orchestrator';
const SERVER_VERSION = '0.2.0';

export interface McpServerOptions {
  orchestrator?: Orchestrator | SyncOrchestrator;
  version?: string;
}

export async function createMcpServer(
  opts: McpServerOptions = {},
): Promise<McpServer> {
  const orch: Orchestrator | SyncOrchestrator =
    opts.orchestrator ?? (await createOrchestratorAsync());
  const agents = createBuiltinAgents();
  const rules = orch.listRules();
  const executor = createExecutor({ agents, concurrency: 1, rules });

  const tools: McpTool[] = [
    {
      name: 'run_task',
      description: 'Route and execute a task through the orchestrator',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'The task string to route' },
        },
        required: ['task'],
      },
    },
    {
      name: 'list_tasks',
      description: 'List available routing rules',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_status',
      description: 'Get the most recent execution state for a task id',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Task id' } },
        required: ['id'],
      },
    },
  ];

  function asString(v: unknown, field: string): string {
    if (typeof v !== 'string' || v.length === 0) {
      throw new McpError('E_INVALID_INPUT', `${field} must be a non-empty string`);
    }
    return v;
  }

  return {
    serverInfo() {
      return { name: SERVER_NAME, version: opts.version ?? SERVER_VERSION };
    },
    listTools() {
      return tools;
    },
    async call(name, args) {
      const fullOrch: Orchestrator | null =
        'getHistory' in orch && typeof (orch as Orchestrator).getHistory === 'function'
          ? (orch as Orchestrator)
          : null;
      switch (name) {
        case 'run_task': {
          const task = asString(args.task, 'task');
          const node = await orch.run(task);
          const [result] = await executor.execute([node]);
          const id = result?.id ?? randomUUID();
          if (fullOrch && result) {
            await fullOrch.recordExecution({
              id,
              task,
              rule: result.rule,
              state: result.state,
              durationMs: result.result?.durationMs ?? 0,
              attempts: result.attempts,
              error: result.result?.error
                ? `${result.result.error.code}: ${result.result.error.message}`
                : undefined,
            });
          }
          return {
            id,
            rule: result?.rule,
            state: result?.state,
            result: result?.result,
          };
        }
        case 'list_tasks': {
          return orch.listRules().map((r) => ({
            id: r.id,
            pattern: r.pattern,
            agent: r.agent,
            priority: r.priority,
          }));
        }
        case 'get_status': {
          const id = asString(args.id, 'id');
          if (!fullOrch) {
            return { id, state: 'unknown', note: 'history unavailable' };
          }
          const rows = await fullOrch.getHistory().list({ limit: 1000 });
          const row = rows.find((r: { id: string }) => r.id === id);
          return row
            ? { id, state: row.state, attempts: row.attempts }
            : { id, state: 'unknown' };
        }
        default:
          throw new McpError('E_UNKNOWN_TOOL', `Unknown tool: ${name}`);
      }
    },
  };
}
