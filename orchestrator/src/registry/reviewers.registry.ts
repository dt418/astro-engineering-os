import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEntities, type ParsedEntity } from './markdown-loader.js';
import { RegistryLoadError, RegistryValidationError } from './errors.js';
import { parseTags, type Reviewer } from './types.js';

export interface ReviewersRegistry {
  readonly size: number;
  list(): readonly Reviewer[];
  get(id: string): Reviewer | undefined;
  byTag(tag: string): readonly Reviewer[];
}

const REQUIRED_FIELDS = ['version', 'status', 'purpose'] as const;

function toReviewer(parsed: ParsedEntity): Reviewer {
  const fields = parsed.fields;
  for (const key of REQUIRED_FIELDS) {
    if (!fields[key]) {
      throw new RegistryValidationError('reviewers', [`${parsed.id}: missing required field "${key}"`]);
    }
  }
  return {
    id: parsed.id,
    version: fields.version!,
    status: fields.status! as Reviewer['status'],
    purpose: fields.purpose!,
    tags: parseTags(fields.tags),
  };
}

export async function loadReviewersRegistry(opts?: {
  basePath?: string;
  filePath?: string;
}): Promise<ReviewersRegistry> {
  const filePath = opts?.filePath ?? resolve(opts?.basePath ?? 'orchestrator', 'catalog/reviewers.md');
  let md: string;
  try {
    md = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new RegistryLoadError(filePath, err);
  }
  const parsed = parseEntities(md, 'reviewer');
  const seen = new Map<string, number>();
  const issues: string[] = [];
  parsed.forEach((p, i) => {
    if (seen.has(p.id)) {
      issues.push(`duplicate id "${p.id}" at position ${i}`);
    } else {
      seen.set(p.id, i);
    }
  });
  if (issues.length > 0) throw new RegistryValidationError('reviewers', issues);

  const reviewers = parsed.map(toReviewer);
  const byId = new Map(reviewers.map(r => [r.id, r]));

  return {
    size: reviewers.length,
    list: () => reviewers,
    get: (id) => byId.get(id),
    byTag: (tag) => reviewers.filter(r => r.tags.includes(tag)),
  };
}
