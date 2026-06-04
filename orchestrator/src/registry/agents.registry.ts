import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEntities, type ParsedEntity } from './markdown-loader.js';
import { RegistryLoadError, RegistryValidationError } from './errors.js';
import { parseTags, type Agent } from './types.js';

export interface AgentsRegistry {
  readonly size: number;
  list(): readonly Agent[];
  get(id: string): Agent | undefined;
  byTag(tag: string): readonly Agent[];
}

const REQUIRED_FIELDS = ['version', 'status', 'purpose'] as const;

function toAgent(parsed: ParsedEntity): Agent {
  const fields = parsed.fields;
  for (const key of REQUIRED_FIELDS) {
    if (!fields[key]) {
      throw new RegistryValidationError('agents', [`${parsed.id}: missing required field "${key}"`]);
    }
  }
  return {
    id: parsed.id,
    version: fields.version!,
    status: fields.status! as Agent['status'],
    purpose: fields.purpose!,
    tags: parseTags(fields.tags),
  };
}

export async function loadAgentsRegistry(opts?: {
  basePath?: string;
  filePath?: string;
}): Promise<AgentsRegistry> {
  const filePath = opts?.filePath ?? resolve(opts?.basePath ?? 'orchestrator', 'catalog/agents.md');
  let md: string;
  try {
    md = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new RegistryLoadError(filePath, err);
  }
  const parsed = parseEntities(md, 'agent');
  const seen = new Map<string, number>();
  const issues: string[] = [];
  parsed.forEach((p, i) => {
    if (seen.has(p.id)) {
      issues.push(`duplicate id "${p.id}" at position ${i} (first at ${seen.get(p.id)})`);
    } else {
      seen.set(p.id, i);
    }
  });
  if (issues.length > 0) throw new RegistryValidationError('agents', issues);

  const agents = parsed.map(toAgent);
  const byId = new Map(agents.map(a => [a.id, a]));

  return {
    size: agents.length,
    list: () => agents,
    get: (id) => byId.get(id),
    byTag: (tag) => agents.filter(a => a.tags.includes(tag)),
  };
}
