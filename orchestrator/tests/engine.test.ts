import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRules, matchRule } from '../src/engine.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');
const MD = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');

describe('engine', () => {
  it('parses rules from markdown', () => {
    const rules = parseRules(MD);
    expect(rules).toHaveLength(3);
    expect(rules[0]!.id).toBe('implement-*');
    expect(rules[0]!.pattern).toBe('implement-*');
    expect(rules[0]!.agent).toBe('implementer');
    expect(rules[0]!.priority).toBe(10);
    expect(rules[1]!.pattern).toBe('review-*');
    expect(rules[1]!.agent).toBe('reviewer');
    expect(rules[1]!.priority).toBe(20);
    expect(rules[1]!.config).toBeUndefined();
    expect(rules[2]!.priority).toBe(5);
  });

  it('matches implement-* to implement-auth', () => {
    const rules = parseRules(MD);
    const matched = matchRule(rules, 'implement-auth');
    expect(matched?.agent).toBe('implementer');
  });

  it('returns null for unmatched task', () => {
    const rules = parseRules(MD);
    const matched = matchRule(rules, 'unknown-task');
    expect(matched).toBeNull();
  });

  it('preserves config in parsed rules', () => {
    const rules = parseRules(MD);
    expect(rules[0]!.config?.maxRetries).toBe(2);
  });
});
