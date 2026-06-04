# Orchestrator Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript multi-agent orchestration runtime on top of the existing `astro-orchestrator.md` spec, exposing both a CLI and importable library.

**Architecture:** Parse markdown routing rules into an executable AST, drive a task DAG through a state machine, dispatch agents in parallel, persist history to SQLite, and expose via MCP.

**Tech Stack:** TypeScript (strict, ES2022, NodeNext), `better-sqlite3`, `@modelcontextprotocol/sdk`, Node.js 20+, `vitest` for tests.

---

## Phase 1: Core Engine (Foundation)

### Task 1: Project Scaffolding

**Files:**
- Create: `orchestrator/package.json`
- Create: `orchestrator/tsconfig.json`
- Create: `orchestrator/.gitignore`
- Create: `orchestrator/tests/.gitkeep`

- [ ] **Step 1: Create `orchestrator/package.json`**

```json
{
  "name": "astro-orchestrator",
  "version": "0.1.0",
  "description": "Multi-agent orchestration runtime for astro-engineering-os",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "astro-orch": "./dist/cli.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "tsc --watch",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `orchestrator/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create `orchestrator/.gitignore`**

```
node_modules/
dist/
.orchestrator/
*.log
```

- [ ] **Step 4: Create test placeholder**

Create empty file `orchestrator/tests/.gitkeep`.

- [ ] **Step 5: Install dependencies**

Run: `cd orchestrator && npm install`
Expected: `node_modules/` populated, no errors.

- [ ] **Step 6: Commit**

```bash
git add orchestrator/package.json orchestrator/tsconfig.json orchestrator/.gitignore orchestrator/tests/
git commit -m "feat(orchestrator): scaffold package with typescript + vitest"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `orchestrator/src/types.ts`
- Test: `orchestrator/tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { TaskId, RoutingRule, TaskNode, TaskState } from '../src/types.js';

describe('types', () => {
  it('TaskId is a branded string', () => {
    const id: TaskId = 'task-1' as TaskId;
    expect(id).toBe('task-1');
  });

  it('RoutingRule has required fields', () => {
    const rule: RoutingRule = {
      id: 'rule-1',
      pattern: 'implement-*',
      agent: 'implementer',
      priority: 10,
    };
    expect(rule.pattern).toBe('implement-*');
  });

  it('TaskNode has initial state pending', () => {
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'rule-1',
      input: { task: 'implement-auth' },
      state: 'pending' as TaskState,
      dependsOn: [],
      attempts: 0,
    };
    expect(node.state).toBe('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/types.test.ts`
Expected: FAIL — cannot find `../src/types.js`

- [ ] **Step 3: Create `orchestrator/src/types.ts`**

```typescript
export type TaskId = string & { readonly __brand: 'TaskId' };

export type TaskState =
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked';

export interface RoutingRule {
  id: string;
  pattern: string;
  agent: string;
  priority: number;
  config?: Record<string, unknown>;
}

export interface TaskInput {
  task: string;
  context?: Record<string, unknown>;
}

export interface TaskResult {
  output: unknown;
  durationMs: number;
  error?: string;
}

export interface TaskNode {
  id: TaskId;
  rule: string;
  input: TaskInput;
  state: TaskState;
  dependsOn: TaskId[];
  attempts: number;
  result?: TaskResult;
}

export interface OrchestratorConfig {
  concurrency: number;
  dbPath: string;
  rulesPath: string;
  agentsPath: string;
}

export const DEFAULT_CONFIG: OrchestratorConfig = {
  concurrency: 3,
  dbPath: '.orchestrator/history.db',
  rulesPath: 'orchestrator/astro-orchestrator.md',
  agentsPath: 'agents',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/types.ts orchestrator/tests/types.test.ts
git commit -m "feat(orchestrator): add core type definitions"
```

---

### Task 3: State Machine

**Files:**
- Create: `orchestrator/src/state.ts`
- Test: `orchestrator/tests/state.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/state.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createStateMachine } from '../src/state.js';
import type { TaskNode, TaskId } from '../src/types.js';

const makeNode = (state: TaskNode['state'] = 'pending'): TaskNode => ({
  id: 't1' as TaskId,
  rule: 'rule-1',
  input: { task: 'test' },
  state,
  dependsOn: [],
  attempts: 0,
});

describe('StateMachine', () => {
  it('transitions pending -> ready', () => {
    const sm = createStateMachine();
    const node = makeNode('pending');
    const next = sm.transition(node, 'ready');
    expect(next.state).toBe('ready');
  });

  it('rejects invalid transition pending -> completed', () => {
    const sm = createStateMachine();
    const node = makeNode('pending');
    expect(() => sm.transition(node, 'completed')).toThrow();
  });

  it('allows running -> failed', () => {
    const sm = createStateMachine();
    const node = makeNode('running');
    const next = sm.transition(node, 'failed');
    expect(next.state).toBe('failed');
  });

  it('allows failed -> running (retry)', () => {
    const sm = createStateMachine();
    const node = makeNode('failed');
    const next = sm.transition(node, 'running');
    expect(next.state).toBe('running');
  });

  it('isTerminal returns true for completed/failed', () => {
    const sm = createStateMachine();
    expect(sm.isTerminal('completed')).toBe(true);
    expect(sm.isTerminal('failed')).toBe(true);
    expect(sm.isTerminal('pending')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/state.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `orchestrator/src/state.ts`**

```typescript
import type { TaskNode, TaskState } from './types.js';

const TRANSITIONS: Record<TaskState, TaskState[]> = {
  pending: ['ready', 'blocked', 'failed'],
  ready: ['running', 'failed'],
  running: ['completed', 'failed', 'blocked'],
  completed: [],
  failed: ['running'],
  blocked: ['ready', 'failed'],
};

export interface StateMachine {
  transition(node: TaskNode, target: TaskState): TaskNode;
  isTerminal(state: TaskState): boolean;
  canTransition(from: TaskState, to: TaskState): boolean;
}

export function createStateMachine(): StateMachine {
  return {
    transition(node, target) {
      if (!this.canTransition(node.state, target)) {
        throw new Error(
          `Invalid transition: ${node.state} -> ${target} for ${node.id}`,
        );
      }
      return { ...node, state: target };
    },
    isTerminal(state) {
      return TRANSITIONS[state].length === 0;
    },
    canTransition(from, to) {
      return TRANSITIONS[from].includes(to);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/state.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/state.ts orchestrator/tests/state.test.ts
git commit -m "feat(orchestrator): add state machine with transition validation"
```

---

### Task 4: Routing Rule Parser

**Files:**
- Create: `orchestrator/src/engine.ts`
- Create: `orchestrator/fixtures/astro-orchestrator.md`
- Test: `orchestrator/tests/engine.test.ts`

- [ ] **Step 1: Create fixture markdown**

`orchestrator/fixtures/astro-orchestrator.md`:

```markdown
# Orchestrator Rules

## rule: implement-*
- agent: implementer
- priority: 10
- config:
    maxRetries: 2

## rule: review-*
- agent: reviewer
- priority: 20

## rule: design-*
- agent: architect
- priority: 5
```

- [ ] **Step 2: Write the failing test**

`orchestrator/tests/engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRules, matchRule } from '../src/engine.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('engine', () => {
  it('parses rules from markdown', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    expect(rules).toHaveLength(3);
    expect(rules[0].id).toBe('implement-*');
    expect(rules[0].agent).toBe('implementer');
  });

  it('matches implement-* to implement-auth', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    const matched = matchRule(rules, 'implement-auth');
    expect(matched?.agent).toBe('implementer');
  });

  it('returns null for unmatched task', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    const matched = matchRule(rules, 'unknown-task');
    expect(matched).toBeNull();
  });

  it('preserves config in parsed rules', () => {
    const md = readFileSync(join(FIXTURES, 'astro-orchestrator.md'), 'utf-8');
    const rules = parseRules(md);
    expect(rules[0].config?.maxRetries).toBe(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/engine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Create `orchestrator/src/engine.ts`**

```typescript
import type { RoutingRule } from './types.js';

export function parseRules(markdown: string): RoutingRule[] {
  const rules: RoutingRule[] = [];
  const blocks = markdown.split(/^##\s+rule:\s+/m).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const pattern = lines[0].trim();
    const rule: RoutingRule = {
      id: pattern,
      pattern,
      agent: '',
      priority: 0,
    };

    let inConfig = false;
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === 'config:') {
        inConfig = true;
        rule.config = {};
        continue;
      }
      if (inConfig) {
        const m = trimmed.match(/^(\w+):\s*(.+)$/);
        if (m && rule.config) {
          const [, key, valRaw] = m;
          const val = isNaN(Number(valRaw)) ? valRaw : Number(valRaw);
          rule.config[key] = val;
        }
      } else {
        const m = trimmed.match(/^(\w+):\s*(.+)$/);
        if (m) {
          const [, key, valRaw] = m;
          const val = isNaN(Number(valRaw)) ? valRaw : Number(valRaw);
          (rule as unknown as Record<string, unknown>)[key] = val;
        }
      }
    }
    rules.push(rule);
  }

  return rules;
}

export function matchRule(
  rules: RoutingRule[],
  task: string,
): RoutingRule | null {
  for (const rule of rules) {
    const regex = new RegExp(
      '^' + rule.pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    );
    if (regex.test(task)) return rule;
  }
  return null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/engine.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/engine.ts orchestrator/fixtures/ orchestrator/tests/engine.test.ts
git commit -m "feat(orchestrator): add markdown routing rule parser"
```

---

### Task 5: Library Entry Point

**Files:**
- Create: `orchestrator/src/index.ts`
- Test: `orchestrator/tests/index.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createOrchestrator } from '../src/index.js';

describe('createOrchestrator', () => {
  it('returns orchestrator instance', () => {
    const orch = createOrchestrator();
    expect(orch).toBeDefined();
    expect(typeof orch.run).toBe('function');
  });

  it('accepts config override', () => {
    const orch = createOrchestrator({ concurrency: 5 });
    expect(orch.getConfig().concurrency).toBe(5);
  });

  it('uses default config when none provided', () => {
    const orch = createOrchestrator();
    expect(orch.getConfig().concurrency).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `orchestrator/src/index.ts`**

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRules, matchRule } from './engine.js';
import { createStateMachine, type StateMachine } from './state.js';
import { DEFAULT_CONFIG, type OrchestratorConfig, type RoutingRule, type TaskId, type TaskNode, type TaskState } from './types.js';

export interface Orchestrator {
  run(task: string): Promise<TaskNode>;
  getConfig(): OrchestratorConfig;
  listRules(): RoutingRule[];
  getStateMachine(): StateMachine;
}

export function createOrchestrator(overrides?: Partial<OrchestratorConfig>): Orchestrator {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...overrides };
  const stateMachine = createStateMachine();

  let cachedRules: RoutingRule[] | null = null;

  const loadRules = (): RoutingRule[] => {
    if (cachedRules) return cachedRules;
    const path = resolve(config.rulesPath);
    if (!existsSync(path)) {
      cachedRules = [];
      return cachedRules;
    }
    const md = readFileSync(path, 'utf-8');
    cachedRules = parseRules(md);
    return cachedRules;
  };

  return {
    async run(task: string): Promise<TaskNode> {
      const rules = loadRules();
      const rule = matchRule(rules, task);
      if (!rule) {
        throw new Error(`No routing rule matched for task: ${task}`);
      }
      const node: TaskNode = {
        id: `t-${Date.now()}` as TaskId,
        rule: rule.id,
        input: { task },
        state: 'pending' as TaskState,
        dependsOn: [],
        attempts: 0,
      };
      return stateMachine.transition(node, 'ready');
    },
    getConfig() {
      return config;
    },
    listRules() {
      return loadRules();
    },
    getStateMachine() {
      return stateMachine;
    },
  };
}

export * from './types.js';
export * from './state.js';
export * from './engine.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/index.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/index.ts orchestrator/tests/index.test.ts
git commit -m "feat(orchestrator): add library entry point with createOrchestrator"
```

---

### Task 6: CLI

**Files:**
- Create: `orchestrator/src/cli.ts`
- Test: `orchestrator/tests/cli.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/cli.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCli } from '../src/cli.js';

let log: string[] = [];
const origLog = console.log;

beforeEach(() => {
  log = [];
  console.log = (...args: unknown[]) => log.push(args.join(' '));
});
afterEach(() => {
  console.log = origLog;
});

describe('cli', () => {
  it('prints help on no args', async () => {
    await runCli([]);
    const out = log.join('\n');
    expect(out).toContain('Usage:');
  });

  it('lists rules on list command', async () => {
    await runCli(['list']);
    const out = log.join('\n');
    expect(out).toMatch(/rule|implementer|architect/);
  });

  it('errors on unknown command', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    await expect(runCli(['bogus'])).rejects.toThrow('exit');
    exit.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/cli.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `orchestrator/src/cli.ts`**

```typescript
#!/usr/bin/env node
import { createOrchestrator } from './index.js';

const HELP = `Usage: astro-orch <command> [args]

Commands:
  run <task>     Run a task
  list           List routing rules
  status <id>    Show task status
  help           Show this help
`;

export async function runCli(args: string[]): Promise<void> {
  const [cmd, ...rest] = args;
  const orch = createOrchestrator();

  switch (cmd) {
    case 'run': {
      const task = rest[0];
      if (!task) {
        console.error('Error: run requires a task name');
        process.exit(1);
      }
      try {
        const node = await orch.run(task);
        console.log(JSON.stringify(node, null, 2));
      } catch (err) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
      break;
    }
    case 'list': {
      const rules = orch.listRules();
      if (rules.length === 0) {
        console.log('No rules found.');
      } else {
        for (const r of rules) {
          console.log(`${r.pattern} -> ${r.agent} (priority: ${r.priority})`);
        }
      }
      break;
    }
    case 'status': {
      const id = rest[0];
      if (!id) {
        console.error('Error: status requires a task id');
        process.exit(1);
      }
      console.log(`Status for ${id}: pending (stub)`);
      break;
    }
    case 'help':
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log(HELP);
      process.exit(1);
  }
}

runCli(process.argv.slice(2));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/cli.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Build and run CLI manually**

Run: `cd orchestrator && npm run build && node dist/cli.js help`
Expected: prints help text

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/cli.ts orchestrator/tests/cli.test.ts
git commit -m "feat(orchestrator): add CLI with run/list/status/help commands"
```

---

### Task 7: Phase 1 Integration Test

**Files:**
- Test: `orchestrator/tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

`orchestrator/tests/integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createOrchestrator } from '../src/index.js';
import { runCli } from '../src/cli.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('phase 1 integration', () => {
  it('orchestrator loads real rules file', () => {
    const md = readFileSync(
      join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md'),
      'utf-8',
    );
    const orch = createOrchestrator({ rulesPath: join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md') });
    const rules = orch.listRules();
    expect(rules.length).toBeGreaterThan(0);
  });

  it('state machine validates transitions', () => {
    const orch = createOrchestrator();
    const sm = orch.getStateMachine();
    expect(sm.canTransition('pending', 'ready')).toBe(true);
    expect(sm.canTransition('pending', 'completed')).toBe(false);
  });

  it('end-to-end: create, run, inspect', async () => {
    const orch = createOrchestrator({
      rulesPath: join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md'),
    });
    const node = await orch.run('implement-auth');
    expect(node.state).toBe('ready');
    expect(node.input.task).toBe('implement-auth');
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd orchestrator && npx vitest run tests/integration.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 3: Run full test suite**

Run: `cd orchestrator && npx vitest run`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add orchestrator/tests/integration.test.ts
git commit -m "test(orchestrator): add phase 1 integration tests"
```

---

## Phase 2: Parallel Execution & Agent Dispatch

### Task 8: Priority Queue

**Files:**
- Create: `orchestrator/src/queue.ts`
- Test: `orchestrator/tests/queue.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/queue.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createQueue } from '../src/queue.js';
import type { TaskId, TaskNode } from '../src/types.js';

const makeNode = (id: string, priority: number): TaskNode => ({
  id: id as TaskId,
  rule: 'r',
  input: { task: 't' },
  state: 'ready' as TaskNode['state'],
  dependsOn: [],
  attempts: 0,
});

describe('Queue', () => {
  it('enqueues and dequeues in priority order', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    q.enqueue(makeNode('b', 5));
    q.enqueue(makeNode('c', 3));
    expect(q.dequeue()?.id).toBe('b');
    expect(q.dequeue()?.id).toBe('c');
    expect(q.dequeue()?.id).toBe('a');
  });

  it('returns null when empty', () => {
    const q = createQueue();
    expect(q.dequeue()).toBeNull();
  });

  it('reports size', () => {
    const q = createQueue();
    q.enqueue(makeNode('a', 1));
    q.enqueue(makeNode('b', 2));
    expect(q.size()).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/queue.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `orchestrator/src/queue.ts`**

```typescript
import type { TaskNode } from './types.js';

export interface Queue {
  enqueue(node: TaskNode): void;
  dequeue(): TaskNode | null;
  size(): number;
  isEmpty(): boolean;
  toArray(): TaskNode[];
}

export function createQueue(): Queue {
  let items: TaskNode[] = [];

  return {
    enqueue(node) {
      items.push(node);
      items.sort((a, b) => {
        const pa = (a.input.context?.priority as number) ?? 0;
        const pb = (b.input.context?.priority as number) ?? 0;
        return pb - pa;
      });
    },
    dequeue() {
      return items.shift() ?? null;
    },
    size() {
      return items.length;
    },
    isEmpty() {
      return items.length === 0;
    },
    toArray() {
      return [...items];
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/queue.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/queue.ts orchestrator/tests/queue.test.ts
git commit -m "feat(orchestrator): add priority queue for task scheduling"
```

---

### Task 9: Agent Registry

**Files:**
- Create: `orchestrator/src/agents/registry.ts`
- Test: `orchestrator/tests/agents-registry.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/agents-registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createAgentRegistry, type Agent } from '../src/agents/registry.js';
import type { TaskNode } from '../src/types.js';

const mockAgent: Agent = {
  name: 'mock',
  async execute(node: TaskNode) {
    return { output: `done:${node.input.task}`, durationMs: 10 };
  },
};

describe('AgentRegistry', () => {
  it('registers and retrieves agents', () => {
    const reg = createAgentRegistry();
    reg.register(mockAgent);
    expect(reg.get('mock')).toBe(mockAgent);
  });

  it('returns null for unknown agent', () => {
    const reg = createAgentRegistry();
    expect(reg.get('unknown')).toBeNull();
  });

  it('lists registered agent names', () => {
    const reg = createAgentRegistry();
    reg.register(mockAgent);
    reg.register({ ...mockAgent, name: 'other' });
    expect(reg.list()).toEqual(['mock', 'other']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/agents-registry.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `orchestrator/src/agents/registry.ts`**

```typescript
import type { TaskNode, TaskResult } from '../types.js';

export interface Agent {
  name: string;
  execute(node: TaskNode): Promise<TaskResult>;
}

export interface AgentRegistry {
  register(agent: Agent): void;
  get(name: string): Agent | null;
  list(): string[];
}

export function createAgentRegistry(): AgentRegistry {
  const agents = new Map<string, Agent>();

  return {
    register(agent) {
      agents.set(agent.name, agent);
    },
    get(name) {
      return agents.get(name) ?? null;
    },
    list() {
      return Array.from(agents.keys());
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/agents-registry.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/agents/registry.ts orchestrator/tests/agents-registry.test.ts
git commit -m "feat(orchestrator): add agent registry"
```

---

### Task 10: Built-in Agent Adapters

**Files:**
- Create: `orchestrator/src/agents/builtin.ts`
- Test: `orchestrator/tests/agents-builtin.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/agents-builtin.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createBuiltinAgents } from '../src/agents/builtin.js';

describe('builtin agents', () => {
  it('creates architect agent', () => {
    const agents = createBuiltinAgents();
    const arch = agents.get('architect');
    expect(arch).not.toBeNull();
    expect(arch?.name).toBe('architect');
  });

  it('creates implementer agent', () => {
    const agents = createBuiltinAgents();
    expect(agents.get('implementer')).not.toBeNull();
  });

  it('creates reviewer agent', () => {
    const agents = createBuiltinAgents();
    expect(agents.get('reviewer')).not.toBeNull();
  });

  it('created agents execute tasks', async () => {
    const agents = createBuiltinAgents();
    const node = {
      id: 't1' as never,
      rule: 'r',
      input: { task: 'do-thing' },
      state: 'running' as const,
      dependsOn: [],
      attempts: 0,
    };
    const result = await agents.get('implementer')!.execute(node);
    expect(result.output).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/agents-builtin.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `orchestrator/src/agents/builtin.ts`**

```typescript
import type { Agent, AgentRegistry } from './registry.js';
import { createAgentRegistry } from './registry.js';
import type { TaskNode, TaskResult } from '../types.js';

const architect: Agent = {
  name: 'architect',
  async execute(node: TaskNode): Promise<TaskResult> {
    const start = Date.now();
    return {
      output: {
        type: 'design',
        task: node.input.task,
        design: `Architectural design for: ${node.input.task}`,
      },
      durationMs: Date.now() - start,
    };
  },
};

const implementer: Agent = {
  name: 'implementer',
  async execute(node: TaskNode): Promise<TaskResult> {
    const start = Date.now();
    return {
      output: {
        type: 'implementation',
        task: node.input.task,
        plan: `Implementation plan for: ${node.input.task}`,
      },
      durationMs: Date.now() - start,
    };
  },
};

const reviewer: Agent = {
  name: 'reviewer',
  async execute(node: TaskNode): Promise<TaskResult> {
    const start = Date.now();
    return {
      output: {
        type: 'review',
        task: node.input.task,
        verdict: 'approved',
        notes: `Review notes for: ${node.input.task}`,
      },
      durationMs: Date.now() - start,
    };
  },
};

export function createBuiltinAgents(): AgentRegistry {
  const reg = createAgentRegistry();
  reg.register(architect);
  reg.register(implementer);
  reg.register(reviewer);
  return reg;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/agents-builtin.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/agents/builtin.ts orchestrator/tests/agents-builtin.test.ts
git commit -m "feat(orchestrator): add builtin agent adapters (architect/implementer/reviewer)"
```

---

### Task 11: Parallel Executor

**Files:**
- Create: `orchestrator/src/executor.ts`
- Test: `orchestrator/tests/executor.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/executor.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createExecutor } from '../src/executor.js';
import { createBuiltinAgents } from '../src/agents/builtin.js';
import type { TaskNode, TaskId } from '../src/types.js';

describe('Executor', () => {
  it('runs single task to completion', async () => {
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const node: TaskNode = {
      id: 't1' as TaskId,
      rule: 'r',
      input: { task: 'do-thing' },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    };
    const result = await exec.execute([node]);
    expect(result[0].state).toBe('completed');
    expect(result[0].result?.output).toBeDefined();
  });

  it('runs multiple tasks in parallel up to concurrency', async () => {
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const nodes: TaskNode[] = [1, 2, 3, 4].map((i) => ({
      id: `t${i}` as TaskId,
      rule: 'r',
      input: { task: `task-${i}` },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    }));
    const results = await exec.execute(nodes);
    expect(results.every((r) => r.state === 'completed')).toBe(true);
  });

  it('respects concurrency limit', async () => {
    const agents = createBuiltinAgents();
    let active = 0;
    let maxActive = 0;
    const wrapped = {
      get: (name: string) => ({
        name,
        async execute(node: TaskNode) {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((r) => setTimeout(r, 20));
          active--;
          return { output: node.input.task, durationMs: 20 };
        },
      }),
      list: () => ['mock'],
    };
    const exec = createExecutor({ agents: wrapped as never, concurrency: 2 });
    const nodes: TaskNode[] = [1, 2, 3, 4, 5].map((i) => ({
      id: `t${i}` as TaskId,
      rule: 'r',
      input: { task: `t-${i}` },
      state: 'ready',
      dependsOn: [],
      attempts: 0,
    }));
    await exec.execute(nodes);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/executor.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `orchestrator/src/executor.ts`**

```typescript
import type { TaskNode, TaskResult } from './types.js';
import { createStateMachine } from './state.js';
import type { AgentRegistry } from './agents/registry.js';

export interface ExecutorConfig {
  agents: AgentRegistry;
  concurrency: number;
  maxAttempts?: number;
}

export interface Executor {
  execute(nodes: TaskNode[]): Promise<TaskNode[]>;
}

export function createExecutor(config: ExecutorConfig): Executor {
  const { agents, concurrency } = config;
  const maxAttempts = config.maxAttempts ?? 2;
  const sm = createStateMachine();

  return {
    async execute(nodes: TaskNode[]): Promise<TaskNode[]> {
      const results: TaskNode[] = [];
      let index = 0;

      const worker = async (): Promise<void> => {
        while (index < nodes.length) {
          const i = index++;
          const node = nodes[i];
          const rule = node.rule;
          const agentName = rule.startsWith('implement-')
            ? 'implementer'
            : rule.startsWith('review-')
              ? 'reviewer'
              : rule.startsWith('design-')
                ? 'architect'
                : 'implementer';
          const agent = agents.get(agentName);
          if (!agent) {
            const failed = sm.transition(node, 'failed');
            failed.result = {
              output: null,
              durationMs: 0,
              error: `No agent for: ${agentName}`,
            };
            results.push(failed);
            continue;
          }

          let attempt = 0;
          let lastResult: TaskResult | undefined;
          let finalNode: TaskNode = sm.transition(node, 'running');

          while (attempt < maxAttempts) {
            try {
              const result = await agent.execute(finalNode);
              finalNode = sm.transition(finalNode, 'completed');
              finalNode.result = result;
              lastResult = result;
              break;
            } catch (err) {
              attempt++;
              lastResult = {
                output: null,
                durationMs: 0,
                error: (err as Error).message,
              };
              if (attempt < maxAttempts) {
                finalNode.attempts = attempt;
                finalNode = sm.transition(finalNode, 'running');
              }
            }
          }

          if (finalNode.state === 'running') {
            finalNode = sm.transition(finalNode, 'failed');
            finalNode.result = lastResult;
          }

          results.push(finalNode);
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrency, nodes.length) },
        () => worker(),
      );
      await Promise.all(workers);
      return results;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/executor.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/executor.ts orchestrator/tests/executor.test.ts
git commit -m "feat(orchestrator): add parallel executor with concurrency limit"
```

---

### Task 12: Wire Executor into Orchestrator

**Files:**
- Modify: `orchestrator/src/index.ts`
- Test: `orchestrator/tests/integration.test.ts` (extend)

- [ ] **Step 1: Update test with execution check**

Append to `orchestrator/tests/integration.test.ts`:

```typescript
describe('phase 2 integration', () => {
  it('runs task through executor with builtin agents', async () => {
    const { createBuiltinAgents } = await import('../src/agents/builtin.js');
    const { createExecutor } = await import('../src/executor.js');
    const agents = createBuiltinAgents();
    const exec = createExecutor({ agents, concurrency: 2 });
    const node = await createOrchestrator({
      rulesPath: join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md'),
    }).run('implement-auth');
    const results = await exec.execute([node]);
    expect(results[0].state).toBe('completed');
    expect(results[0].result?.output).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd orchestrator && npx vitest run tests/integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add orchestrator/tests/integration.test.ts
git commit -m "test(orchestrator): add phase 2 integration test"
```

---

## Phase 3: Self-Improvement & Persistence

### Task 13: SQLite History

**Files:**
- Create: `orchestrator/src/history.ts`
- Test: `orchestrator/tests/history.test.ts`

- [ ] **Step 1: Write the failing test**

`orchestrator/tests/history.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHistory } from '../src/history.js';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'orch-test-'));
  dbPath = join(dir, 'test.db');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('History', () => {
  it('records and retrieves execution', async () => {
    const hist = await createHistory({ dbPath });
    await hist.record({
      id: 't1',
      task: 'implement-auth',
      rule: 'implement-*',
      state: 'completed',
      durationMs: 100,
      attempts: 1,
    });
    const all = await hist.list();
    expect(all).toHaveLength(1);
    expect(all[0].task).toBe('implement-auth');
  });

  it('aggregates success rate', async () => {
    const hist = await createHistory({ dbPath });
    await hist.record({ id: 'a', task: 't1', rule: 'r', state: 'completed', durationMs: 10, attempts: 1 });
    await hist.record({ id: 'b', task: 't2', rule: 'r', state: 'failed', durationMs: 10, attempts: 2 });
    const stats = await hist.stats();
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
  });

  it('returns empty for no history', async () => {
    const hist = await createHistory({ dbPath });
    const all = await hist.list();
    expect(all).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/history.test.ts`
Expected: FAIL — better-sqlite3 not yet used

- [ ] **Step 3: Create `orchestrator/src/history.ts`**

```typescript
import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

export interface HistoryEntry {
  id: string;
  task: string;
  rule: string;
  state: string;
  durationMs: number;
  attempts: number;
  error?: string;
  createdAt?: number;
}

export interface HistoryStats {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
}

export interface History {
  record(entry: HistoryEntry): Promise<void>;
  list(): Promise<HistoryEntry[]>;
  stats(): Promise<HistoryStats>;
}

export interface HistoryConfig {
  dbPath: string;
}

export async function createHistory(config: HistoryConfig): Promise<History> {
  mkdirSync(dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      rule TEXT NOT NULL,
      state TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      attempts INTEGER NOT NULL,
      error TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO executions
    (id, task, rule, state, duration_ms, attempts, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const selectAll = db.prepare(`SELECT * FROM executions ORDER BY created_at DESC`);
  const countAll = db.prepare(`SELECT COUNT(*) as c FROM executions`);
  const countCompleted = db.prepare(`SELECT COUNT(*) as c FROM executions WHERE state = 'completed'`);
  const countFailed = db.prepare(`SELECT COUNT(*) as c FROM executions WHERE state = 'failed'`);

  return {
    async record(entry) {
      insert.run(
        entry.id,
        entry.task,
        entry.rule,
        entry.state,
        entry.durationMs,
        entry.attempts,
        entry.error ?? null,
        Date.now(),
      );
    },
    async list() {
      const rows = selectAll.all() as Array<{
        id: string;
        task: string;
        rule: string;
        state: string;
        duration_ms: number;
        attempts: number;
        error: string | null;
        created_at: number;
      }>;
      return rows.map((r) => ({
        id: r.id,
        task: r.task,
        rule: r.rule,
        state: r.state,
        durationMs: r.duration_ms,
        attempts: r.attempts,
        error: r.error ?? undefined,
        createdAt: r.created_at,
      }));
    },
    async stats() {
      const total = (countAll.get() as { c: number }).c;
      const completed = (countCompleted.get() as { c: number }).c;
      const failed = (countFailed.get() as { c: number }).c;
      return {
        total,
        completed,
        failed,
        successRate: total === 0 ? 0 : completed / total,
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/history.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add orchestrator/src/history.ts orchestrator/tests/history.test.ts
git commit -m "feat(orchestrator): add SQLite-backed execution history"
```

---

### Task 14: Wire History into Orchestrator

**Files:**
- Modify: `orchestrator/src/index.ts`
- Test: extend `orchestrator/tests/integration.test.ts`

- [ ] **Step 1: Update index.ts to use history**

Replace `orchestrator/src/index.ts` with:

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseRules, matchRule } from './engine.js';
import { createStateMachine, type StateMachine } from './state.js';
import { DEFAULT_CONFIG, type OrchestratorConfig, type RoutingRule, type TaskId, type TaskNode, type TaskState } from './types.js';
import { createHistory, type History, type HistoryEntry } from './history.js';

export interface Orchestrator {
  run(task: string): Promise<TaskNode>;
  getConfig(): OrchestratorConfig;
  listRules(): RoutingRule[];
  getStateMachine(): StateMachine;
  getHistory(): History;
  recordExecution(entry: HistoryEntry): Promise<void>;
}

export async function createOrchestratorAsync(overrides?: Partial<OrchestratorConfig>): Promise<Orchestrator> {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...overrides };
  const stateMachine = createStateMachine();
  const history = await createHistory({ dbPath: resolve(config.dbPath) });

  let cachedRules: RoutingRule[] | null = null;

  const loadRules = (): RoutingRule[] => {
    if (cachedRules) return cachedRules;
    const path = resolve(config.rulesPath);
    if (!existsSync(path)) {
      cachedRules = [];
      return cachedRules;
    }
    const md = readFileSync(path, 'utf-8');
    cachedRules = parseRules(md);
    return cachedRules;
  };

  return {
    async run(task: string): Promise<TaskNode> {
      const rules = loadRules();
      const rule = matchRule(rules, task);
      if (!rule) {
        throw new Error(`No routing rule matched for task: ${task}`);
      }
      const node: TaskNode = {
        id: `t-${Date.now()}` as TaskId,
        rule: rule.id,
        input: { task },
        state: 'pending' as TaskState,
        dependsOn: [],
        attempts: 0,
      };
      return stateMachine.transition(node, 'ready');
    },
    getConfig() {
      return config;
    },
    listRules() {
      return loadRules();
    },
    getStateMachine() {
      return stateMachine;
    },
    getHistory() {
      return history;
    },
    async recordExecution(entry) {
      await history.record(entry);
    },
  };
}

export function createOrchestrator(overrides?: Partial<OrchestratorConfig>): Orchestrator {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...overrides };
  const stateMachine = createStateMachine();
  let cachedRules: RoutingRule[] | null = null;

  const loadRules = (): RoutingRule[] => {
    if (cachedRules) return cachedRules;
    const path = resolve(config.rulesPath);
    if (!existsSync(path)) {
      cachedRules = [];
      return cachedRules;
    }
    const md = readFileSync(path, 'utf-8');
    cachedRules = parseRules(md);
    return cachedRules;
  };

  return {
    async run(task: string): Promise<TaskNode> {
      const rules = loadRules();
      const rule = matchRule(rules, task);
      if (!rule) {
        throw new Error(`No routing rule matched for task: ${task}`);
      }
      const node: TaskNode = {
        id: `t-${Date.now()}` as TaskId,
        rule: rule.id,
        input: { task },
        state: 'pending' as TaskState,
        dependsOn: [],
        attempts: 0,
      };
      return stateMachine.transition(node, 'ready');
    },
    getConfig() {
      return config;
    },
    listRules() {
      return loadRules();
    },
    getStateMachine() {
      return stateMachine;
    },
    getHistory() {
      throw new Error('Use createOrchestratorAsync for history support');
    },
    async recordExecution() {
      throw new Error('Use createOrchestratorAsync for history support');
    },
  };
}

export * from './types.js';
export * from './state.js';
export * from './engine.js';
export * from './history.js';
```

- [ ] **Step 2: Update integration test to cover history**

Add to `orchestrator/tests/integration.test.ts`:

```typescript
describe('phase 3 integration', () => {
  it('async orchestrator records to history', async () => {
    const { createOrchestratorAsync } = await import('../src/index.js');
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'orch-'));
    const orch = await createOrchestratorAsync({
      dbPath: join(dir, 'h.db'),
      rulesPath: join(import.meta.dirname, '..', '..', 'orchestrator', 'astro-orchestrator.md'),
    });
    await orch.recordExecution({
      id: 't1',
      task: 'test',
      rule: 'r',
      state: 'completed',
      durationMs: 50,
      attempts: 1,
    });
    const stats = await orch.getHistory().stats();
    expect(stats.total).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd orchestrator && npx vitest run`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add orchestrator/src/index.ts orchestrator/tests/integration.test.ts
git commit -m "feat(orchestrator): wire history into orchestrator (async API)"
```

---

## Phase 4: OpenCode Integration via MCP

### Task 15: MCP Server

**Files:**
- Create: `orchestrator/src/mcp/server.ts`
- Test: `orchestrator/tests/mcp.test.ts`
- Modify: `orchestrator/package.json`

- [ ] **Step 1: Install MCP SDK**

Run: `cd orchestrator && npm install @modelcontextprotocol/sdk`

- [ ] **Step 2: Write the failing test**

`orchestrator/tests/mcp.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createMcpServer } from '../src/mcp/server.js';

describe('MCP server', () => {
  it('exposes orchestrator tools', () => {
    const server = createMcpServer();
    const tools = server.listTools();
    expect(tools).toContain('run_task');
    expect(tools).toContain('list_tasks');
    expect(tools).toContain('get_status');
  });

  it('runs a task and returns result', async () => {
    const server = createMcpServer();
    const result = await server.call('run_task', { task: 'do-thing' });
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd orchestrator && npx vitest run tests/mcp.test.ts`
Expected: FAIL

- [ ] **Step 4: Create `orchestrator/src/mcp/server.ts`**

```typescript
import type { Orchestrator } from '../index.js';
import { createOrchestrator } from '../index.js';
import { createBuiltinAgents } from '../agents/builtin.js';
import { createExecutor } from '../executor.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServer {
  listTools(): string[];
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export function createMcpServer(orchestrator?: Orchestrator): McpServer {
  const orch = orchestrator ?? createOrchestrator();
  const agents = createBuiltinAgents();

  const tools: McpTool[] = [
    {
      name: 'run_task',
      description: 'Run a task through the orchestrator',
      inputSchema: {
        type: 'object',
        properties: { task: { type: 'string' } },
        required: ['task'],
      },
    },
    {
      name: 'list_tasks',
      description: 'List routing rules',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_status',
      description: 'Get status of a task',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  ];

  return {
    listTools() {
      return tools.map((t) => t.name);
    },
    async call(name, args) {
      switch (name) {
        case 'run_task': {
          const task = args.task as string;
          const node = await orch.run(task);
          const exec = createExecutor({ agents, concurrency: 1 });
          const [result] = await exec.execute([node]);
          return result;
        }
        case 'list_tasks':
          return orch.listRules();
        case 'get_status':
          return { id: args.id, state: 'pending' };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd orchestrator && npx vitest run tests/mcp.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add orchestrator/src/mcp/server.ts orchestrator/tests/mcp.test.ts orchestrator/package.json orchestrator/package-lock.json
git commit -m "feat(orchestrator): add MCP server exposing orchestrator tools"
```

---

### Task 16: OpenCode Configuration

**Files:**
- Create: `orchestrator/opencode-integration.json`
- Modify: `opencode.json` (root, if exists) or create stub

- [ ] **Step 1: Create integration manifest**

`orchestrator/opencode-integration.json`:

```json
{
  "name": "astro-orchestrator",
  "version": "0.1.0",
  "type": "mcp-server",
  "entry": "./dist/mcp/server.js",
  "tools": [
    { "name": "run_task", "description": "Run a task" },
    { "name": "list_tasks", "description": "List rules" },
    { "name": "get_status", "description": "Get status" }
  ]
}
```

- [ ] **Step 2: Add MCP run script to package.json**

Edit `orchestrator/package.json` `scripts` section — add:

```json
"start:mcp": "node dist/mcp/server.js"
```

- [ ] **Step 3: Build and verify**

Run: `cd orchestrator && npm run build`
Expected: `dist/` contains `cli.js`, `index.js`, `mcp/server.js`

- [ ] **Step 4: Run full test suite**

Run: `cd orchestrator && npm test`
Expected: all tests pass

- [ ] **Step 5: Verify CLI works**

Run: `cd orchestrator && node dist/cli.js list`
Expected: prints parsed rules from `orchestrator/astro-orchestrator.md`

- [ ] **Step 6: Commit**

```bash
git add orchestrator/opencode-integration.json orchestrator/package.json
git commit -m "feat(orchestrator): add OpenCode MCP integration manifest"
```

---

### Task 17: Final Verification

- [ ] **Step 1: Run full test suite with coverage**

Run: `cd orchestrator && npx vitest run --coverage`
Expected: 80%+ coverage on `src/`

- [ ] **Step 2: Lint check**

Run: `cd orchestrator && npm run lint`
Expected: no TypeScript errors

- [ ] **Step 3: Build production**

Run: `cd orchestrator && npm run build`
Expected: clean build

- [ ] **Step 4: CLI smoke test**

Run:
```bash
cd orchestrator && node dist/cli.js help
cd orchestrator && node dist/cli.js list
```
Expected: help text + rule list

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(orchestrator): phase 1-4 complete, all tests passing" --allow-empty
```

---

## Summary

- **17 tasks** across **4 phases**
- Each task has failing test → implementation → passing test → commit
- TDD throughout, frequent commits
- Phase 1 (Tasks 1-7): Core engine
- Phase 2 (Tasks 8-12): Parallel execution
- Phase 3 (Tasks 13-14): Persistence
- Phase 4 (Tasks 15-17): MCP integration
