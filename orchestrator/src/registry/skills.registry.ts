import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEntities, type ParsedEntity } from './markdown-loader.js';
import { RegistryLoadError, RegistryValidationError } from './errors.js';
import { parseTags, type Skill } from './types.js';

export interface SkillsRegistry {
  readonly size: number;
  list(): readonly Skill[];
  get(id: string): Skill | undefined;
  byTag(tag: string): readonly Skill[];
  byStatus(status: Skill['status']): readonly Skill[];
}

const REQUIRED_FIELDS = ['version', 'status', 'purpose'] as const;

function toSkill(parsed: ParsedEntity): Skill {
  const fields = parsed.fields;
  for (const key of REQUIRED_FIELDS) {
    if (!fields[key]) {
      throw new RegistryValidationError('skills', [`${parsed.id}: missing required field "${key}"`]);
    }
  }
  return {
    id: parsed.id,
    version: fields.version!,
    status: fields.status! as Skill['status'],
    purpose: fields.purpose!,
    tags: parseTags(fields.tags),
  };
}

export async function loadSkillsRegistry(opts?: {
  basePath?: string;
  filePath?: string;
}): Promise<SkillsRegistry> {
  const filePath = opts?.filePath ?? resolve(opts?.basePath ?? 'orchestrator', 'catalog/skills.md');
  let md: string;
  try {
    md = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new RegistryLoadError(filePath, err);
  }
  const parsed = parseEntities(md, 'skill');
  const seen = new Map<string, number>();
  const issues: string[] = [];
  parsed.forEach((p, i) => {
    if (seen.has(p.id)) {
      issues.push(`duplicate id "${p.id}" at position ${i} (first at ${seen.get(p.id)})`);
    } else {
      seen.set(p.id, i);
    }
  });
  if (issues.length > 0) throw new RegistryValidationError('skills', issues);

  const skills = parsed.map(toSkill);
  const byId = new Map(skills.map(s => [s.id, s]));

  return {
    size: skills.length,
    list: () => skills,
    get: (id) => byId.get(id),
    byTag: (tag) => skills.filter(s => s.tags.includes(tag)),
    byStatus: (status) => skills.filter(s => s.status === status),
  };
}
