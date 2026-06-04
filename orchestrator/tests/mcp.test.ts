import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { createMcpServer } from '../src/mcp/server.js';
import { createOrchestrator } from '../src/index.js';

const RULES_PATH = join(import.meta.dirname, '..', 'fixtures', 'astro-orchestrator.md');

describe('MCP server', () => {
  it('exposes orchestrator tools', () => {
    const server = createMcpServer();
    const tools = server.listTools();
    expect(tools).toContain('run_task');
    expect(tools).toContain('list_tasks');
    expect(tools).toContain('get_status');
  });

  it('runs a task and returns result', async () => {
    const orch = createOrchestrator({ rulesPath: RULES_PATH });
    const server = createMcpServer(orch);
    const result = await server.call('run_task', { task: 'implement-do-thing' });
    expect(result).toBeDefined();
  });
});
