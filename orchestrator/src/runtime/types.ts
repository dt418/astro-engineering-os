import type { Intent } from '../routing/types.js';

export interface Classification {
  intent: Intent;
  confidence: number;
  signals: readonly string[];
}

export interface IntentClassifierRule {
  intent: Exclude<Intent, 'unknown'>;
  keywords: readonly string[];
  weight?: number;
}
