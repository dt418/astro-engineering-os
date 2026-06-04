import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAgentsRegistry } from '../../src/registry/agents.registry.js';
import { RegistryLoadError, RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../..');

describe('AgentsRegistry', () => {
  it('loads agents from catalog/agents.md', async () => {
    const registry = await loadAgentsRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(4);
    expect(registry.get('architect')?.purpose).toContain('architecture');
  });

  it('throws RegistryValidationError on duplicate IDs with position context', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/agents-duplicate.md');
    await expect(loadAgentsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
    await expect(loadAgentsRegistry({ filePath: dupPath })).rejects.toThrow(/first at/);
  });

  it('throws RegistryValidationError when a required field is missing', async () => {
    const path = resolve(__dirname, '../../fixtures/v5/catalog/agents-missing-field.md');
    await expect(loadAgentsRegistry({ filePath: path })).rejects.toThrow(RegistryValidationError);
    await expect(loadAgentsRegistry({ filePath: path })).rejects.toThrow(/missing required field "purpose"/);
  });

  it('throws RegistryLoadError when the catalog file does not exist', async () => {
    const missing = resolve(__dirname, '../../fixtures/v5/catalog/__does_not_exist__.md');
    await expect(loadAgentsRegistry({ filePath: missing })).rejects.toThrow(RegistryLoadError);
  });
});
