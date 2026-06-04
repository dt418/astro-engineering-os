import type { Intent } from '../routing/types.js';
import type { Classification, IntentClassifierRule } from './types.js';

export const DEFAULT_CLASSIFIER_RULES: readonly IntentClassifierRule[] = [
  { intent: 'blog', keywords: ['blog', 'post', 'article', 'rss', 'content', 'newsletter', 'mdx'] },
  { intent: 'docs', keywords: ['docs', 'documentation', 'guide', 'tutorial', 'reference', 'sidebar'] },
  { intent: 'saas', keywords: ['saas', 'subscription', 'pricing', 'plan', 'billing', 'dashboard', 'auth'] },
  { intent: 'ecommerce', keywords: ['shop', 'product', 'cart', 'checkout', 'payment', 'store', 'order'] },
  { intent: 'architecture', keywords: ['architecture', 'design', 'adr', 'system', 'rfc', 'blueprint'] },
  { intent: 'refactor', keywords: ['refactor', 'cleanup', 'restructure', 'rename', 'simplify', 'legacy'] },
  { intent: 'migration', keywords: ['migrate', 'move', 'transition', 'upgrade', 'import', 'convert', 'port'] },
];

export interface IntentClassifier {
  classify(input: string): Classification;
}

export interface ClassifierOptions {
  rules?: readonly IntentClassifierRule[];
}

function tokenize(input: string): readonly string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function createIntentClassifier(opts: ClassifierOptions = {}): IntentClassifier {
  const rules = opts.rules ?? DEFAULT_CLASSIFIER_RULES;

  return {
    classify(input: string): Classification {
      const tokens = tokenize(input);
      const matches: Array<{ rule: IntentClassifierRule; signals: string[]; weight: number }> = [];

      for (const rule of rules) {
        const signals: string[] = [];
        for (const keyword of rule.keywords) {
          const kl = keyword.toLowerCase();
          if (tokens.includes(kl)) {
            signals.push(keyword);
          }
        }
        if (signals.length > 0) {
          const weight = rule.weight ?? 1;
          matches.push({ rule, signals, weight: signals.length * weight });
        }
      }

      if (matches.length === 0) {
        return { intent: 'unknown' as Intent, confidence: 0, signals: [] };
      }

      matches.sort((a, b) => b.weight - a.weight);
      const best = matches[0]!;
      const totalWeight = matches.reduce((s, m) => s + m.weight, 0);
      const confidence = totalWeight > 0 ? best.weight / totalWeight : 0;

      return {
        intent: best.rule.intent,
        confidence: Math.min(1, confidence),
        signals: best.signals,
      };
    },
  };
}
