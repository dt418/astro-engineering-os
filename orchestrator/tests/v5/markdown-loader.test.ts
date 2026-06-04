import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEntities } from '../../src/registry/markdown-loader.js';

const FIXTURES = resolve(__dirname, '../../fixtures/v5/loader');

describe('parseEntities', () => {
  it('parses a single-entity markdown block', () => {
    const md = readFileSync(`${FIXTURES}/valid/single-entity.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toEqual([
      {
        id: 'astro-blog',
        fields: {
          version: '1.0.0',
          status: 'active',
          purpose: 'Build a content-first blog with RSS support.',
        },
      },
    ]);
  });

  it('parses multiple entities of the same type', () => {
    const md = readFileSync(`${FIXTURES}/valid/multiple-entities.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).toEqual(['astro-blog', 'astro-docs', 'astro-saas']);
    expect(result[0]!.fields.status).toBe('active');
    expect(result[2]!.fields.status).toBe('experimental');
  });

  it('supports multi-line field values via indentation', () => {
    const md = readFileSync(`${FIXTURES}/valid/multi-line.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toHaveLength(1);
    expect(result[0]!.fields.purpose).toBe(
      'Build a content-first blog.\nSupports RSS, MDX, and content collections.\nOptimized for SEO and Core Web Vitals.'
    );
  });
});
