import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSkillsRegistry } from '../../src/registry/skills.registry.js';
import { RegistryLoadError, RegistryValidationError } from '../../src/registry/errors.js';

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

  it('throws RegistryValidationError on duplicate IDs with position context', async () => {
    const dupPath = resolve(__dirname, '../../fixtures/v5/catalog/skills-duplicate.md');
    await expect(loadSkillsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
    await expect(loadSkillsRegistry({ filePath: dupPath })).rejects.toThrow(/first at/);
  });

  it('throws RegistryValidationError when a required field is missing', async () => {
    const path = resolve(__dirname, '../../fixtures/v5/catalog/skills-missing-field.md');
    await expect(loadSkillsRegistry({ filePath: path })).rejects.toThrow(RegistryValidationError);
    await expect(loadSkillsRegistry({ filePath: path })).rejects.toThrow(/missing required field "purpose"/);
  });

  it('throws RegistryValidationError when status field is missing', async () => {
    const path = resolve(__dirname, '../../fixtures/v5/catalog/skills-missing-status.md');
    await expect(loadSkillsRegistry({ filePath: path })).rejects.toThrow(RegistryValidationError);
    await expect(loadSkillsRegistry({ filePath: path })).rejects.toThrow(/missing required field "status"/);
  });

  it('throws RegistryLoadError when the catalog file does not exist', async () => {
    const missing = resolve(__dirname, '../../fixtures/v5/catalog/__does_not_exist__.md');
    await expect(loadSkillsRegistry({ filePath: missing })).rejects.toThrow(RegistryLoadError);
  });
});
