import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEntities, type ParsedEntity } from './markdown-loader.js';
import { RegistryLoadError, RegistryValidationError } from './errors.js';
import { parseTags, type Workflow } from './types.js';

export interface WorkflowsRegistry {
  readonly size: number;
  list(): readonly Workflow[];
  get(id: string): Workflow | undefined;
  byTag(tag: string): readonly Workflow[];
}

const REQUIRED_FIELDS = ['version', 'status', 'purpose'] as const;

function toWorkflow(parsed: ParsedEntity): Workflow {
  const fields = parsed.fields;
  for (const key of REQUIRED_FIELDS) {
    if (!fields[key]) {
      throw new RegistryValidationError('workflows', [`${parsed.id}: missing required field "${key}"`]);
    }
  }
  return {
    id: parsed.id,
    version: fields.version!,
    status: fields.status! as Workflow['status'],
    purpose: fields.purpose!,
    tags: parseTags(fields.tags),
  };
}

export async function loadWorkflowsRegistry(opts?: {
  basePath?: string;
  filePath?: string;
}): Promise<WorkflowsRegistry> {
  const filePath = opts?.filePath ?? resolve(opts?.basePath ?? 'orchestrator', 'catalog/workflows.md');
  let md: string;
  try {
    md = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new RegistryLoadError(filePath, err);
  }
  const parsed = parseEntities(md, 'workflow');
  const seen = new Map<string, number>();
  const issues: string[] = [];
  parsed.forEach((p, i) => {
    if (seen.has(p.id)) {
      issues.push(`duplicate id "${p.id}" at position ${i}`);
    } else {
      seen.set(p.id, i);
    }
  });
  if (issues.length > 0) throw new RegistryValidationError('workflows', issues);

  const workflows = parsed.map(toWorkflow);
  const byId = new Map(workflows.map(w => [w.id, w]));

  return {
    size: workflows.length,
    list: () => workflows,
    get: (id) => byId.get(id),
    byTag: (tag) => workflows.filter(w => w.tags.includes(tag)),
  };
}
