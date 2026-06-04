import { z } from 'zod';

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

export const IntentSchema = z.enum(ALL_INTENTS);

export const IntentMappingSchema = z.object({
  intent: IntentSchema,
  version: z.string().min(1),
  status: z.enum(['active', 'deprecated', 'experimental', 'legacy']),
  skills: z.array(z.string()).min(1),
  agents: z.array(z.string()).min(1),
  workflows: z.array(z.string()).min(1),
  reviewers: z.array(z.string()).min(1),
});

export type IntentMapping = z.infer<typeof IntentMappingSchema>;
