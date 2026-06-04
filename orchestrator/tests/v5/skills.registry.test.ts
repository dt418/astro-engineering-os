import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSkillsRegistry } from '../../src/registry/skills.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../..');

describe('SkillsRegistry', () => {
  it('loads skills from catalog/skills.md', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });

    expect(registry.size).toBeGreaterThan(0);
    const blog = registry.get('astro-blog');
    expect(blog).toBeDefined();
    expect(blog!.version).toBe('1.0.0');
    expect(blog!.status).toBe('active');
    expect(blog!.tags).toContain('blog');
  });

  it('exposes readonly list()', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });
    const list = registry.list();
    expect(list.length).toBe(registry.size);
  });

  it('queries by tag', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });
    const blogSkills = registry.byTag('blog');
    expect(blogSkills.every(s => s.tags.includes('blog'))).toBe(true);
  });

  it('queries by status', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });
    const active = registry.byStatus('active');
    expect(active.every(s => s.status === 'active')).toBe(true);
  });

  it('throws RegistryValidationError on duplicate IDs', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/skills-duplicate.md');
    await expect(loadSkillsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });
});
