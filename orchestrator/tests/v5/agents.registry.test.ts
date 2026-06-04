import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAgentsRegistry } from '../../src/registry/agents.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../..');

describe('AgentsRegistry', () => {
  it('loads agents from catalog/agents.md', async () => {
    const registry = await loadAgentsRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(6);
    expect(registry.get('architect')?.purpose).toContain('architecture');
    expect(registry.get('architecture-reviewer')).toBeDefined();
    expect(registry.get('code-reviewer')).toBeDefined();
  });

  it('throws RegistryValidationError on duplicate IDs with position context', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/agents-duplicate.md');
    await expect(loadAgentsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
    await expect(loadAgentsRegistry({ filePath: dupPath })).rejects.toThrow(/first at/);
  });

  it('lists all agents', async () => {
    const registry = await loadAgentsRegistry({ basePath: CATALOG });
    const agents = registry.list();
    expect(agents).toHaveLength(6);
  });

  it('gets agent by id', async () => {
    const registry = await loadAgentsRegistry({ basePath: CATALOG });
    const agent = registry.get('implementer');
    expect(agent).toBeDefined();
    expect(agent!.purpose).toContain('production code');
  });
});
