import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { parseEntities, type ParsedEntity } from '../registry/markdown-loader.js';
import { RegistryLoadError, RegistryValidationError } from '../registry/errors.js';
import { IntentSchema, IntentMappingSchema, type Intent, type IntentMapping } from './types.js';

export interface IntentsRegistry {
  readonly size: number;
  list(): readonly IntentMapping[];
  resolve(intent: Intent): IntentMapping | undefined;
}

function parseList(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function toMapping(parsed: ParsedEntity): IntentMapping {
  const fields = parsed.fields;

  const parsedIntent = IntentSchema.safeParse(parsed.id);
  if (!parsedIntent.success) {
    throw new RegistryValidationError('intents', [`unknown intent "${parsed.id}"`]);
  }

  const rawMapping = {
    intent: parsed.id,
    version: fields.version ?? '0.0.0',
    status: fields.status ?? 'active',
    skills: parseList(fields.skills),
    agents: parseList(fields.agents),
    workflows: parseList(fields.workflows),
    reviewers: parseList(fields.reviewers),
  };

  const result = IntentMappingSchema.safeParse(rawMapping);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${parsed.id}: ${e.message}`);
    throw new RegistryValidationError('intents', errors);
  }

  return result.data;
}

export async function loadIntentsRegistry(opts?: {
  basePath?: string;
  filePath?: string;
}): Promise<IntentsRegistry> {
  const filePath = opts?.filePath ?? resolve(opts?.basePath ?? 'orchestrator', 'routing', 'intents.md');
  let md: string;
  try {
    md = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new RegistryLoadError(filePath, err);
  }
  const parsed = parseEntities(md, 'intent');
  const seen = new Map<string, number>();
  const issues: string[] = [];
  parsed.forEach((p, i) => {
    if (seen.has(p.id)) {
      issues.push(`duplicate intent "${p.id}" at position ${i}`);
    } else {
      seen.set(p.id, i);
    }
  });
  if (issues.length > 0) throw new RegistryValidationError('intents', issues);

  const mappings = parsed.map(toMapping);
  const byIntent = new Map(mappings.map(m => [m.intent, m]));

  return {
    size: mappings.length,
    list: () => mappings,
    resolve: (intent) => byIntent.get(intent),
  };
}
