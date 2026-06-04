import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadWorkflowsRegistry } from '../../src/registry/workflows.registry.js';
import { RegistryLoadError, RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../..');

describe('WorkflowsRegistry', () => {
  it('loads workflows from catalog/workflows.md', async () => {
    const registry = await loadWorkflowsRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(5);
    expect(registry.get('feature-development')?.purpose).toContain('feature');
  });

  it('throws RegistryValidationError on duplicate IDs with position context', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/workflows-duplicate.md');
    await expect(loadWorkflowsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
    await expect(loadWorkflowsRegistry({ filePath: dupPath })).rejects.toThrow(/first at/);
  });

  it('throws RegistryValidationError when a required field is missing', async () => {
    const path = resolve(__dirname, '../../fixtures/v5/catalog/workflows-missing-field.md');
    await expect(loadWorkflowsRegistry({ filePath: path })).rejects.toThrow(RegistryValidationError);
    await expect(loadWorkflowsRegistry({ filePath: path })).rejects.toThrow(/missing required field "purpose"/);
  });

  it('throws RegistryLoadError when the catalog file does not exist', async () => {
    const missing = resolve(__dirname, '../../fixtures/v5/catalog/__does_not_exist__.md');
    await expect(loadWorkflowsRegistry({ filePath: missing })).rejects.toThrow(RegistryLoadError);
  });
});
