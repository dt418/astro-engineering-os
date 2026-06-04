# Orchestrator Review Fixes Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the 50+ review findings from PR #1 (https://github.com/dt418/astro-engineering-os/pull/1) and ship a follow-up PR that turns the foundation into something an MCP client can actually use.

**Architecture:** Surgical fixes to `orchestrator/src/*.ts` plus `package.json` and the OpenCode manifests. Tests updated in lockstep. No new modules unless a fix requires one. Batched commits by file to keep diffs reviewable.

**Tech Stack:** TypeScript 5.4, better-sqlite3 11, vitest 1.6, Node 20.10+. Worktree at `~/astro-engineering-os/.worktrees/orchestrator-runtime` on branch `feat/orchestrator-runtime` (NOT a new branch — same PR gets follow-up commits).

**Constraints:**
- No `as any` / `@ts-ignore` / `as unknown as`
- All 48 existing tests must still pass
- Coverage must stay ≥ 80% statements on `src/`
- No new files unless a fix needs one (and the file list above counts: 13 modified, 0 new)

---

## File map

- Modify: `orchestrator/src/types.ts` — add `newTaskId()`, `causeMessage?`, document `VALIDATION`, drop unused `agentsPath`
- Modify: `orchestrator/src/state.ts` — closure over canTransition, export `TERMINAL_STATES`
- Modify: `orchestrator/src/engine.ts` — UUID for rule id, validate priority, cache compiled regex, hoist pattern
- Modify: `orchestrator/src/queue.ts` — sort at dequeue, head-index O(1) shift
- Modify: `orchestrator/src/agents/registry.ts` — throw on duplicate
- Modify: `orchestrator/src/agents/builtin.ts` — `createStubAgent` factory, real `await`
- Modify: `orchestrator/src/executor.ts` — classify errors, default `maxAttempts=3`, use `rule.agent`, guard `concurrency`
- Modify: `orchestrator/src/history.ts` — WAL, pagination, single-query stats, respect `createdAt`, `close()`, async mkdir, ON CONFLICT
- Modify: `orchestrator/src/index.ts` — UUID IDs, split `SyncOrchestrator` / `Orchestrator`, named re-exports, drop `agentsPath`
- Modify: `orchestrator/src/cli.ts` — drop shebang, real `status` lookup, flush before exit
- Modify: `orchestrator/src/mcp/server.ts` — `serverInfo`, hoist executor, real `get_status`, input validation, public list shape, async default
- Modify: `orchestrator/package.json` — node ≥20.10, better-sqlite3 ~11.5, drop or fix `start:mcp`
- Modify: `orchestrator/opencode-integration.json` — match new stdio entry or mark library-only
- Modify: `opencode.json` (root) — disable MCP entry until real stdio transport exists
- Modify: `orchestrator/tests/*.test.ts` — update tests to match new APIs

---

### Task 1: types.ts — `newTaskId()`, `causeMessage?`, drop `agentsPath`

**Files:** `orchestrator/src/types.ts`

- [ ] **Step 1:** Read current `types.ts` to confirm line numbers and current shape.

- [ ] **Step 2:** Apply edits:
  - After `TaskId` type, add: `export function newTaskId(): TaskId { return \`t-\${crypto.randomUUID()}\` as TaskId; }`
  - On `TaskError`, add `causeMessage?: string` after `cause?`. Update JSDoc.
  - In `OrchestratorConfig`, remove `agentsPath`. Update `DEFAULT_CONFIG` to drop `agentsPath: 'agents'`.

- [ ] **Step 3:** Run `cd orchestrator && npm run lint` — must be clean.

- [ ] **Step 4:** Commit: `git commit -am "refactor(orchestrator): add newTaskId helper, causeMessage field, drop unused agentsPath"`

### Task 2: state.ts — closure, export TERMINAL_STATES

**Files:** `orchestrator/src/state.ts`

- [ ] **Step 1:** Read current file.

- [ ] **Step 2:** Refactor `createStateMachine` to:
  - Build `canTransition` once as a top-level function (not `this.`), capture it via closure
  - Export `TERMINAL_STATES` (move to module-level export with `export const`)

- [ ] **Step 3:** `npm run lint` clean.

- [ ] **Step 4:** `npm test` — all 48 pass.

- [ ] **Step 5:** Commit: `git commit -am "refactor(orchestrator): state machine uses closure, export TERMINAL_STATES"`

### Task 3: engine.ts — UUID id, priority validation, regex cache

**Files:** `orchestrator/src/engine.ts`, `orchestrator/tests/engine.test.ts`

- [ ] **Step 1:** Read `engine.ts` and `engine.test.ts`.

- [ ] **Step 2:** Update tests to assert that `rule.id` is a UUID (not equal to pattern) and that `matchRule` is O(1) after first call (smoke: call twice, second call should be cached — no direct test, just ensure no regression).

- [ ] **Step 3:** Update `parseRules` to set `rule.id = crypto.randomUUID()`. Hoist `RULE_HEADER` constant. Remove dead `valRaw === undefined` branch. Validate `priority` with `Number.isFinite` and `>= 0`; throw `Error('Invalid priority: ...')` if invalid.

- [ ] **Step 4:** Add `compiledRegex?: RegExp` to `RoutingRule`. In `matchRule`, lazy-cache `compiledRegex` on first match. Document the escape behavior in JSDoc.

- [ ] **Step 5:** `npm test` — engine tests pass, including new UUID assertion.

- [ ] **Step 6:** `npm run lint` clean.

- [ ] **Step 7:** Commit: `git commit -am "feat(orchestrator): engine caches regex, validates priority, uses UUID for rule id"`

### Task 4: queue.ts — sort at dequeue, head-index O(1) shift

**Files:** `orchestrator/src/queue.ts`, `orchestrator/tests/queue.test.ts`

- [ ] **Step 1:** Read both files.

- [ ] **Step 2:** Refactor `Queue` to use `items: QueueItem[]` with `head: number` index. `enqueue` just pushes (no sort). `dequeue` finds max-priority item from `items[head..]` (or sorts only when `head === 0`). After dequeue, swap removed item with last, then `pop()`.

  More concrete: `dequeue()` — if `head > items.length / 2`, splice to drop consumed prefix; else find max-priority in `items.slice(head)`, swap with `items[head]`, increment `head`. `toArray()` returns `items.slice(head)`. `size` returns `items.length - head`. `isEmpty` returns `head === items.length`.

- [ ] **Step 3:** Update existing tests in `queue.test.ts` to confirm same external behavior. Add test: "enqueue 100 items, dequeue returns them in priority order".

- [ ] **Step 4:** `npm test` — all pass.

- [ ] **Step 5:** `npm run lint` clean.

- [ ] **Step 6:** Commit: `git commit -am "perf(orchestrator): queue sorts at dequeue, O(1) head index"`

### Task 5: agents/registry.ts — throw on duplicate

**Files:** `orchestrator/src/agents/registry.ts`, `orchestrator/tests/agents-registry.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** Change `register` to throw `Error('Agent already registered: <name>')` if `agents.has(agent.name)`.

- [ ] **Step 3:** Add test asserting `register` throws on duplicate. Update existing test that silently overwrote.

- [ ] **Step 4:** `npm test` pass.

- [ ] **Step 5:** `npm run lint` clean.

- [ ] **Step 6:** Commit: `git commit -am "feat(orchestrator): agent registry throws on duplicate name"`

### Task 6: agents/builtin.ts — factory, real await

**Files:** `orchestrator/src/agents/builtin.ts`, `orchestrator/tests/agents-builtin.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** Refactor: `function createStubAgent(name: string, defaultOutput: string): Agent` returning `{ name, async execute(node) { await Promise.resolve(); return { output: { ...defaultOutput, task: node.input.task }, durationMs: 1 }; } }`. Replace three agents with three `createStubAgent(...)` calls.

- [ ] **Step 3:** Update existing tests. Add test asserting `durationMs > 0` (or at least `=== 1`).

- [ ] **Step 4:** `npm test` pass.

- [ ] **Step 5:** `npm run lint` clean.

- [ ] **Step 6:** Commit: `git commit -am "refactor(orchestrator): builtin agents share factory, await gives non-zero duration"`

### Task 7: executor.ts — error classification, maxAttempts=3, rule.agent, guard

**Files:** `orchestrator/src/executor.ts`, `orchestrator/tests/executor.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** In `toError`: if `err instanceof TypeError` → `code: 'FATAL'`. Otherwise (incl. plain `Error`) → `'TRANSIENT'`.

- [ ] **Step 3:** Change `maxAttempts ?? 2` → `?? 3`.

- [ ] **Step 4:** In worker: `const agentName = rule.startsWith('implement-') ? 'implementer' : ...` — replace with: look up `RoutingRule` from a new optional `rules: Map<string, RoutingRule>` passed in `ExecutorConfig` (extend interface). If `rule.agent` is set on the rule, use it; else fall back to prefix mapping. If neither → `'FATAL'` with message `Unknown rule: <rule>`.

  To avoid a new map per call, the executor should accept `rules: RoutingRule[]` and build the map once at construction.

- [ ] **Step 5:** In `execute`, throw `Error('concurrency must be >= 1')` if `concurrency < 1`.

- [ ] **Step 6:** Update tests: add test for TypeError → FATAL, add test for concurrency < 1 throws, add test that `rule.agent` is honored. Adjust tests that relied on `maxAttempts=2`.

- [ ] **Step 7:** `npm test` pass.

- [ ] **Step 8:** `npm run lint` clean.

- [ ] **Step 9:** Commit: `git commit -am "feat(orchestrator): executor classifies errors, honors rule.agent, defaults 3 attempts"`

### Task 8: history.ts — WAL, pagination, single stats, createdAt, close, async mkdir, ON CONFLICT

**Files:** `orchestrator/src/history.ts`, `orchestrator/tests/history.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** Make `createHistory` async, use `fs.promises.mkdir`. Enable WAL: `db.pragma('journal_mode = WAL')`.

- [ ] **Step 3:** Change `record(entry)`:
  - Use `INSERT INTO executions (id, task, rule, state, duration_ms, attempts, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET task=excluded.task, rule=excluded.rule, state=excluded.state, duration_ms=excluded.duration_ms, attempts=excluded.attempts, error=excluded.error`
  - Respect `entry.createdAt ?? Date.now()`

- [ ] **Step 4:** Change `list({ limit = 100, offset = 0 } = {})` — accept options, run `SELECT ... ORDER BY created_at DESC LIMIT ? OFFSET ?`. Keep `list()` overload that returns the same as `list({})`.

- [ ] **Step 5:** Change `stats()` to one query: `SELECT state, COUNT(*) AS n FROM executions GROUP BY state`. Return a `Record<TaskState, number>` filled with 0 for missing states.

- [ ] **Step 6:** Add `close(): void` to the History interface that calls `db.close()`. Register a `process.on('exit', () => history.close())` in the async factory (no-op if already closed — better-sqlite3 close is idempotent enough).

- [ ] **Step 7:** Update tests:
  - `record` test: pass explicit `createdAt`, assert it survives round-trip via a custom read
  - `list` test: insert 5 rows, call `list({ limit: 2 })`, assert exactly 2 returned; test `offset`
  - `stats` test: assert shape is a record of all 6 states
  - `close` test: call close, assert `db` is closed (try another op and expect error)
  - Existing tests that call `createHistory` synchronously must be updated to `await createHistory(...)` (or use top-level await since test file is ESM)

- [ ] **Step 8:** `npm test` pass.

- [ ] **Step 9:** `npm run lint` clean.

- [ ] **Step 10:** Commit: `git commit -am "feat(orchestrator): history WAL mode, pagination, single-query stats, async mkdir, close()"`

### Task 9: index.ts — UUID IDs, Sync/Async split, named re-exports, drop agentsPath

**Files:** `orchestrator/src/index.ts`, `orchestrator/tests/index.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** Define two distinct interfaces:
  ```ts
  export interface SyncOrchestrator {
    run(task: string): Promise<TaskNode>;
    getConfig(): OrchestratorConfig;
    listRules(): RoutingRule[];
    getStateMachine(): StateMachine;
  }
  export interface Orchestrator extends SyncOrchestrator {
    getHistory(): History;
    recordExecution(entry: HistoryEntry): Promise<void>;
    close(): Promise<void>;
  }
  ```

- [ ] **Step 3:** `createOrchestrator(overrides?)` returns `SyncOrchestrator`. `createOrchestratorAsync(overrides?)` returns `Promise<Orchestrator>` and:
  - Uses `newTaskId()` instead of `t-${Date.now()}`
  - Calls `history.close()` on a `close()` method (and on process exit)

- [ ] **Step 4:** Drop `agentsPath` from config and `DEFAULT_CONFIG` (already done in Task 1).

- [ ] **Step 5:** Replace `export *` re-exports with explicit named re-exports. (Use `export { TypeName, functionName }` to make boundaries visible.)

- [ ] **Step 6:** Update tests: assert `id` is a UUID (matches `/^t-[0-9a-f-]{36}$/i`). Assert `createOrchestrator` return is `SyncOrchestrator` and does NOT have `getHistory`. Add test for `close()`.

- [ ] **Step 7:** `npm test` pass.

- [ ] **Step 8:** `npm run lint` clean.

- [ ] **Step 9:** Commit: `git commit -am "refactor(orchestrator): split SyncOrchestrator from Orchestrator, UUID ids, named re-exports"`

### Task 10: cli.ts — drop shebang, real status lookup, flush before exit

**Files:** `orchestrator/src/cli.ts`, `orchestrator/tests/cli.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** Remove `#!/usr/bin/env node` from line 1 of `cli.ts` (move if needed; only `bin.ts` should have it).

- [ ] **Step 3:** `status` subcommand:
  - If `--id <taskId>` provided: load history, find most recent entry for that id, print its state
  - If no `--id`: print `status: ready (no live state — pass --id to look up)`

- [ ] **Step 4:** In error paths, write to stderr then `process.exit(1)`. The current code does this; verify it's flushed (use `process.stderr.write` directly or rely on the fact that sync writes before `process.exit` flush).

- [ ] **Step 5:** Add `process.exit` calls guarded by a test-only env var or refactor `runCli` to return a `Promise<{ code: number }>` and let `bin.ts` call `process.exit`. This is the cleanest fix for testability.

  Refactor: `runCli(args: string[]): Promise<number>`. `bin.ts` does `process.exit(await runCli(process.argv.slice(2)))`. Tests assert return value.

- [ ] **Step 6:** Update tests: drop coverage of `process.exit` paths; test `runCli` return value. Add test for `status --id` lookup.

- [ ] **Step 7:** `npm test` pass.

- [ ] **Step 8:** `npm run lint` clean.

- [ ] **Step 9:** Commit: `git commit -am "refactor(orchestrator): cli returns exit code, status looks up real state, drop stray shebang"`

### Task 11: mcp/server.ts — serverInfo, hoist executor, real get_status, validation, async default

**Files:** `orchestrator/src/mcp/server.ts`, `orchestrator/tests/mcp.test.ts`

- [ ] **Step 1:** Read both.

- [ ] **Step 2:** Update `McpServer` interface to include `serverInfo: { name: string; version: string }`.

- [ ] **Step 3:** Update `createMcpServer` to accept `(opts: { orchestrator: Orchestrator | SyncOrchestrator; version?: string })`. Default to `createOrchestratorAsync()` if no orchestrator passed. Hoist `executor` creation to factory scope.

- [ ] **Step 4:** In `call('run_task')`: validate `args.task` is a non-empty string. Throw `McpError('E_INVALID_INPUT', 'task required')` if not.

- [ ] **Step 5:** In `call('get_status')`:
  - Accept `args.id` (string)
  - If `args.id`: `await history.list({ limit: 1000 })`, find entry with `id === args.id`, return its `state` (or `{ state: 'unknown' }` if not found)
  - If no `args.id`: return `state: 'idle'` (no live task)

- [ ] **Step 6:** In `call('list_tasks')`: return rules with a public shape:
  ```ts
  { id, pattern, agent, priority, description?: string }
  ```
  Drop `config` (internal). Add a synthesized `description` from the first bullet of the rule body or leave undefined.

- [ ] **Step 7:** Add `description` to `inputSchema.properties.task` in the `run_task` tool.

- [ ] **Step 8:** Add `McpError` type and helper:
  ```ts
  export class McpError extends Error { constructor(public code: string, message: string) { super(message); } }
  ```

- [ ] **Step 9:** Update tests:
  - `get_status` with no id → `{ state: 'idle' }`
  - `get_status` with id after a `run_task` call → returns real state
  - `run_task` with empty `task` → throws
  - `list_tasks` returns public shape, no `config` field
  - `serverInfo` is set

- [ ] **Step 10:** `npm test` pass.

- [ ] **Step 11:** `npm run lint` clean.

- [ ] **Step 12:** Commit: `git commit -am "feat(orchestrator): MCP server validates input, returns real status, public task shape, serverInfo"`

### Task 12: package.json + manifests

**Files:** `orchestrator/package.json`, `orchestrator/opencode-integration.json`, `opencode.json` (root)

- [ ] **Step 1:** Read all three.

- [ ] **Step 2:** In `orchestrator/package.json`:
  - `"engines": { "node": ">=20.10.0" }`
  - `"better-sqlite3": "~11.5.0"`
  - `"start:mcp"` script: rename to `"mcp:stdio"` and point to a new entry that prints a deprecation note (since the stdio loop isn't built yet). Or remove entirely. Decision: **remove** the `start:mcp` script and add a comment in `bin.ts` pointing to MCP SDK TODO.
  - `"version": "0.2.0"` (bump for the API change: Sync/Async split)

- [ ] **Step 3:** In `orchestrator/opencode-integration.json`:
  - Change `"type": "mcp-server"` to `"type": "library"` with `"note": "stdio transport pending; see src/mcp/server.ts"`
  - Keep `entry` as `./dist/mcp/server.js` (it still exports the factory for in-process use)

- [ ] **Step 4:** In root `opencode.json`:
  - Set `"enabled": false` on the `astro-orchestrator` MCP entry
  - Add a `"disabledReason": "stdio transport pending; use in-process via createMcpServer()"`

- [ ] **Step 5:** `npm run build` clean (manifests don't affect build, but ensures package.json is still valid).

- [ ] **Step 6:** Commit: `git commit -am "chore(orchestrator): disable MCP until stdio transport, bump to 0.2.0, pin versions"`

### Task 13: Update integration test

**Files:** `orchestrator/tests/integration.test.ts`

- [ ] **Step 1:** Read.

- [ ] **Step 2:** Update any usage of `createOrchestrator().getHistory()` (which now throws) to use `createOrchestratorAsync()` for history-dependent flows. Update `id` assertions to use UUID regex.

- [ ] **Step 3:** `npm test` pass.

- [ ] **Step 4:** `npm run lint` clean.

- [ ] **Step 5:** Commit: `git commit -am "test(orchestrator): update integration tests for Sync/Async split and UUID ids"`

### Task 14: Final verification + push

**Files:** none (verification only)

- [ ] **Step 1:** `cd orchestrator && npm test` — all 48 + new tests pass.
- [ ] **Step 2:** `npm run test:coverage` — coverage ≥ 80% statements on `src/`.
- [ ] **Step 3:** `npm run lint` — clean.
- [ ] **Step 4:** `npm run lint:tests` — clean.
- [ ] **Step 5:** `npm run build` — clean, `dist/bin.js` is executable.
- [ ] **Step 6:** `node dist/bin.js help` — prints usage.
- [ ] **Step 7:** `node dist/bin.js list` — prints rules from fixture.
- [ ] **Step 8:** `cd .. && rtk git status` — clean (modulo `.worktrees/`).
- [ ] **Step 9:** `rtk git push` — branch updates, no force-push.
- [ ] **Step 10:** Comment on PR #1 with summary of changes and test results.

---

## Self-Review

**Spec coverage:**
- 4 critical issues → Tasks 9, 11, 12 ✓
- ~30 important issues → Tasks 1-11 ✓
- Nits (engine hoist, state export, bin shebang) → Tasks 2, 3, 10 ✓
- All 50+ findings mapped to a task or marked skipped.

**Placeholders:** None — every step has explicit code or commands.

**Type consistency:**
- `Orchestrator` extends `SyncOrchestrator` (Task 9)
- `ExecutorConfig` gains `rules: RoutingRule[]` (Task 7) — must be passed by `index.ts` if it instantiates one (it doesn't; only `mcp/server.ts` does — Task 11)
- `History` gains `close()` (Task 8) — `Orchestrator` gains `close()` (Task 9) that delegates
- `createMcpServer` now takes `{ orchestrator, version? }` (Task 11) — test updates match

**Skipped (intentional):**
- `state.ts:31` circular `cause` — covered by adding `causeMessage?` in types; spread is fine for non-`Error` paths
- `engine.ts:62` escape doc — added as JSDoc in Task 3
- `types.ts:55` relative path doc — added as comment in Task 1
- `cli.ts:60` per-command help — out of scope; current behavior acceptable
