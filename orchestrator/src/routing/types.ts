export const ALL_INTENTS = [
  'blog',
  'docs',
  'saas',
  'ecommerce',
  'architecture',
  'refactor',
  'migration',
  'unknown',
] as const;

export type Intent = (typeof ALL_INTENTS)[number];

export interface IntentMapping {
  intent: Intent;
  version: string;
  status: 'active' | 'deprecated' | 'experimental' | 'legacy';
  skills: readonly string[];
  agents: readonly string[];
  workflows: readonly string[];
  reviewers: readonly string[];
}
