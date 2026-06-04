import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAgentsRegistry } from '../../src/registry/agents.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../..');

describe('AgentsRegistry', () => {
  it('loads agents from catalog/agents.md', async () => {
    const registry = await loadAgentsRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(4);
    expect(registry.get('architect')?.purpose).toContain('architecture');
  });

  it('throws RegistryValidationError on duplicate IDs', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/agents-duplicate.md');
    await expect(loadAgentsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });
});
