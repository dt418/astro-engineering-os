import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadIntentsRegistry } from '../../src/routing/intents.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const BASE = resolve(__dirname, '../..');

describe('IntentsRegistry', () => {
  it('loads 8 intents from routing/intents.md', async () => {
    const registry = await loadIntentsRegistry({ basePath: BASE });
    expect(registry.size).toBe(8);
    expect(registry.list().map(i => i.intent)).toEqual([
      'blog', 'docs', 'saas', 'ecommerce',
      'architecture', 'refactor', 'migration', 'unknown',
    ]);
  });

  it('resolves a single intent to its mapping', async () => {
    const registry = await loadIntentsRegistry({ basePath: BASE });
    const blog = registry.resolve('blog');
    expect(blog).toBeDefined();
    expect(blog!.skills).toEqual(['astro-blog', 'astro-core']);
    expect(blog!.agents).toContain('implementer');
    expect(blog!.workflows).toContain('feature-development');
    expect(blog!.reviewers).toContain('blog-reviewer');
  });

  it('returns undefined for unresolvable intents', async () => {
    const registry = await loadIntentsRegistry({ basePath: BASE });
    expect(registry.resolve('nonexistent')).toBeUndefined();
  });

  it('throws RegistryValidationError on duplicate intent IDs', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/routing/intents-duplicate.md');
    await expect(loadIntentsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });

  it('throws RegistryValidationError on missing required field', async () => {
    const malPath = resolve(__dirname, '../../fixtures/v5/routing/intents-missing-field.md');
    await expect(loadIntentsRegistry({ filePath: malPath })).rejects.toThrow(RegistryValidationError);
  });
});
