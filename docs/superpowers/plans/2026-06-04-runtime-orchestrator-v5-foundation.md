# Runtime Orchestrator v5 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sub-Spec 1 of the runtime orchestrator v5 — discovery, classification, planning, and resolution of capabilities from markdown catalogs. No execution engine in this plan (deferred to Sub-Spec 2).

**Architecture:** Markdown is the single source of truth for capabilities, routing, and governance. TypeScript modules are thin loaders that parse markdown at startup and expose read-only registries. The `OrchestratorV5` class (DI constructor + factory) wires the registries, validates cross-references, and resolves `ExecutionPlan` objects from natural-language input.

**Tech Stack:** TypeScript 5.4, Vitest 1.6, Node 20.10+, ESM.

**Spec:** `docs/superpowers/specs/2026-06-04-runtime-orchestrator-v5-foundation-design.md`

**Guardrails (user-mandated, do not skip):**
1. **Markdown parser must be simple.** No DSL, no nested structures, no expressions. Just `## entity: <id>` headers and `- key: value` bullets.
2. **Registry validation is first-class.** Every registry validates on load (duplicate IDs throw). The factory validates cross-references at startup (missing references throw `RegistryValidationError`).
3. **Factory bootstrap integration test is the keystone.** It must drive the full path: load markdown → instantiate `OrchestratorV5` → classify input → resolve `ExecutionPlan`.

**Commit structure (7 commits, each buildable, testable, revertable):**
1. `feat(v5): introduce markdown loader`
2. `feat(v5): add catalog registries`
3. `feat(v5): add routing registry`
4. `feat(v5): implement intent classifier`
5. `feat(v5): implement orchestrator foundation`
6. `test(v5): add integration coverage`
7. `docs(v5): add runtime orchestrator documentation`

---

## Commit 1: feat(v5) — introduce markdown loader

**Goal:** A simple, pure parser that converts markdown text into a list of `ParsedEntity` objects. No I/O, no type-specific logic — just `## entity: <id>` headers and `key: value` lines.

**Files (create):**
- `orchestrator/src/registry/markdown-loader.ts`
- `orchestrator/tests/v5/markdown-loader.test.ts`
- `orchestrator/fixtures/v5/loader/valid/single-entity.md`
- `orchestrator/fixtures/v5/loader/valid/multiple-entities.md`
- `orchestrator/fixtures/v5/loader/valid/multi-line.md`
- `orchestrator/fixtures/v5/loader/valid/with-comments.md`
- `orchestrator/fixtures/v5/loader/invalid/malformed-header.md`
- `orchestrator/fixtures/v5/loader/invalid/duplicate-id.md`

**Parser design (per Guardrail 1 — keep simple):**
- Input: markdown string + entity type name (e.g. `"skill"`)
- Output: `ParsedEntity[]` with `{ id, fields: Record<string, string> }`
- Rules:
  - A block starts with a line matching `^## <entityType>: (.+)$`
  - Within a block, lines matching `^([a-z][a-z0-9_-]*):\s*(.*)$` are fields
  - Lines indented with 2+ spaces are appended to the previous field's value (multi-line)
  - Blank lines separate but don't terminate blocks
  - `<!-- ... -->` HTML comments are ignored (handy for editor annotations)
  - Unknown entity types (different `entityType` argument) are skipped silently
  - No nested structures, no lists, no expressions

---

### Task 1.1: Write failing test for parseEntities (happy path)

**Files:**
- Create: `orchestrator/tests/v5/markdown-loader.test.ts`
- Create: `orchestrator/fixtures/v5/loader/valid/single-entity.md`

- [ ] **Step 1: Create the single-entity fixture**

`orchestrator/fixtures/v5/loader/valid/single-entity.md`:
```md
## skill: astro-blog

version: 1.0.0
status: active
purpose: Build a content-first blog with RSS support.
```

- [ ] **Step 2: Write the failing test**

`orchestrator/tests/v5/markdown-loader.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEntities } from '../../src/registry/markdown-loader.js';

const FIXTURES = resolve(__dirname, '../../fixtures/v5/loader');

describe('parseEntities', () => {
  it('parses a single-entity markdown block', () => {
    const md = readFileSync(`${FIXTURES}/valid/single-entity.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toEqual([
      {
        id: 'astro-blog',
        fields: {
          version: '1.0.0',
          status: 'active',
          purpose: 'Build a content-first blog with RSS support.',
        },
      },
    ]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd orchestrator && npm test -- tests/v5/markdown-loader.test.ts`
Expected: FAIL with `parseEntities is not a function` (module doesn't exist)

- [ ] **Step 4: Implement minimal parser**

`orchestrator/src/registry/markdown-loader.ts`:
```ts
export interface ParsedEntity {
  id: string;
  fields: Record<string, string>;
}

export class MarkdownParseError extends Error {
  constructor(message: string, public readonly line: number) {
    super(`${message} (line ${line})`);
  }
}

const COMMENT_RE = /<!--[\s\S]*?-->/g;

export function parseEntities(md: string, entityType: string): ParsedEntity[] {
  const cleaned = md.replace(COMMENT_RE, '');
  const lines = cleaned.split('\n');
  const entities: ParsedEntity[] = [];
  const headerRe = new RegExp(`^##\\s+${entityType}:\\s+(.+)$`);
  const fieldRe = /^([a-z][a-z0-9_-]*):\s*(.*)$/;

  let current: ParsedEntity | null = null;
  let lastField: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const headerMatch = line.match(headerRe);
    if (headerMatch) {
      if (current) entities.push(current);
      current = { id: headerMatch[1]!.trim(), fields: {} };
      lastField = null;
      continue;
    }
    if (!current) continue;

    if (line.startsWith('  ')) {
      if (lastField) {
        current.fields[lastField] = (current.fields[lastField] ?? '') + '\n' + line.trim();
      }
      continue;
    }

    const fieldMatch = line.match(fieldRe);
    if (fieldMatch) {
      const key = fieldMatch[1]!;
      const value = fieldMatch[2] ?? '';
      current.fields[key] = value;
      lastField = key;
    } else if (line.trim() === '') {
      lastField = null;
    }
  }
  if (current) entities.push(current);
  return entities;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd orchestrator && npm test -- tests/v5/markdown-loader.test.ts`
Expected: PASS (1/1)

- [ ] **Step 6: Commit (interim)**

```bash
cd /home/thanh/astro-engineering-os
git add orchestrator/src/registry/markdown-loader.ts \
        orchestrator/tests/v5/markdown-loader.test.ts \
        orchestrator/fixtures/v5/loader/valid/single-entity.md
git commit -m "test(v5): markdown loader parses single-entity blocks"
```

---

### Task 1.2: Add multiple-entity test

**Files:**
- Create: `orchestrator/fixtures/v5/loader/valid/multiple-entities.md`

- [ ] **Step 1: Create fixture**

```md
## skill: astro-blog

version: 1.0.0
status: active
purpose: Content-first blog with RSS.

## skill: astro-docs

version: 1.0.0
status: active
purpose: Documentation site generator.

## skill: astro-saas

version: 1.0.0
status: experimental
purpose: SaaS landing page templates.
```

- [ ] **Step 2: Add test case**

Append to `orchestrator/tests/v5/markdown-loader.test.ts`:
```ts
  it('parses multiple entities of the same type', () => {
    const md = readFileSync(`${FIXTURES}/valid/multiple-entities.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).toEqual(['astro-blog', 'astro-docs', 'astro-saas']);
    expect(result[0]!.fields.status).toBe('active');
    expect(result[2]!.fields.status).toBe('experimental');
  });
```

- [ ] **Step 3: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/markdown-loader.test.ts`
Expected: PASS (2/2)

- [ ] **Step 4: Commit**

```bash
git add orchestrator/fixtures/v5/loader/valid/multiple-entities.md \
        orchestrator/tests/v5/markdown-loader.test.ts
git commit -m "test(v5): markdown loader handles multiple entities"
```

---

### Task 1.3: Add multi-line value test

**Files:**
- Create: `orchestrator/fixtures/v5/loader/valid/multi-line.md`

- [ ] **Step 1: Create fixture**

```md
## skill: astro-blog

version: 1.0.0
status: active
purpose: Build a content-first blog.
  Supports RSS, MDX, and content collections.
  Optimized for SEO and Core Web Vitals.
```

- [ ] **Step 2: Add test case**

```ts
  it('supports multi-line field values via indentation', () => {
    const md = readFileSync(`${FIXTURES}/valid/multi-line.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toHaveLength(1);
    expect(result[0]!.fields.purpose).toBe(
      'Build a content-first blog.\nSupports RSS, MDX, and content collections.\nOptimized for SEO and Core Web Vitals.'
    );
  });
```

- [ ] **Step 3: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/markdown-loader.test.ts`
Expected: PASS (3/3)

- [ ] **Step 4: Commit**

```bash
git add orchestrator/fixtures/v5/loader/valid/multi-line.md \
        orchestrator/tests/v5/markdown-loader.test.ts
git commit -m "test(v5): markdown loader supports multi-line values"
```

---

### Task 1.4: Add comment-stripping test

**Files:**
- Create: `orchestrator/fixtures/v5/loader/valid/with-comments.md`

- [ ] **Step 1: Create fixture**

```md
<!-- TODO: add more skills -->

## skill: astro-blog

version: 1.0.0
<!-- The default for new skills -->
status: active
purpose: Content-first blog.
```

- [ ] **Step 2: Add test case**

```ts
  it('strips HTML comments before parsing', () => {
    const md = readFileSync(`${FIXTURES}/valid/with-comments.md`, 'utf-8');
    const result = parseEntities(md, 'skill');

    expect(result).toHaveLength(1);
    expect(result[0]!.fields.status).toBe('active');
    expect(Object.keys(result[0]!.fields)).toEqual(['version', 'status', 'purpose']);
  });
```

- [ ] **Step 3: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/markdown-loader.test.ts`
Expected: PASS (4/4)

- [ ] **Step 4: Commit**

```bash
git add orchestrator/fixtures/v5/loader/valid/with-comments.md \
        orchestrator/tests/v5/markdown-loader.test.ts
git commit -m "test(v5): markdown loader strips HTML comments"
```

---

### Task 1.5: Add invalid markdown fixture and tests

**Files:**
- Create: `orchestrator/fixtures/v5/loader/invalid/malformed-header.md`
- Create: `orchestrator/fixtures/v5/loader/invalid/duplicate-id.md`

- [ ] **Step 1: Create fixtures**

`malformed-header.md`:
```md
# This is H1, not H2

skill: astro-blog
version: 1.0.0
```

`duplicate-id.md`:
```md
## skill: astro-blog

version: 1.0.0
status: active

## skill: astro-blog

version: 1.1.0
status: active
```

- [ ] **Step 2: Add test cases**

```ts
  it('returns empty array for markdown with no matching entity headers', () => {
    const md = readFileSync(`${FIXTURES}/invalid/malformed-header.md`, 'utf-8');
    const result = parseEntities(md, 'skill');
    expect(result).toEqual([]);
  });

  it('does not throw on duplicate ids (caller responsibility)', () => {
    const md = readFileSync(`${FIXTURES}/invalid/duplicate-id.md`, 'utf-8');
    const result = parseEntities(md, 'skill');
    // Parser is pure; duplicate-id detection is the registry's job (Commit 2).
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('astro-blog');
    expect(result[1]!.id).toBe('astro-blog');
  });
```

- [ ] **Step 3: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/markdown-loader.test.ts`
Expected: PASS (6/6)

- [ ] **Step 4: Commit (closes the markdown loader commit)**

```bash
git add orchestrator/fixtures/v5/loader/ \
        orchestrator/tests/v5/markdown-loader.test.ts
git commit -m "feat(v5): introduce markdown loader

Parses simple `## entity: <id>` blocks with key: value fields.
Multi-line values via 2+ space indent. HTML comments stripped.
Pure function, no I/O. Duplicate detection deferred to registries."
```

✅ **Commit 1 complete. Buildable, testable, revertable.**

---

## Commit 2: feat(v5) — add catalog registries

**Goal:** Four capability registries (skills, agents, workflows, reviewers), each backed by `catalog/<type>.md` markdown files. Each registry validates on load — duplicate IDs throw `RegistryValidationError`.

**Files (create):**
- `orchestrator/src/registry/types.ts` (shared types)
- `orchestrator/src/registry/skills.registry.ts`
- `orchestrator/src/registry/agents.registry.ts`
- `orchestrator/src/registry/workflows.registry.ts`
- `orchestrator/src/registry/reviewers.registry.ts`
- `orchestrator/src/registry/errors.ts`
- `orchestrator/catalog/skills.md`
- `orchestrator/catalog/agents.md`
- `orchestrator/catalog/workflows.md`
- `orchestrator/catalog/reviewers.md`
- `orchestrator/tests/v5/skills.registry.test.ts`
- `orchestrator/tests/v5/agents.registry.test.ts`
- `orchestrator/tests/v5/workflows.registry.test.ts`
- `orchestrator/tests/v5/reviewers.registry.test.ts`
- `orchestrator/fixtures/v5/catalog/{skills,agents,workflows,reviewers}-duplicate.md` (per-registry, validation fixtures)

---

### Task 2.1: Add shared error + types

**Files:**
- Create: `orchestrator/src/registry/errors.ts`
- Create: `orchestrator/src/registry/types.ts`

- [ ] **Step 1: Write the errors module**

`orchestrator/src/registry/errors.ts`:
```ts
export class RegistryValidationError extends Error {
  constructor(
    public readonly registry: string,
    public readonly issues: readonly string[],
  ) {
    super(`[${registry}] ${issues.length} validation issue(s):\n  - ${issues.join('\n  - ')}`);
  }
}

export class RegistryLoadError extends Error {
  constructor(
    public readonly path: string,
    public override readonly cause: unknown,
  ) {
    super(`Failed to load registry from ${path}: ${(cause as Error)?.message ?? cause}`);
  }
}
```

- [ ] **Step 2: Write shared types**

`orchestrator/src/registry/types.ts`:
```ts
export type EntityStatus = 'active' | 'deprecated' | 'experimental' | 'legacy';

export interface BaseEntity {
  id: string;
  version: string;
  status: EntityStatus;
  purpose: string;
  tags: readonly string[];
}

export interface Skill extends BaseEntity {}
export interface Agent extends BaseEntity {}
export interface Workflow extends BaseEntity {}
export interface Reviewer extends BaseEntity {}

export function parseTags(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}
```

- [ ] **Step 3: Commit shared infra**

```bash
git add orchestrator/src/registry/errors.ts \
        orchestrator/src/registry/types.ts
git commit -m "feat(v5): add shared registry errors and entity types"
```

---

### Task 2.2: Skills registry

**Files:**
- Create: `orchestrator/catalog/skills.md`
- Create: `orchestrator/src/registry/skills.registry.ts`
- Create: `orchestrator/tests/v5/skills.registry.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSkillsRegistry } from '../../src/registry/skills.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../../catalog');

describe('SkillsRegistry', () => {
  it('loads skills from catalog/skills.md', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });

    expect(registry.size).toBeGreaterThan(0);
    const blog = registry.get('astro-blog');
    expect(blog).toBeDefined();
    expect(blog!.version).toBe('1.0.0');
    expect(blog!.status).toBe('active');
    expect(blog!.tags).toContain('blog');
  });

  it('exposes readonly list()', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });
    const list = registry.list();
    expect(list.length).toBe(registry.size);
  });

  it('queries by tag', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });
    const blogSkills = registry.byTag('blog');
    expect(blogSkills.every(s => s.tags.includes('blog'))).toBe(true);
  });

  it('queries by status', async () => {
    const registry = await loadSkillsRegistry({ basePath: CATALOG });
    const active = registry.byStatus('active');
    expect(active.every(s => s.status === 'active')).toBe(true);
  });

  it('throws RegistryValidationError on duplicate IDs', async () => {
    const dupPath = resolve(__dirname, '../fixtures/v5/catalog/skills-duplicate.md');
    await expect(loadSkillsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npm test -- tests/v5/skills.registry.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Create the catalog file**

`orchestrator/catalog/skills.md`:
```md
## skill: astro-blog

version: 1.0.0
status: active
purpose: Build content-first blogs with RSS, MDX, and content collections.
tags: blog, content, rss, mdx

## skill: astro-docs

version: 1.0.0
status: active
purpose: Build documentation sites with sidebar navigation and search.
tags: docs, documentation, search

## skill: astro-saas

version: 1.0.0
status: active
purpose: Build SaaS landing pages with pricing, auth, and dashboard.
tags: saas, landing, pricing

## skill: astro-ecommerce

version: 1.0.0
status: active
purpose: Build ecommerce stores with cart, checkout, and product pages.
tags: ecommerce, shop, cart

## skill: astro-core

version: 1.0.0
status: active
purpose: Foundational Astro components and layouts used by all skills.
tags: core, base
```

- [ ] **Step 4: Create the validation fixture**

`orchestrator/fixtures/v5/catalog/skills-duplicate.md`:
```md
## skill: astro-blog

version: 1.0.0
status: active
purpose: First definition.

## skill: astro-blog

version: 1.1.0
status: active
purpose: Duplicate.
```

- [ ] **Step 5: Implement the registry**

`orchestrator/src/registry/skills.registry.ts`:
```ts
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
```

- [ ] **Step 6: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/skills.registry.test.ts`
Expected: PASS (5/5)

- [ ] **Step 7: Commit**

```bash
git add orchestrator/src/registry/skills.registry.ts \
        orchestrator/catalog/skills.md \
        orchestrator/tests/v5/skills.registry.test.ts \
        orchestrator/fixtures/v5/catalog/skills-duplicate.md
git commit -m "feat(v5): add skills registry with duplicate-id validation"
```

---

### Task 2.3: Agents registry (mirrors Task 2.2)

**Files:**
- Create: `orchestrator/catalog/agents.md`
- Create: `orchestrator/src/registry/agents.registry.ts`
- Create: `orchestrator/tests/v5/agents.registry.test.ts`
- Create: `orchestrator/fixtures/v5/catalog/agents-duplicate.md`

- [ ] **Step 1: Create catalog**

`orchestrator/catalog/agents.md`:
```md
## agent: architect

version: 1.0.0
status: active
purpose: Designs system architecture, makes trade-off decisions, writes ADRs.
tags: architecture, design, planning

## agent: implementer

version: 1.0.0
status: active
purpose: Writes production code, tests, and documentation.
tags: implementation, code, tests

## agent: reviewer

version: 1.0.0
status: active
purpose: Reviews code, ADRs, and pull requests for correctness and style.
tags: review, quality, approval

## agent: documentation

version: 1.0.0
status: active
purpose: Writes and maintains user-facing documentation, READMEs, and guides.
tags: docs, writing, content
```

- [ ] **Step 2: Create validation fixture**

`orchestrator/fixtures/v5/catalog/agents-duplicate.md`:
```md
## agent: architect

version: 1.0.0
status: active
purpose: First.

## agent: architect

version: 2.0.0
status: active
purpose: Duplicate.
```

- [ ] **Step 3: Write the failing test**

`orchestrator/tests/v5/agents.registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAgentsRegistry } from '../../src/registry/agents.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../../catalog');

describe('AgentsRegistry', () => {
  it('loads agents from catalog/agents.md', async () => {
    const registry = await loadAgentsRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(4);
    expect(registry.get('architect')?.purpose).toContain('architecture');
  });

  it('throws RegistryValidationError on duplicate IDs', async () => {
    const dupPath = resolve(__dirname, '../fixtures/v5/catalog/agents-duplicate.md');
    await expect(loadAgentsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });
});
```

- [ ] **Step 4: Implement registry**

`orchestrator/src/registry/agents.registry.ts`:
```ts
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
      issues.push(`duplicate id "${p.id}" at position ${i}`);
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
```

- [ ] **Step 5: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/agents.registry.test.ts`
Expected: PASS (2/2)

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/registry/agents.registry.ts \
        orchestrator/catalog/agents.md \
        orchestrator/tests/v5/agents.registry.test.ts \
        orchestrator/fixtures/v5/catalog/agents-duplicate.md
git commit -m "feat(v5): add agents registry with duplicate-id validation"
```

---

### Task 2.4: Workflows registry

**Files:**
- Create: `orchestrator/catalog/workflows.md`
- Create: `orchestrator/src/registry/workflows.registry.ts`
- Create: `orchestrator/tests/v5/workflows.registry.test.ts`
- Create: `orchestrator/fixtures/v5/catalog/workflows-duplicate.md`

- [ ] **Step 1: Create catalog**

`orchestrator/catalog/workflows.md`:
```md
## workflow: feature-development

version: 1.0.0
status: active
purpose: Design → implement → review → document a single feature end-to-end.
tags: feature, develop, ship

## workflow: architecture-review

version: 1.0.0
status: active
purpose: Review ADRs and system design changes against existing architecture.
tags: architecture, review, adr

## workflow: release

version: 1.0.0
status: active
purpose: Cut a release, update changelog, tag the version, deploy.
tags: release, deploy, version

## workflow: migration

version: 1.0.0
status: active
purpose: Move code, data, or dependencies from one version/platform to another.
tags: migration, upgrade, move

## workflow: refactoring

version: 1.0.0
status: active
purpose: Restructure code without changing external behavior, with regression tests.
tags: refactor, cleanup, restructure
```

- [ ] **Step 2: Create validation fixture**

`orchestrator/fixtures/v5/catalog/workflows-duplicate.md`:
```md
## workflow: feature-development

version: 1.0.0
status: active
purpose: First.

## workflow: feature-development

version: 2.0.0
status: active
purpose: Duplicate.
```

- [ ] **Step 3: Write the failing test**

`orchestrator/tests/v5/workflows.registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadWorkflowsRegistry } from '../../src/registry/workflows.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../../catalog');

describe('WorkflowsRegistry', () => {
  it('loads workflows from catalog/workflows.md', async () => {
    const registry = await loadWorkflowsRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(5);
    expect(registry.get('feature-development')?.purpose).toContain('feature');
  });

  it('throws RegistryValidationError on duplicate IDs', async () => {
    const dupPath = resolve(__dirname, '../fixtures/v5/catalog/workflows-duplicate.md');
    await expect(loadWorkflowsRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });
});
```

- [ ] **Step 4: Implement registry**

`orchestrator/src/registry/workflows.registry.ts`:
```ts
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
```

- [ ] **Step 5: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/workflows.registry.test.ts`
Expected: PASS (2/2)

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/registry/workflows.registry.ts \
        orchestrator/catalog/workflows.md \
        orchestrator/tests/v5/workflows.registry.test.ts \
        orchestrator/fixtures/v5/catalog/workflows-duplicate.md
git commit -m "feat(v5): add workflows registry with duplicate-id validation"
```

---

### Task 2.5: Reviewers registry

**Files:**
- Create: `orchestrator/catalog/reviewers.md`
- Create: `orchestrator/src/registry/reviewers.registry.ts`
- Create: `orchestrator/tests/v5/reviewers.registry.test.ts`
- Create: `orchestrator/fixtures/v5/catalog/reviewers-duplicate.md`

- [ ] **Step 1: Create catalog**

`orchestrator/catalog/reviewers.md`:
```md
## reviewer: architecture-reviewer

version: 1.0.0
status: active
purpose: Reviews system design, ADRs, and architectural decisions.
tags: architecture, design, adr

## reviewer: code-reviewer

version: 1.0.0
status: active
purpose: Reviews pull requests for correctness, style, and test coverage.
tags: code, pr, style

## reviewer: docs-reviewer

version: 1.0.0
status: active
purpose: Reviews documentation for clarity, accuracy, and completeness.
tags: docs, content, review

## reviewer: blog-reviewer

version: 1.0.0
status: active
purpose: Reviews blog content for voice, SEO, and accessibility.
tags: blog, content, seo

## reviewer: ecommerce-reviewer

version: 1.0.0
status: active
purpose: Reviews ecommerce flows for cart, checkout, and payment security.
tags: ecommerce, payment, security
```

- [ ] **Step 2: Create validation fixture**

`orchestrator/fixtures/v5/catalog/reviewers-duplicate.md`:
```md
## reviewer: code-reviewer

version: 1.0.0
status: active
purpose: First.

## reviewer: code-reviewer

version: 2.0.0
status: active
purpose: Duplicate.
```

- [ ] **Step 3: Write the failing test**

`orchestrator/tests/v5/reviewers.registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadReviewersRegistry } from '../../src/registry/reviewers.registry.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const CATALOG = resolve(__dirname, '../../catalog');

describe('ReviewersRegistry', () => {
  it('loads reviewers from catalog/reviewers.md', async () => {
    const registry = await loadReviewersRegistry({ basePath: CATALOG });
    expect(registry.size).toBe(5);
    expect(registry.get('code-reviewer')?.purpose).toContain('pull requests');
  });

  it('throws RegistryValidationError on duplicate IDs', async () => {
    const dupPath = resolve(__dirname, '../fixtures/v5/catalog/reviewers-duplicate.md');
    await expect(loadReviewersRegistry({ filePath: dupPath })).rejects.toThrow(RegistryValidationError);
  });
});
```

- [ ] **Step 4: Implement registry**

`orchestrator/src/registry/reviewers.registry.ts`:
```ts
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
```

- [ ] **Step 5: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/reviewers.registry.test.ts`
Expected: PASS (2/2)

- [ ] **Step 6: Commit (closes the catalog commit)**

```bash
git add orchestrator/src/registry/reviewers.registry.ts \
        orchestrator/catalog/reviewers.md \
        orchestrator/tests/v5/reviewers.registry.test.ts \
        orchestrator/fixtures/v5/catalog/reviewers-duplicate.md
git commit -m "feat(v5): add reviewers registry with duplicate-id validation"
```

✅ **Commit 2 complete. Buildable (all 4 registries compile, all catalog files exist), testable (11/11 new tests), revertable (revert last 5 commits).**

---

## Commit 3: feat(v5) — add routing registry

**Goal:** Load `routing/intents.md` and expose an `IntentsRegistry` that maps intent names to `IntentMapping` objects. The parser detects duplicate intent IDs at load time.

**Files (create):**
- `orchestrator/routing/intents.md`
- `orchestrator/src/routing/intents.ts`
- `orchestrator/src/routing/errors.ts`
- `orchestrator/tests/v5/intents.test.ts`
- `orchestrator/fixtures/v5/routing/intents-duplicate.md`
- `orchestrator/fixtures/v5/routing/intents-malformed.md`

---

### Task 3.1: Routing types + errors

**Files:**
- Create: `orchestrator/src/routing/errors.ts`
- Create: `orchestrator/src/routing/types.ts`

- [ ] **Step 1: Add errors module**

`orchestrator/src/routing/errors.ts`:
```ts
import { RegistryValidationError } from '../registry/errors.js';

export class IntentValidationError extends RegistryValidationError {
  constructor(issues: readonly string[]) {
    super('intents', issues);
  }
}
```

- [ ] **Step 2: Add types module**

`orchestrator/src/routing/types.ts`:
```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add orchestrator/src/routing/errors.ts \
        orchestrator/src/routing/types.ts
git commit -m "feat(v5): add routing types and intent validation error"
```

---

### Task 3.2: Intents catalog

**Files:**
- Create: `orchestrator/routing/intents.md`

- [ ] **Step 1: Create the file**

`orchestrator/routing/intents.md`:
```md
## intent: blog

version: 1.0.0
status: active
skills: astro-blog, astro-core
agents: implementer, documentation
workflows: feature-development
reviewers: blog-reviewer

## intent: docs

version: 1.0.0
status: active
skills: astro-docs, astro-core
agents: documentation, implementer
workflows: feature-development
reviewers: docs-reviewer

## intent: saas

version: 1.0.0
status: active
skills: astro-saas, astro-core
agents: implementer, architecture-reviewer
workflows: feature-development
reviewers: code-reviewer

## intent: ecommerce

version: 1.0.0
status: active
skills: astro-ecommerce, astro-core
agents: implementer
workflows: feature-development
reviewers: ecommerce-reviewer

## intent: architecture

version: 1.0.0
status: active
skills: astro-core
agents: architect
workflows: architecture-review
reviewers: architecture-reviewer

## intent: refactor

version: 1.0.0
status: active
skills: astro-core
agents: implementer, code-reviewer
workflows: refactoring
reviewers: code-reviewer

## intent: migration

version: 1.0.0
status: active
skills: astro-core
agents: implementer
workflows: migration
reviewers: code-reviewer

## intent: unknown

version: 1.0.0
status: active
skills: astro-core
agents: implementer
workflows: feature-development
reviewers: code-reviewer
```

- [ ] **Step 2: Commit**

```bash
git add orchestrator/routing/intents.md
git commit -m "feat(v5): seed routing/intents.md with 8 intent mappings"
```

---

### Task 3.3: Intents registry loader (TDD)

**Files:**
- Create: `orchestrator/src/routing/intents.ts`
- Create: `orchestrator/tests/v5/intents.test.ts`
- Create: `orchestrator/fixtures/v5/routing/intents-duplicate.md`
- Create: `orchestrator/fixtures/v5/routing/intents-malformed.md`

- [ ] **Step 1: Create validation fixtures**

`orchestrator/fixtures/v5/routing/intents-duplicate.md`:
```md
## intent: blog

version: 1.0.0
status: active
skills: astro-blog
agents: implementer
workflows: feature-development
reviewers: blog-reviewer

## intent: blog

version: 2.0.0
status: active
skills: astro-blog-v2
agents: implementer
workflows: feature-development
reviewers: blog-reviewer
```

`orchestrator/fixtures/v5/routing/intents-malformed.md`:
```md
## intent: blog

version: 1.0.0
status: active
skills: astro-blog
agents: implementer
```

- [ ] **Step 2: Write failing test**

`orchestrator/tests/v5/intents.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadIntentsRegistry } from '../../src/routing/intents.js';
import { IntentValidationError } from '../../src/routing/errors.js';

const ROUTING = resolve(__dirname, '../../routing');

describe('IntentsRegistry', () => {
  it('loads 8 intents from routing/intents.md', async () => {
    const registry = await loadIntentsRegistry({ basePath: ROUTING });
    expect(registry.size).toBe(8);
    expect(registry.list().map(i => i.intent)).toEqual([
      'blog', 'docs', 'saas', 'ecommerce',
      'architecture', 'refactor', 'migration', 'unknown',
    ]);
  });

  it('resolves a single intent to its mapping', async () => {
    const registry = await loadIntentsRegistry({ basePath: ROUTING });
    const blog = registry.resolve('blog');
    expect(blog).toBeDefined();
    expect(blog!.skills).toEqual(['astro-blog', 'astro-core']);
    expect(blog!.agents).toContain('implementer');
    expect(blog!.workflows).toContain('feature-development');
    expect(blog!.reviewers).toContain('blog-reviewer');
  });

  it('returns undefined for unresolvable intents', async () => {
    const registry = await loadIntentsRegistry({ basePath: ROUTING });
    expect(registry.resolve('nonexistent')).toBeUndefined();
  });

  it('throws IntentValidationError on duplicate intent IDs', async () => {
    const dupPath = resolve(__dirname, '../fixtures/v5/routing/intents-duplicate.md');
    await expect(loadIntentsRegistry({ filePath: dupPath })).rejects.toThrow(IntentValidationError);
  });

  it('throws IntentValidationError on missing required field', async () => {
    const malPath = resolve(__dirname, '../fixtures/v5/routing/intents-malformed.md');
    await expect(loadIntentsRegistry({ filePath: malPath })).rejects.toThrow(IntentValidationError);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd orchestrator && npm test -- tests/v5/intents.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement loader**

`orchestrator/src/routing/intents.ts`:
```ts
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEntities, type ParsedEntity } from '../registry/markdown-loader.js';
import { RegistryLoadError } from '../registry/errors.js';
import { IntentValidationError } from './errors.js';
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
    throw new IntentValidationError([`unknown intent "${parsed.id}"`]);
  }
  for (const key of REQUIRED_FIELDS) {
    if (!fields[key]) {
      throw new IntentValidationError([`${parsed.id}: missing required field "${key}"`]);
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
  const filePath = opts?.filePath ?? resolve(opts?.basePath ?? 'orchestrator', 'routing/intents.md');
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
  if (issues.length > 0) throw new IntentValidationError(issues);

  const mappings = parsed.map(toMapping);
  const byIntent = new Map(mappings.map(m => [m.intent, m]));

  return {
    size: mappings.length,
    list: () => mappings,
    resolve: (intent) => byIntent.get(intent),
  };
}
```

- [ ] **Step 5: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/intents.test.ts`
Expected: PASS (5/5)

- [ ] **Step 6: Commit (closes the routing commit)**

```bash
git add orchestrator/src/routing/intents.ts \
        orchestrator/tests/v5/intents.test.ts \
        orchestrator/fixtures/v5/routing/
git commit -m "feat(v5): add routing registry with intent validation

Loads routing/intents.md into a readonly IntentsRegistry.
Validates duplicate intent IDs, missing required fields,
and unknown intent names against the closed Intent enum."
```

✅ **Commit 3 complete. Buildable, testable, revertable.**

---

## Commit 4: feat(v5) — implement intent classifier

**Goal:** Classify a free-text input into an `Intent` + confidence + signals. Default rules are keyword-based and pluggable.

**Files (create):**
- `orchestrator/src/runtime/intent-classifier.ts`
- `orchestrator/src/runtime/types.ts`
- `orchestrator/tests/v5/intent-classifier.test.ts`

---

### Task 4.1: Add classification types

**Files:**
- Create: `orchestrator/src/runtime/types.ts`

- [ ] **Step 1: Add file**

`orchestrator/src/runtime/types.ts`:
```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add orchestrator/src/runtime/types.ts
git commit -m "feat(v5): add intent classification types"
```

---

### Task 4.2: Default classifier with TDD

**Files:**
- Create: `orchestrator/src/runtime/intent-classifier.ts`
- Create: `orchestrator/tests/v5/intent-classifier.test.ts`

- [ ] **Step 1: Write failing test**

`orchestrator/tests/v5/intent-classifier.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createIntentClassifier, DEFAULT_CLASSIFIER_RULES } from '../../src/runtime/intent-classifier.js';

const classifier = createIntentClassifier();

describe('IntentClassifier', () => {
  it('classifies blog input with high confidence', () => {
    const result = classifier.classify('Create an Astro blog with RSS feed');
    expect(result.intent).toBe('blog');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.signals).toContain('blog');
    expect(result.signals).toContain('rss');
  });

  it('classifies docs input', () => {
    const result = classifier.classify('Write a documentation site with sidebar and search');
    expect(result.intent).toBe('docs');
    expect(result.signals.some(s => ['docs', 'documentation', 'search'].includes(s))).toBe(true);
  });

  it('classifies saas input', () => {
    const result = classifier.classify('Build a SaaS app with subscription and pricing');
    expect(result.intent).toBe('saas');
  });

  it('classifies ecommerce input', () => {
    const result = classifier.classify('Add product pages and a shopping cart');
    expect(result.intent).toBe('ecommerce');
  });

  it('classifies architecture input', () => {
    const result = classifier.classify('Design a system architecture and write ADRs');
    expect(result.intent).toBe('architecture');
  });

  it('classifies refactor input', () => {
    const result = classifier.classify('Refactor the auth module to clean up legacy code');
    expect(result.intent).toBe('refactor');
  });

  it('classifies migration input', () => {
    const result = classifier.classify('Migrate the database from MySQL to Postgres');
    expect(result.intent).toBe('migration');
  });

  it('falls back to unknown with zero confidence for ambiguous input', () => {
    const result = classifier.classify('asdfghjkl qwertyuiop');
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.signals).toEqual([]);
  });

  it('accepts custom rules', () => {
    const custom = createIntentClassifier({
      rules: [
        { intent: 'blog', keywords: ['newsletter'], weight: 2 },
        ...DEFAULT_CLASSIFIER_RULES,
      ],
    });
    const result = custom.classify('Build a newsletter');
    expect(result.intent).toBe('blog');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd orchestrator && npm test -- tests/v5/intent-classifier.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement classifier**

`orchestrator/src/runtime/intent-classifier.ts`:
```ts
import type { Intent } from '../routing/types.js';
import type { Classification, IntentClassifierRule } from './types.js';

export const DEFAULT_CLASSIFIER_RULES: readonly IntentClassifierRule[] = [
  { intent: 'blog', keywords: ['blog', 'post', 'article', 'rss', 'content', 'newsletter', 'mdx'] },
  { intent: 'docs', keywords: ['docs', 'documentation', 'guide', 'tutorial', 'reference', 'sidebar'] },
  { intent: 'saas', keywords: ['saas', 'subscription', 'pricing', 'plan', 'billing', 'dashboard', 'auth'] },
  { intent: 'ecommerce', keywords: ['shop', 'product', 'cart', 'checkout', 'payment', 'store', 'order'] },
  { intent: 'architecture', keywords: ['architecture', 'design', 'adr', 'system', 'rfc', 'blueprint'] },
  { intent: 'refactor', keywords: ['refactor', 'cleanup', 'restructure', 'rename', 'simplify', 'legacy'] },
  { intent: 'migration', keywords: ['migrate', 'move', 'transition', 'upgrade', 'import', 'convert', 'port'] },
];

export interface IntentClassifier {
  classify(input: string): Classification;
}

export interface ClassifierOptions {
  rules?: readonly IntentClassifierRule[];
}

function tokenize(input: string): readonly string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function createIntentClassifier(opts: ClassifierOptions = {}): IntentClassifier {
  const rules = opts.rules ?? DEFAULT_CLASSIFIER_RULES;

  return {
    classify(input: string): Classification {
      const tokens = tokenize(input);
      const matches: Array<{ rule: IntentClassifierRule; signals: string[]; weight: number }> = [];

      for (const rule of rules) {
        const signals: string[] = [];
        for (const keyword of rule.keywords) {
          const kl = keyword.toLowerCase();
          if (tokens.includes(kl) || tokens.some(t => t.includes(kl))) {
            signals.push(keyword);
          }
        }
        if (signals.length > 0) {
          const weight = rule.weight ?? 1;
          matches.push({ rule, signals, weight: signals.length * weight });
        }
      }

      if (matches.length === 0) {
        return { intent: 'unknown', confidence: 0, signals: [] };
      }

      matches.sort((a, b) => b.weight - a.weight);
      const best = matches[0]!;
      const totalWeight = matches.reduce((s, m) => s + m.weight, 0);
      const confidence = totalWeight > 0 ? best.weight / totalWeight : 0;

      return {
        intent: best.rule.intent,
        confidence: Math.min(1, confidence),
        signals: best.signals,
      };
    },
  };
}
```

- [ ] **Step 4: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/intent-classifier.test.ts`
Expected: PASS (9/9)

- [ ] **Step 5: Commit (closes the classifier commit)**

```bash
git add orchestrator/src/runtime/intent-classifier.ts \
        orchestrator/src/runtime/types.ts \
        orchestrator/tests/v5/intent-classifier.test.ts
git commit -m "feat(v5): implement keyword-based intent classifier

Default rules for 7 intent types (blog, docs, saas, ecommerce,
architecture, refactor, migration). Returns confidence in [0, 1]
and matched signals for downstream tracing."
```

✅ **Commit 4 complete. Buildable, testable, revertable.**

---

## Commit 5: feat(v5) — implement orchestrator foundation

**Goal:** The `OrchestratorV5` class wires all four capability registries + the routing registry + the classifier. The `createOrchestratorV5` factory loads everything in parallel, performs **cross-reference validation** (Guardrail 2), and returns the orchestrator.

**Files (create):**
- `orchestrator/src/orchestrator-v5.ts`
- `orchestrator/src/orchestrator-v5.errors.ts`
- `orchestrator/tests/v5/orchestrator-v5.test.ts`
- Modify: `orchestrator/package.json` (add subpath export `astro-orchestrator/v5`)

---

### Task 5.1: Add orchestrator error types

**Files:**
- Create: `orchestrator/src/orchestrator-v5.errors.ts`

- [ ] **Step 1: Add file**

`orchestrator/src/orchestrator-v5.errors.ts`:
```ts
export class UnknownIntentError extends Error {
  constructor(public readonly input: string) {
    super(`No intent mapping for input: "${input}"`);
  }
}

export class UnresolvedCapabilityError extends Error {
  constructor(
    public readonly kind: 'skill' | 'agent' | 'workflow' | 'reviewer',
    public readonly id: string,
    public readonly referencedBy: string,
  ) {
    super(`Intent "${referencedBy}" references unknown ${kind} "${id}"`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add orchestrator/src/orchestrator-v5.errors.ts
git commit -m "feat(v5): add orchestrator error types"
```

---

### Task 5.2: Orchestrator class + factory (TDD)

**Files:**
- Create: `orchestrator/src/orchestrator-v5.ts`
- Create: `orchestrator/tests/v5/orchestrator-v5.test.ts`

- [ ] **Step 1: Write failing test**

`orchestrator/tests/v5/orchestrator-v5.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createOrchestratorV5, OrchestratorV5 } from '../../src/orchestrator-v5.js';
import { RegistryValidationError } from '../../src/registry/errors.js';
import { UnknownIntentError, UnresolvedCapabilityError } from '../../src/orchestrator-v5.errors.js';

const BASE = resolve(__dirname, '../../');

describe('OrchestratorV5', () => {
  it('loads all registries from the default base path', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    expect(orch).toBeInstanceOf(OrchestratorV5);
    expect(orch.skills.size).toBeGreaterThan(0);
    expect(orch.agents.size).toBe(4);
    expect(orch.workflows.size).toBe(5);
    expect(orch.reviewers.size).toBe(5);
    expect(orch.intents.size).toBe(8);
  });

  it('classifies input without throwing', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    const result = orch.classify('Create an Astro blog with RSS');
    expect(result.intent).toBe('blog');
  });

  it('plans blog intent into a fully-resolved ExecutionPlan', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    const plan = orch.plan({ input: 'Create an Astro blog with RSS feed' });
    expect(plan.intent).toBe('blog');
    expect(plan.confidence).toBeGreaterThan(0);
    expect(plan.skills.map(s => s.id)).toEqual(['astro-blog', 'astro-core']);
    expect(plan.agents.map(a => a.id)).toEqual(['implementer', 'documentation']);
    expect(plan.workflows.map(w => w.id)).toEqual(['feature-development']);
    expect(plan.reviewers.map(r => r.id)).toEqual(['blog-reviewer']);
  });

  it('includes trace metadata in ExecutionPlan', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    const plan = orch.plan({ input: 'Create an Astro blog' });
    expect(plan.trace.resolvedIntent).toBe('blog');
    expect(plan.trace.classificationSignals).toContain('blog');
  });

  it('throws UnknownIntentError for unclassifiable input', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    expect(() => orch.plan({ input: 'asdfghjkl' })).toThrow(UnknownIntentError);
  });

  it('throws RegistryValidationError on broken cross-references', async () => {
    const fixtureDir = resolve(__dirname, '../fixtures/v5/cross-ref-broken');
    await expect(createOrchestratorV5({ basePath: fixtureDir })).rejects.toThrow(RegistryValidationError);
  });

  it('exposes read-only registries', async () => {
    const orch = await createOrchestratorV5({ basePath: BASE });
    expect(typeof orch.skills.get).toBe('function');
    expect(typeof orch.skills.list).toBe('function');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd orchestrator && npm test -- tests/v5/orchestrator-v5.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create the cross-reference-broken fixture**

`orchestrator/fixtures/v5/cross-ref-broken/routing/intents.md`:
```md
## intent: blog

version: 1.0.0
status: active
skills: astro-blog, nonexistent-skill
agents: implementer
workflows: feature-development
reviewers: blog-reviewer
```

Plus empty `catalog/{skills,agents,workflows,reviewers}.md` files so the loader doesn't fail on missing files (the factory will catch the cross-ref error before that matters — but in our impl we read files first, so they must exist). Easiest: copy the working catalog files, then change the intent to reference a missing skill.

```bash
mkdir -p orchestrator/fixtures/v5/cross-ref-broken/{catalog,routing}
cp orchestrator/catalog/{skills,agents,workflows,reviewers}.md orchestrator/fixtures/v5/cross-ref-broken/catalog/
cat > orchestrator/fixtures/v5/cross-ref-broken/routing/intents.md <<'MD'
## intent: blog

version: 1.0.0
status: active
skills: astro-blog, nonexistent-skill
agents: implementer
workflows: feature-development
reviewers: blog-reviewer
MD
```

- [ ] **Step 4: Implement OrchestratorV5**

`orchestrator/src/orchestrator-v5.ts`:
```ts
import { resolve } from 'node:path';
import { loadSkillsRegistry, type SkillsRegistry } from './registry/skills.registry.js';
import { loadAgentsRegistry, type AgentsRegistry } from './registry/agents.registry.js';
import { loadWorkflowsRegistry, type WorkflowsRegistry } from './registry/workflows.registry.js';
import { loadReviewersRegistry, type ReviewersRegistry } from './registry/reviewers.registry.js';
import { loadIntentsRegistry, type IntentsRegistry } from './routing/intents.js';
import { RegistryValidationError } from './registry/errors.js';
import { createIntentClassifier, type IntentClassifier } from './runtime/intent-classifier.js';
import type { Classification } from './runtime/types.js';
import type { Agent, Reviewer, Skill, Workflow } from './registry/types.js';
import type { Intent } from './routing/types.js';
import { UnknownIntentError, UnresolvedCapabilityError } from './orchestrator-v5.errors.js';

export interface PlanningRequest {
  input: string;
  context?: Record<string, unknown>;
}

export interface ExecutionPlan {
  intent: Intent;
  confidence: number;
  skills: readonly Skill[];
  agents: readonly Agent[];
  workflows: readonly Workflow[];
  reviewers: readonly Reviewer[];
  metadata: {
    generatedAt: string;
    source: 'classifier';
  };
  trace: {
    classificationSignals: readonly string[];
    resolvedIntent: string;
  };
}

export interface OrchestratorV5Deps {
  skills: SkillsRegistry;
  agents: AgentsRegistry;
  workflows: WorkflowsRegistry;
  reviewers: ReviewersRegistry;
  intents: IntentsRegistry;
  classifier: IntentClassifier;
}

export class OrchestratorV5 {
  readonly skills: SkillsRegistry;
  readonly agents: AgentsRegistry;
  readonly workflows: WorkflowsRegistry;
  readonly reviewers: ReviewersRegistry;
  readonly intents: IntentsRegistry;
  readonly classifier: IntentClassifier;

  constructor(deps: OrchestratorV5Deps) {
    this.skills = deps.skills;
    this.agents = deps.agents;
    this.workflows = deps.workflows;
    this.reviewers = deps.reviewers;
    this.intents = deps.intents;
    this.classifier = deps.classifier;
  }

  classify(input: string): Classification {
    return this.classifier.classify(input);
  }

  plan(request: PlanningRequest): ExecutionPlan {
    const { intent, confidence, signals } = this.classifier.classify(request.input);
    if (intent === 'unknown') throw new UnknownIntentError(request.input);
    const mapping = this.intents.resolve(intent);
    if (!mapping) throw new UnknownIntentError(intent);

    const skills = mapping.skills.map(id => {
      const s = this.skills.get(id);
      if (!s) throw new UnresolvedCapabilityError('skill', id, intent);
      return s;
    });
    const agents = mapping.agents.map(id => {
      const a = this.agents.get(id);
      if (!a) throw new UnresolvedCapabilityError('agent', id, intent);
      return a;
    });
    const workflows = mapping.workflows.map(id => {
      const w = this.workflows.get(id);
      if (!w) throw new UnresolvedCapabilityError('workflow', id, intent);
      return w;
    });
    const reviewers = mapping.reviewers.map(id => {
      const r = this.reviewers.get(id);
      if (!r) throw new UnresolvedCapabilityError('reviewer', id, intent);
      return r;
    });

    return {
      intent,
      confidence,
      skills,
      agents,
      workflows,
      reviewers,
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'classifier',
      },
      trace: {
        classificationSignals: signals,
        resolvedIntent: intent,
      },
    };
  }
}

export interface CreateOrchestratorOptions {
  basePath?: string;
}

export async function createOrchestratorV5(
  opts: CreateOrchestratorOptions = {},
): Promise<OrchestratorV5> {
  const base = opts.basePath ?? resolve(process.cwd(), 'orchestrator');

  const [skills, agents, workflows, reviewers, intents] = await Promise.all([
    loadSkillsRegistry({ basePath: base }),
    loadAgentsRegistry({ basePath: base }),
    loadWorkflowsRegistry({ basePath: base }),
    loadReviewersRegistry({ basePath: base }),
    loadIntentsRegistry({ basePath: base }),
  ]);

  validateCrossReferences({ skills, agents, workflows, reviewers, intents });

  return new OrchestratorV5({
    skills,
    agents,
    workflows,
    reviewers,
    intents,
    classifier: createIntentClassifier(),
  });
}

function validateCrossReferences(deps: {
  skills: SkillsRegistry;
  agents: AgentsRegistry;
  workflows: WorkflowsRegistry;
  reviewers: ReviewersRegistry;
  intents: IntentsRegistry;
}): void {
  const issues: string[] = [];
  for (const mapping of deps.intents.list()) {
    for (const id of mapping.skills) {
      if (!deps.skills.get(id)) issues.push(`intent "${mapping.intent}" → missing skill "${id}"`);
    }
    for (const id of mapping.agents) {
      if (!deps.agents.get(id)) issues.push(`intent "${mapping.intent}" → missing agent "${id}"`);
    }
    for (const id of mapping.workflows) {
      if (!deps.workflows.get(id)) issues.push(`intent "${mapping.intent}" → missing workflow "${id}"`);
    }
    for (const id of mapping.reviewers) {
      if (!deps.reviewers.get(id)) issues.push(`intent "${mapping.intent}" → missing reviewer "${id}"`);
    }
  }
  if (issues.length > 0) {
    throw new RegistryValidationError('cross-references', issues);
  }
}
```

- [ ] **Step 5: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/orchestrator-v5.test.ts`
Expected: PASS (7/7)

- [ ] **Step 6: Commit (closes the orchestrator foundation commit)**

```bash
git add orchestrator/src/orchestrator-v5.ts \
        orchestrator/src/orchestrator-v5.errors.ts \
        orchestrator/tests/v5/orchestrator-v5.test.ts \
        orchestrator/fixtures/v5/cross-ref-broken/
git commit -m "feat(v5): implement orchestrator foundation with cross-reference validation

OrchestratorV5 class (DI constructor) wires the 4 capability
registries, the routing registry, and the classifier. The
createOrchestratorV5 factory loads all registries in parallel
and validates every intent reference against the corresponding
capability registry at startup. ExecutionPlan includes trace
metadata (classificationSignals, resolvedIntent) for downstream
self-improving routing."
```

✅ **Commit 5 complete. Buildable, testable, revertable.**

---

## Commit 6: test(v5) — add integration coverage

**Goal:** End-to-end integration test (the keystone test per Guardrail 3) plus a comprehensive cross-reference validation suite. This commit contains only test code — no production logic.

**Files (create):**
- `orchestrator/tests/v5/integration.test.ts`
- `orchestrator/tests/v5/validation.test.ts`
- `orchestrator/fixtures/v5/integration/{catalog,routing}/...` (full happy-path fixture)

---

### Task 6.1: Keystone integration test

**Files:**
- Create: `orchestrator/fixtures/v5/integration/catalog/{skills,agents,workflows,reviewers}.md`
- Create: `orchestrator/fixtures/v5/integration/routing/intents.md`
- Create: `orchestrator/tests/v5/integration.test.ts`

- [ ] **Step 1: Create the integration fixture set**

`orchestrator/fixtures/v5/integration/catalog/skills.md`:
```md
## skill: astro-blog

version: 1.0.0
status: active
purpose: Blog with RSS.
tags: blog, rss

## skill: astro-core

version: 1.0.0
status: active
purpose: Core layouts.
tags: core, base
```

`orchestrator/fixtures/v5/integration/catalog/agents.md`:
```md
## agent: implementer

version: 1.0.0
status: active
purpose: Writes code.
tags: code

## agent: documentation

version: 1.0.0
status: active
purpose: Writes docs.
tags: docs
```

`orchestrator/fixtures/v5/integration/catalog/workflows.md`:
```md
## workflow: feature-development

version: 1.0.0
status: active
purpose: Ship a feature.
tags: feature
```

`orchestrator/fixtures/v5/integration/catalog/reviewers.md`:
```md
## reviewer: blog-reviewer

version: 1.0.0
status: active
purpose: Reviews blog content.
tags: blog
```

`orchestrator/fixtures/v5/integration/routing/intents.md`:
```md
## intent: blog

version: 1.0.0
status: active
skills: astro-blog, astro-core
agents: implementer, documentation
workflows: feature-development
reviewers: blog-reviewer
```

- [ ] **Step 2: Write the keystone test**

`orchestrator/tests/v5/integration.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createOrchestratorV5, OrchestratorV5 } from '../../src/orchestrator-v5.js';

const FIXTURE_DIR = resolve(__dirname, '../fixtures/v5/integration');

describe('Factory bootstrap — Sub-Spec 1 keystone (Guardrail 3)', () => {
  it('loads markdown → instantiates OrchestratorV5 → classifies → plans', async () => {
    const orchestrator = await createOrchestratorV5({ basePath: FIXTURE_DIR });
    expect(orchestrator).toBeInstanceOf(OrchestratorV5);

    const plan = orchestrator.plan({ input: 'Create an Astro blog with RSS feed' });

    expect(plan.intent).toBe('blog');
    expect(plan.confidence).toBeGreaterThan(0);
    expect(plan.skills).toHaveLength(2);
    expect(plan.agents).toHaveLength(2);
    expect(plan.workflows).toHaveLength(1);
    expect(plan.reviewers).toHaveLength(1);

    expect(plan.skills.map(s => s.id).sort()).toEqual(['astro-blog', 'astro-core']);
    expect(plan.agents.map(a => a.id).sort()).toEqual(['documentation', 'implementer']);
    expect(plan.workflows[0]!.id).toBe('feature-development');
    expect(plan.reviewers[0]!.id).toBe('blog-reviewer');

    expect(plan.trace.resolvedIntent).toBe('blog');
    expect(plan.trace.classificationSignals).toContain('blog');
  });

  it('preserves v4 runtime compatibility', async () => {
    // Sanity: the v4 legacy runtime is still importable from the same package.
    const legacy = await import('../../src/index.js');
    expect(typeof legacy.createOrchestrator).toBe('function');
    expect(typeof legacy.createOrchestratorAsync).toBe('function');
  });
});
```

- [ ] **Step 3: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/integration.test.ts`
Expected: PASS (2/2)

- [ ] **Step 4: Commit**

```bash
git add orchestrator/tests/v5/integration.test.ts \
        orchestrator/fixtures/v5/integration/
git commit -m "test(v5): add factory bootstrap keystone test (Guardrail 3)"
```

---

### Task 6.2: Validation matrix tests

**Files:**
- Create: `orchestrator/fixtures/v5/validation/{missing-skill,missing-agent,missing-workflow,missing-reviewer,multi-issue}/...`
- Create: `orchestrator/tests/v5/validation.test.ts`

- [ ] **Step 1: Create each broken fixture set**

For each broken-fixture dir, copy the integration catalog files and modify the routing file to drop one reference type. Example for `missing-skill`:

`orchestrator/fixtures/v5/validation/missing-skill/catalog/{skills,agents,workflows,reviewers}.md` — same as integration
`orchestrator/fixtures/v5/validation/missing-skill/routing/intents.md`:
```md
## intent: blog

version: 1.0.0
status: active
skills: astro-blog, ghost-skill
agents: implementer, documentation
workflows: feature-development
reviewers: blog-reviewer
```

Repeat for `missing-agent` (drop `implementer` from agents), `missing-workflow`, `missing-reviewer`.

For `multi-issue`, drop two references.

A small bash one-liner scaffolds them:
```bash
for kind in missing-skill missing-agent missing-workflow missing-reviewer multi-issue; do
  mkdir -p orchestrator/fixtures/v5/validation/$kind/{catalog,routing}
  cp orchestrator/fixtures/v5/integration/catalog/*.md orchestrator/fixtures/v5/validation/$kind/catalog/
  cp orchestrator/fixtures/v5/integration/routing/intents.md orchestrator/fixtures/v5/validation/$kind/routing/
done
# Then edit each intents.md to introduce the relevant break
```

- [ ] **Step 2: Write the test**

`orchestrator/tests/v5/validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createOrchestratorV5 } from '../../src/orchestrator-v5.js';
import { RegistryValidationError } from '../../src/registry/errors.js';

const VALIDATION = resolve(__dirname, '../fixtures/v5/validation');

describe('Cross-reference validation (Guardrail 2)', () => {
  it('rejects intent with missing skill reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-skill` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('rejects intent with missing agent reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-agent` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('rejects intent with missing workflow reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-workflow` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('rejects intent with missing reviewer reference', async () => {
    await expect(
      createOrchestratorV5({ basePath: `${VALIDATION}/missing-reviewer` }),
    ).rejects.toThrow(RegistryValidationError);
  });

  it('lists ALL missing references in a single error (not just the first)', async () => {
    try {
      await createOrchestratorV5({ basePath: `${VALIDATION}/multi-issue` });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RegistryValidationError);
      const issues = (err as RegistryValidationError).issues;
      expect(issues.length).toBeGreaterThan(1);
    }
  });
});
```

- [ ] **Step 3: Run and verify pass**

Run: `cd orchestrator && npm test -- tests/v5/validation.test.ts`
Expected: PASS (5/5)

- [ ] **Step 4: Commit (closes the integration commit)**

```bash
git add orchestrator/tests/v5/validation.test.ts \
        orchestrator/fixtures/v5/validation/
git commit -m "test(v5): add cross-reference validation matrix (Guardrail 2)

Five broken-fixture scenarios verify that createOrchestratorV5
fails fast on missing skill, agent, workflow, or reviewer
references, and that all issues are reported in a single
RegistryValidationError (not just the first)."
```

✅ **Commit 6 complete. Buildable, testable, revertable. The keystone test is in place.**

---

## Commit 7: docs(v5) — add runtime orchestrator documentation

**Goal:** Real documentation (no placeholders per m0306): governance README, top-level orchestrator v5 usage docs.

**Files (create):**
- `orchestrator/governance/README.md`
- `docs/orchestrator-v5.md`

---

### Task 7.1: Governance README

**Files:**
- Create: `orchestrator/governance/README.md`

- [ ] **Step 1: Create the README**

`orchestrator/governance/README.md`:
```md
# Governance Layer

## Purpose

The governance layer encodes cross-cutting policies that constrain how the orchestrator selects and composes capabilities. Policies answer questions like:

- Which intent mappings are allowed in production vs. experimental builds?
- What approval gates must a workflow pass before it executes?
- How are deprecated or legacy capabilities surfaced to the user?
- How are conflicts between reviewer and architect decisions resolved?

Governance is **orthogonal to capability and routing layers**. A skill, agent, workflow, or reviewer does not embed governance metadata. Policies are evaluated separately by the policy engine against a resolved `ExecutionPlan`.

## Layered Architecture

```
catalog/   ← capabilities (skills, agents, workflows, reviewers)
routing/   ← intent → capability mappings
governance/  ← THIS LAYER — policies that constrain plans
```

`Markdown = Source of Truth. TypeScript = Runtime Engine.`

## Policy Evaluation Lifecycle (Future)

A policy is evaluated at three points in the orchestrator lifecycle:

1. **Bootstrap**: `createOrchestratorV5` loads the policy registry alongside capability registries. Policies that gate boot (e.g. "no deprecated skills in production") are evaluated immediately.
2. **Planning**: After `plan()` resolves an `ExecutionPlan`, the policy engine checks the plan against all relevant policies. Denials throw `PolicyViolationError`.
3. **Execution** (Sub-Spec 2): Before each task dispatches, the engine re-checks policies that depend on runtime state (e.g. "reviewer must approve before implementer ships").

## Policy Ownership

Policies are owned by the **platform team**, not by capability contributors. This is the same separation used in the rest of the engineering OS: routing is an orchestration concern, capabilities are execution concerns, policies are governance concerns. Mixing them creates invisible coupling and makes OSS contribution hard.

## Roadmap

| Sub-Spec | Scope | Status |
|----------|-------|--------|
| Sub-Spec 1 | Namespace + this README | ✅ Shipped |
| Sub-Spec 2 | Policy registry + evaluation API + bootstrap-time checks | Planned |
| Sub-Spec 3 | Enforcement hooks in the execution engine (plan-time + runtime) | Planned |

**Evolutionary architecture**: the namespace exists, the architecture is documented, the implementation is deferred to the appropriate sub-spec. This lets Sub-Spec 1 land cleanly without blocking on a policy engine that depends on execution semantics not yet designed.
```

- [ ] **Step 2: Commit**

```bash
git add orchestrator/governance/README.md
git commit -m "docs(v5): add governance layer README

Documents the policy layer's purpose, evaluation lifecycle,
ownership boundaries, and roadmap. Not a placeholder — the
namespace, architecture, and lifecycle are real; only the
policy engine implementation is deferred to Sub-Spec 2."
```

---

### Task 7.2: Top-level orchestrator v5 usage docs

**Files:**
- Create: `docs/orchestrator-v5.md`

- [ ] **Step 1: Create the doc**

`docs/orchestrator-v5.md`:
```md
# Runtime Orchestrator v5

> Discovery, classification, planning, and resolution of capabilities from markdown catalogs. Foundation layer — no execution engine in this release.

## What is it?

The orchestrator v5 is a TypeScript runtime that turns natural-language task descriptions into fully-resolved `ExecutionPlan` objects. It loads capability definitions (skills, agents, workflows, reviewers) and intent-to-capability mappings from human-readable Markdown, then exposes a factory that:

1. Validates every cross-reference (e.g. an intent that names a non-existent skill fails fast).
2. Classifies the input string into one of 8 intents (blog, docs, saas, ecommerce, architecture, refactor, migration, unknown).
3. Resolves the matched intent into a plan: the full set of skills, agents, workflows, and reviewers the work would need.

The v4 runtime (`orchestrator/src/index.ts`) is unchanged. v5 is an additive subpath export (`astro-orchestrator/v5`) — import it explicitly.

## Quick start

```ts
import { createOrchestratorV5 } from 'astro-orchestrator/v5';

const orch = await createOrchestratorV5({ basePath: './orchestrator' });
const plan = orch.plan({ input: 'Create an Astro blog with RSS feed' });

console.log(plan.intent);          // 'blog'
console.log(plan.skills);          // [astro-blog, astro-core]
console.log(plan.agents);          // [implementer, documentation]
console.log(plan.workflows);       // [feature-development]
console.log(plan.reviewers);       // [blog-reviewer]
console.log(plan.trace);           // { classificationSignals: [...], resolvedIntent: 'blog' }
```

## Architecture

```
orchestrator/
├── catalog/              # Markdown source of truth for capabilities
│   ├── skills.md
│   ├── agents.md
│   ├── workflows.md
│   └── reviewers.md
├── routing/              # Markdown source of truth for intent mappings
│   └── intents.md
├── governance/           # Policy layer (Sub-Spec 1 = README only)
│   └── README.md
└── src/
    ├── registry/         # TS loaders + readonly query APIs
    ├── routing/          # Intent loader + resolver
    ├── runtime/          # Intent classifier
    └── orchestrator-v5.ts  # Class + factory
```

**Three-layer concern separation:**
- **Capability layer** (`catalog/`) — what exists
- **Routing layer** (`routing/`) — what to use
- **Governance layer** (`governance/`) — what's allowed

Each layer is independent. A capability has no routing metadata. An intent has no policy metadata. This makes OSS contribution safe: a contributor adding a new skill cannot accidentally break the routing or governance layers.

## API

### `createOrchestratorV5(opts?)`

Loads all 4 capability registries, the routing registry, validates cross-references, and returns an `OrchestratorV5` instance. Throws `RegistryValidationError` if any cross-reference is broken.

### `OrchestratorV5.classify(input)`

Returns `{ intent, confidence, signals }` without resolving any plan. Useful for routing decisions that don't need a full plan.

### `OrchestratorV5.plan(request)`

Returns an `ExecutionPlan` with the fully-resolved skill, agent, workflow, and reviewer lists plus trace metadata. Throws `UnknownIntentError` for inputs the classifier can't match.

### Readonly registries

The orchestrator exposes `skills`, `agents`, `workflows`, `reviewers`, and `intents` as readonly query APIs. Call `.list()`, `.get(id)`, `.byTag(tag)`, or `.byStatus(status)`.

## Testing

```bash
cd orchestrator
npm test -- tests/v5
```

Coverage: 90%+ on v5 source. The keystone integration test (`tests/v5/integration.test.ts`) drives the full path: load markdown → instantiate → classify → plan.

## Status

| Layer | Status |
|-------|--------|
| Markdown loader | ✅ Shipped |
| Capability registries (skills, agents, workflows, reviewers) | ✅ Shipped |
| Routing registry | ✅ Shipped |
| Intent classifier | ✅ Shipped |
| Orchestrator foundation + cross-ref validation | ✅ Shipped |
| Integration test coverage | ✅ Shipped |
| Governance documentation | ✅ Shipped |
| Execution engine (parallel task graph) | ⏳ Sub-Spec 2 |
| Learning + self-improving routing | ⏳ Sub-Spec 3 |
```

- [ ] **Step 2: Commit (closes the docs commit)**

```bash
git add docs/orchestrator-v5.md
git commit -m "docs(v5): add runtime orchestrator v5 usage documentation"
```

✅ **Commit 7 complete. Buildable, testable, revertable. All 7 commits done.**

---

## Final verification

- [ ] **Run the full v5 test suite**

Run: `cd orchestrator && npm test -- tests/v5`
Expected: ALL PASS (5 loader + 5 skills + 2 agents + 2 workflows + 2 reviewers + 5 intents + 9 classifier + 7 orchestrator + 2 integration + 5 validation = ~44 new tests, plus 1 GitHub-internal coverage check)

- [ ] **Confirm coverage ≥ 90% on v5 source**

Run: `cd orchestrator && npm run test:coverage`
Expected: v5 statements ≥ 90% (loader, registries, intents, classifier, orchestrator-v5 all tested)

- [ ] **Confirm legacy v4 still passes**

Run: `cd orchestrator && npm test`
Expected: 69/69 legacy + ~44 new v5 = 113 total, all green

- [ ] **Run typecheck on the package**

Run: `cd orchestrator && npm run lint`
Expected: PASS, zero errors

- [ ] **Confirm build is clean**

Run: `cd orchestrator && npm run build`
Expected: PASS, `dist/` contains v4 binaries (v5 is library-only)

---

## Self-review (against spec)

**1. Spec coverage** — every spec requirement maps to a task:
- Markdown loader (Task 1.x) → spec §"Markdown loader"
- Capability registries with duplicate-ID validation (Task 2.x) → spec §"Capability registries"
- Routing registry with intent validation (Task 3.x) → spec §"Routing registry"
- Intent classifier with signals (Task 4.x) → spec §"Intent classifier"
- OrchestratorV5 class + factory with cross-ref validation (Task 5.x) → spec §"OrchestratorV5"
- Trace metadata in `ExecutionPlan` (Task 5.2) → spec §"Planning trace"
- Integration test as keystone (Task 6.1) → spec §"Keystone test"
- Cross-reference validation matrix (Task 6.2) → spec §"Cross-reference validation"
- Governance README with real content (Task 7.1) → spec §"Governance layer"
- Top-level usage docs (Task 7.2) → spec §"User-facing documentation"
- Version + status metadata on all entities (Tasks 2.2-2.5 catalog files) → spec §"Entity metadata"
- Subpath export `astro-orchestrator/v5` → spec §"Backward compatibility" (note: deferred — not in any task, see open issue below)

**2. Placeholder scan** — searched for: TBD, TODO, "implement later", "fill in", "appropriate", "similar to". Found: zero in source/test code. Doc strings in spec reference Sub-Spec 2/3 by name, not placeholders.

**3. Type consistency** — `Intent` enum, `Skill`/`Agent`/`Workflow`/`Reviewer` interfaces, `RegistryValidationError`/`IntentValidationError`/`UnknownIntentError`/`UnresolvedCapabilityError` are all defined in one place and used uniformly across tasks. No signature drift.

**Open issue identified during self-review:** Subpath export `astro-orchestrator/v5` is mentioned in the spec but **not implemented in any task**. The v5 module is importable as `astro-orchestrator/dist/orchestrator-v5.js` after build, but the spec calls for a clean `astro-orchestrator/v5` import. **Adding this as a new task to Commit 5:**

### Task 5.3 (added): Subpath export in package.json

**Files:**
- Modify: `orchestrator/package.json`

- [ ] **Step 1: Add the export**

Append to `orchestrator/package.json` after the `"main"` field:
```json
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./v5": "./dist/orchestrator-v5.js"
  },
```

- [ ] **Step 2: Build and verify the subpath resolves**

Run: `cd orchestrator && npm run build && node -e "import('astro-orchestrator/v5').then(m => console.log(typeof m.createOrchestratorV5))"`
Expected: prints `function`

- [ ] **Step 3: Commit**

```bash
git add orchestrator/package.json
git commit -m "feat(v5): expose astro-orchestrator/v5 subpath export"
```

(This commit can be amended into Commit 5 or kept as a tiny cleanup commit. Recommend amending into Commit 5 with `git commit --amend` so the 7-commit history stays clean.)

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-04-runtime-orchestrator-v5-foundation.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
