import type { Orchestrator } from '../index.js';
import { createOrchestrator } from '../index.js';
import { createBuiltinAgents } from '../agents/builtin.js';
import { createExecutor } from '../executor.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServer {
  listTools(): string[];
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export function createMcpServer(orchestrator?: Orchestrator): McpServer {
  const orch = orchestrator ?? createOrchestrator();
  const agents = createBuiltinAgents();

  const tools: McpTool[] = [
    {
      name: 'run_task',
      description: 'Run a task through the orchestrator',
      inputSchema: {
        type: 'object',
        properties: { task: { type: 'string' } },
        required: ['task'],
      },
    },
    {
      name: 'list_tasks',
      description: 'List routing rules',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_status',
      description: 'Get status of a task',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  ];

  return {
    listTools() {
      return tools.map((t) => t.name);
    },
    async call(name, args) {
      switch (name) {
        case 'run_task': {
          const task = args.task as string;
          const node = await orch.run(task);
          const exec = createExecutor({ agents, concurrency: 1 });
          const [result] = await exec.execute([node]);
          return result;
        }
        case 'list_tasks':
          return orch.listRules();
        case 'get_status':
          return { id: args.id, state: 'pending' };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    },
  };
}
