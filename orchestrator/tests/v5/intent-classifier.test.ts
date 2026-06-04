import { describe, it, expect } from 'vitest';
import { createIntentClassifier, DEFAULT_CLASSIFIER_RULES } from '../../src/runtime/intent-classifier.js';

const classifier = createIntentClassifier();

describe('IntentClassifier', () => {
  it('classifies blog input with high confidence', () => {
    const result = classifier.classify('Create an Astro blog with RSS feed');
    expect(result.intent).toBe('blog');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals).toContain('blog');
    expect(result.signals).toContain('rss');
  });

  it('classifies docs input', () => {
    const result = classifier.classify('Write a documentation site with sidebar and search');
    expect(result.intent).toBe('docs');
    expect(result.signals.some(s => ['docs', 'documentation', 'search'].includes(s))).toBe(true);
  });

  it('classifies saas input', () => {
    const result = classifier.classify('Build a SaaS app with subscription and pricing');
    expect(result.intent).toBe('saas');
  });

  it('classifies ecommerce input', () => {
    const result = classifier.classify('Add product pages and a shopping cart');
    expect(result.intent).toBe('ecommerce');
  });

  it('classifies architecture input', () => {
    const result = classifier.classify('Design a system architecture and write ADRs');
    expect(result.intent).toBe('architecture');
  });

  it('classifies refactor input', () => {
    const result = classifier.classify('Refactor the auth module to clean up legacy code');
    expect(result.intent).toBe('refactor');
  });

  it('classifies migration input', () => {
    const result = classifier.classify('Migrate the database from MySQL to Postgres');
    expect(result.intent).toBe('migration');
  });

  it('falls back to unknown with zero confidence for ambiguous input', () => {
    const result = classifier.classify('asdfghjkl qwertyuiop');
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.signals).toEqual([]);
  });

  it('accepts custom rules', () => {
    const custom = createIntentClassifier({
      rules: [
        { intent: 'blog', keywords: ['newsletter'], weight: 2 },
        ...DEFAULT_CLASSIFIER_RULES,
      ],
    });
    const result = custom.classify('Build a newsletter');
    expect(result.intent).toBe('blog');
  });
});
