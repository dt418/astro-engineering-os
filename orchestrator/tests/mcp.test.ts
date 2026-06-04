import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMcpServer, McpError } from '../src/mcp/server.js';
import { createOrchestratorAsync } from '../src/index.js';

const RULES_PATH = join(import.meta.dirname, '..', 'fixtures', 'astro-orchestrator.md');
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'orch-mcp-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('MCP server', () => {
  it('exposes three tools with descriptions', async () => {
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    const server = await createMcpServer({ orchestrator: orch });
    const tools = server.listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining(['run_task', 'list_tasks', 'get_status']),
    );
    for (const t of tools) {
      expect(t.description).toBeTruthy();
    }
    await orch.close();
  });

  it('returns serverInfo with name and version', async () => {
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    const server = await createMcpServer({ orchestrator: orch });
    const info = server.serverInfo();
    expect(info.name).toBe('astro-orchestrator');
    expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
    await orch.close();
  });

  it('runs a task through the orchestrator and records history', async () => {
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    const server = await createMcpServer({ orchestrator: orch });
    const result = (await server.call('run_task', {
      task: 'implement-do-thing',
    })) as { id: string; state: string };
    expect(result.state).toBe('completed');
    const status = (await server.call('get_status', { id: result.id })) as {
      state: string;
    };
    expect(status.state).toBe('completed');
    await orch.close();
  });

  it('list_tasks returns public shape (no config)', async () => {
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    const server = await createMcpServer({ orchestrator: orch });
    const rules = (await server.call('list_tasks', {})) as Array<
      Record<string, unknown>
    >;
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r).not.toHaveProperty('config');
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('pattern');
    }
    await orch.close();
  });

  it('throws McpError on empty task input', async () => {
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    const server = await createMcpServer({ orchestrator: orch });
    await expect(server.call('run_task', { task: '' })).rejects.toBeInstanceOf(
      McpError,
    );
    await orch.close();
  });

  it('get_status returns unknown for id never seen', async () => {
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: RULES_PATH,
    });
    const server = await createMcpServer({ orchestrator: orch });
    const status = (await server.call('get_status', {
      id: 'nonexistent-id',
    })) as { state: string };
    expect(status.state).toBe('unknown');
    await orch.close();
  });
});
