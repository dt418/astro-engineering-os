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
});
