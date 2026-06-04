import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRules, matchRule } from '../src/engine.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('engine', () => {
  it('parses rules from markdown', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    expect(rules).toHaveLength(3);
    expect(rules[0]!.id).toBe('implement-*');
    expect(rules[0]!.agent).toBe('implementer');
  });

  it('matches implement-* to implement-auth', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    const matched = matchRule(rules, 'implement-auth');
    expect(matched?.agent).toBe('implementer');
  });

  it('returns null for unmatched task', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    const matched = matchRule(rules, 'unknown-task');
    expect(matched).toBeNull();
  });

  it('preserves config in parsed rules', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    expect(rules[0]!.config?.maxRetries).toBe(2);
  });
});
