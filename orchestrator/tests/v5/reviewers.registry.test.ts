import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadReviewersRegistry } from '../../src/registry/reviewers.registry.js';
import { RegistryLoadError, RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../..');

describe('ReviewersRegistry', () => {
  it('loads reviewers from catalog/reviewers.md', async () => {
    const registry = await loadReviewersRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(5);
    expect(registry.get('code-reviewer')?.purpose).toContain('pull requests');
  });

  it('throws RegistryValidationError on duplicate IDs with position context', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/reviewers-duplicate.md');
    await expect(loadReviewersRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
    await expect(loadReviewersRegistry({ filePath: dupPath })).rejects.toThrow(/first at/);
  });

  it('throws RegistryValidationError when a required field is missing', async () => {
    const path = resolve(__dirname, '../../fixtures/v5/catalog/reviewers-missing-field.md');
    await expect(loadReviewersRegistry({ filePath: path })).rejects.toThrow(RegistryValidationError);
    await expect(loadReviewersRegistry({ filePath: path })).rejects.toThrow(/missing required field "purpose"/);
  });

  it('throws RegistryLoadError when the catalog file does not exist', async () => {
    const missing = resolve(__dirname, '../../fixtures/v5/catalog/__does_not_exist__.md');
    await expect(loadReviewersRegistry({ filePath: missing })).rejects.toThrow(RegistryLoadError);
  });
});
