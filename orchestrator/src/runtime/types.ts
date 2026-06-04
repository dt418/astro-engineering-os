import { z } from 'zod';
import type { Intent } from '../routing/types.js';

export const ClassificationSchema = z.object({
  intent: z.custom<Intent>(),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string()),
});

export type Classification = z.infer<typeof ClassificationSchema>;

export const IntentClassifierRuleSchema = z.object({
  intent: z.enum(['blog', 'docs', 'saas', 'ecommerce', 'architecture', 'refactor', 'migration']),
  keywords: z.array(z.string()).min(1),
  weight: z.number().positive().optional(),
});

export type IntentClassifierRule = z.infer<typeof IntentClassifierRuleSchema>;
