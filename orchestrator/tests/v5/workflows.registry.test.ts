import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadWorkflowsRegistry } from '../../src/registry/workflows.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

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
});
