import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadReviewersRegistry } from '../../src/registry/reviewers.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

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
});
