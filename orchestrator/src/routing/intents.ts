import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEntities, type ParsedEntity } from '../registry/markdown-loader.js';
import { RegistryLoadError, RegistryValidationError } from '../registry/errors.js';
import { ALL_INTENTS, type Intent, type IntentMapping } from './types.js';

export interface IntentsRegistry {
  readonly size: number;
  list(): readonly IntentMapping[];
  resolve(intent: Intent): IntentMapping | undefined;
}

const REQUIRED_FIELDS = ['skills', 'agents', 'workflows', 'reviewers'] as const;
const VALID_INTENTS = new Set<string>(ALL_INTENTS);

function parseList(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function toMapping(parsed: ParsedEntity): IntentMapping {
  const fields = parsed.fields;
  if (!VALID_INTENTS.has(parsed.id)) {
    throw new RegistryValidationError('intents', [`unknown intent "${parsed.id}"`]);
  }
  for (const key of REQUIRED_FIELDS) {
    if (!fields[key]) {
      throw new RegistryValidationError('intents', [`${parsed.id}: missing required field "${key}"`]);
    }
  }
  return {
    intent: parsed.id as Intent,
    version: fields.version ?? '0.0.0',
    status: (fields.status as IntentMapping['status']) ?? 'active',
    skills: parseList(fields.skills),
    agents: parseList(fields.agents),
    workflows: parseList(fields.workflows),
    reviewers: parseList(fields.reviewers),
  };
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
