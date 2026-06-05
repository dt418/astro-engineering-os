# Sub-Spec 3: Learning Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement observability-first learning layer with telemetry collection, analytics, pattern detection, and recommendation generation.

**Architecture:** Sidecar analytics layer extending history.ts. Event-sourced telemetry stored in SQLite. Structured JSON as canonical output. CLI and REST API for human interaction.

**Tech Stack:** TypeScript, SQLite (3-tier: better-sqlite3 > sql.js > in-memory), Node.js

**Worktree:** `/home/thanh/astro-engineering-os/.worktrees/sub-spec-3-learning`

---

## File Structure

```
orchestrator/src/
├── learning/
│   ├── index.ts                    # Public API exports
│   ├── telemetry/
│   │   ├── collector.ts            # Event emission
│   │   ├── store.ts                # SQLite storage
│   │   └── events.ts               # Event types
│   ├── analytics/
│   │   ├── engine.ts               # Metrics computation
│   │   ├── metrics.ts              # Metric types
│   │   └── queries.ts              # Telemetry queries
│   ├── patterns/
│   │   ├── detector.ts             # Pattern identification
│   │   ├── types.ts                # Pattern types
│   │   └── thresholds.ts           # Configurable thresholds
│   ├── recommendations/
│   │   ├── engine.ts               # Recommendation generation
│   │   └── generators.ts           # Per-type generators
│   ├── scheduler/
│   │   ├── analyzer.ts              # Analysis runner
│   │   └── scheduler.ts            # Periodic scheduling
│   └── governance/
│       ├── layer.ts                # Approval workflow
│       ├── tickets.ts              # Ticket management
│       └── audit.ts                # Audit trail
├── analytics-cli.ts                # CLI commands
└── analytics-api.ts                # REST API routes
```

---

## Task 1: Telemetry Event Types

**Files:**
- Create: `orchestrator/src/learning/telemetry/events.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/telemetry/events.test.ts
import { describe, it, expect } from 'vitest';
import {
  type TelemetryEvent,
  type ExecutionPayload,
  type ClassificationPayload,
  type ReviewerPayload,
  type WorkflowPayload,
  type EventType,
  createTelemetryEvent,
} from '../../src/learning/telemetry/events.js';

describe('TelemetryEvent', () => {
  it('creates execution event with required fields', () => {
    const payload: ExecutionPayload = {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test-skill',
      durationMs: 100,
      success: true,
    };
    const event = createTelemetryEvent('execution.completed', payload);
    
    expect(event.id).toBeDefined();
    expect(event.type).toBe('execution.completed');
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.payload).toEqual(payload);
  });

  it('creates classification event with confidence', () => {
    const payload: ClassificationPayload = {
      intent: 'code-review',
      confidence: 0.95,
      signals: ['keyword:review', 'keyword:code'],
    };
    const event = createTelemetryEvent('classification.confidence', payload, 'req-123', 'code-review');
    
    expect(event.requestId).toBe('req-123');
    expect(event.intent).toBe('code-review');
  });

  it('creates reviewer event with outcome', () => {
    const payload: ReviewerPayload = {
      reviewerId: 'expert-reviewer',
      outcome: 'approved',
      durationMs: 250,
    };
    const event = createTelemetryEvent('reviewer.completed', payload);
    
    expect(event.payload.outcome).toBe('approved');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/telemetry/events.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/telemetry/events.ts
import { randomUUID } from 'node:crypto';

export type EventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'classification.confidence'
  | 'classification.resolved'
  | 'reviewer.invoked'
  | 'reviewer.completed'
  | 'workflow.completed';

export interface ExecutionPayload {
  taskId: string;
  taskType: 'skill' | 'workflow' | 'reviewer';
  taskName: string;
  durationMs?: number;
  success?: boolean;
  error?: string;
}

export interface ClassificationPayload {
  intent: string;
  confidence: number;
  signals: string[];
}

export interface ReviewerPayload {
  reviewerId: string;
  outcome: 'approved' | 'rejected' | 'skipped';
  durationMs?: number;
}

export interface WorkflowPayload {
  workflowId: string;
  outcome: 'completed' | 'failed' | 'cancelled';
  durationMs?: number;
  taskCount?: number;
}

export type EventPayload = ExecutionPayload | ClassificationPayload | ReviewerPayload | WorkflowPayload;

export interface TelemetryEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  requestId?: string;
  intent?: string;
  payload: EventPayload;
}

export function createTelemetryEvent(
  type: EventType,
  payload: EventPayload,
  requestId?: string,
  intent?: string,
): TelemetryEvent {
  return {
    id: randomUUID(),
    type,
    timestamp: new Date(),
    requestId,
    intent,
    payload,
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/telemetry/events.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
cd .worktrees/sub-spec-3-learning
git add orchestrator/src/learning/telemetry/events.ts orchestrator/tests/learning/telemetry/events.test.ts
git commit -m "feat(learning): add telemetry event types"
```

---

## Task 2: TelemetryStore

**Files:**
- Create: `orchestrator/src/learning/telemetry/store.ts`
- Modify: `orchestrator/src/learning/index.ts`
- Test: `orchestrator/tests/learning/telemetry/store.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/telemetry/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTelemetryStore, type TelemetryStore, type TelemetryQuery, type TimeRange } from '../../src/learning/telemetry/store.js';
import { createTelemetryEvent, type ExecutionPayload } from '../../src/learning/telemetry/events.js';

describe('TelemetryStore', () => {
  let store: TelemetryStore;

  beforeEach(async () => {
    store = await createTelemetryStore({ dbPath: ':memory:' });
  });

  afterEach(() => {
    store.close();
  });

  it('stores and retrieves telemetry events', async () => {
    const payload: ExecutionPayload = {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test-skill',
      durationMs: 100,
      success: true,
    };
    const event = createTelemetryEvent('execution.completed', payload, 'req-1', 'test-intent');
    
    await store.store(event);
    
    const retrieved = await store.query({ requestId: 'req-1' });
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].payload).toEqual(payload);
  });

  it('queries events by time range', async () => {
    const now = new Date();
    const event = createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test',
    });
    
    await store.store(event);
    
    const range: TimeRange = { start: new Date(now.getTime() - 60000), end: new Date(now.getTime() + 60000) };
    const results = await store.query({ timeRange: range });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('queries events by event type', async () => {
    const event = createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test',
    });
    
    await store.store(event);
    
    const results = await store.query({ types: ['execution.completed'] });
    expect(results.every(e => e.type === 'execution.completed')).toBe(true);
  });

  it('returns stats for time range', async () => {
    const event = createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test',
      success: true,
    });
    
    await store.store(event);
    
    const stats = await store.getStats({ days: 1 });
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.byType).toHaveProperty('execution.completed');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/telemetry/store.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/telemetry/store.ts
import type { TelemetryEvent, EventType } from './events.js';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface TelemetryQuery {
  requestId?: string;
  intent?: string;
  types?: EventType[];
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

export interface TelemetryStats {
  total: number;
  byType: Record<EventType, number>;
  byIntent: Record<string, number>;
}

export interface TelemetryStore {
  store(event: TelemetryEvent): Promise<void>;
  query(filter: TelemetryQuery): Promise<TelemetryEvent[]>;
  getStats(timeRange: TimeRange): Promise<TelemetryStats>;
  close(): void;
}

export interface TelemetryStoreOptions {
  dbPath: string;
  retentionDays?: number;
}

// In-memory implementation for testing
function createInMemoryStore(): TelemetryStore {
  const store = new Map<string, TelemetryEvent & { createdAt: number }>();

  return {
    async store(event) {
      store.set(event.id, { ...event, createdAt: Date.now() });
    },
    async query(filter) {
      let results = [...store.values()];
      
      if (filter.requestId) {
        results = results.filter(e => e.requestId === filter.requestId);
      }
      if (filter.intent) {
        results = results.filter(e => e.intent === filter.intent);
      }
      if (filter.types?.length) {
        results = results.filter(e => filter.types!.includes(e.type));
      }
      if (filter.timeRange) {
        results = results.filter(e => 
          e.timestamp >= filter.timeRange!.start && 
          e.timestamp <= filter.timeRange!.end
        );
      }
      
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? 100;
      return results.slice(offset, offset + limit);
    },
    async getStats(timeRange) {
      const events = await this.query({ timeRange });
      const byType: Record<string, number> = {};
      const byIntent: Record<string, number> = {};
      
      for (const event of events) {
        byType[event.type] = (byType[event.type] ?? 0) + 1;
        if (event.intent) {
          byIntent[event.intent] = (byIntent[event.intent] ?? 0) + 1;
        }
      }
      
      return {
        total: events.length,
        byType: byType as Record<EventType, number>,
        byIntent,
      };
    },
    close() {
      store.clear();
    },
  };
}

export async function createTelemetryStore(options: TelemetryStoreOptions): Promise<TelemetryStore> {
  // Use in-memory for testing (':memory:' path)
  if (options.dbPath === ':memory:') {
    return createInMemoryStore();
  }
  
  // Production: use SQLite
  return createInMemoryStore(); // TODO: implement SQLite version
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/telemetry/store.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/telemetry/store.ts orchestrator/src/learning/index.ts orchestrator/tests/learning/telemetry/store.test.ts
git commit -m "feat(learning): add telemetry store with query support"
```

---

## Task 3: TelemetryCollector

**Files:**
- Create: `orchestrator/src/learning/telemetry/collector.ts`
- Test: `orchestrator/tests/learning/telemetry/collector.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/telemetry/collector.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TelemetryCollector, createTelemetryCollector } from '../../src/learning/telemetry/collector.js';
import type { TelemetryStore } from '../../src/learning/telemetry/store.js';
import { createTelemetryEvent, type ExecutionPayload } from '../../src/learning/telemetry/events.js';

describe('TelemetryCollector', () => {
  it('emits events to store', async () => {
    const mockStore: TelemetryStore = {
      store: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ total: 0, byType: {}, byIntent: {} }),
      close: vi.fn(),
    };
    
    const collector = createTelemetryCollector(mockStore);
    
    const payload: ExecutionPayload = {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'test-skill',
      durationMs: 100,
      success: true,
    };
    
    collector.emit(createTelemetryEvent('execution.completed', payload, 'req-1', 'test-intent'));
    
    await collector.flush();
    
    expect(mockStore.store).toHaveBeenCalledTimes(1);
  });

  it('queues events without blocking', () => {
    const mockStore: TelemetryStore = {
      store: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }),
      query: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ total: 0, byType: {}, byIntent: {} }),
      close: vi.fn(),
    };
    
    const collector = createTelemetryCollector(mockStore);
    const start = Date.now();
    
    // Emit multiple events - should not block
    collector.emit(createTelemetryEvent('execution.started', { taskId: 't1', taskType: 'skill', taskName: 's1' }));
    collector.emit(createTelemetryEvent('execution.started', { taskId: 't2', taskType: 'skill', taskName: 's2' }));
    collector.emit(createTelemetryEvent('execution.started', { taskId: 't3', taskType: 'skill', taskName: 's3' }));
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50); // Should be nearly instant
  });

  it('flushes all pending events', async () => {
    const mockStore: TelemetryStore = {
      store: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ total: 0, byType: {}, byIntent: {} }),
      close: vi.fn(),
    };
    
    const collector = createTelemetryCollector(mockStore);
    
    for (let i = 0; i < 5; i++) {
      collector.emit(createTelemetryEvent('execution.started', { 
        taskId: `task-${i}`, 
        taskType: 'skill', 
        taskName: `skill-${i}` 
      }));
    }
    
    await collector.flush();
    
    expect(mockStore.store).toHaveBeenCalledTimes(5);
    expect(collector.getQueueSize()).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/telemetry/collector.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/telemetry/collector.ts
import type { TelemetryEvent } from './events.js';
import type { TelemetryStore } from './store.js';

export interface TelemetryCollector {
  emit(event: TelemetryEvent): void;
  flush(): Promise<void>;
  getQueueSize(): number;
}

export function createTelemetryCollector(store: TelemetryStore): TelemetryCollector {
  const queue: TelemetryEvent[] = [];
  let flushing = false;

  return {
    emit(event: TelemetryEvent) {
      queue.push(event);
      
      // Async flush if queue exceeds threshold
      if (queue.length >= 10 && !flushing) {
        this.flush().catch(console.error);
      }
    },
    
    async flush(): Promise<void> {
      if (queue.length === 0) return;
      
      flushing = true;
      const toFlush = queue.splice(0, queue.length);
      
      try {
        await Promise.all(toFlush.map(event => store.store(event)));
      } finally {
        flushing = false;
      }
    },
    
    getQueueSize(): number {
      return queue.length;
    },
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/telemetry/collector.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/telemetry/collector.ts orchestrator/tests/learning/telemetry/collector.test.ts
git commit -m "feat(learning): add telemetry collector with async flush"
```

---

## Task 4: Analytics Engine

**Files:**
- Create: `orchestrator/src/learning/analytics/engine.ts`
- Create: `orchestrator/src/learning/analytics/metrics.ts`
- Create: `orchestrator/src/learning/analytics/queries.ts`
- Test: `orchestrator/tests/learning/analytics/engine.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/analytics/engine.test.ts
import { describe, it, expect } from 'vitest';
import { AnalyticsEngine, createAnalyticsEngine } from '../../src/learning/analytics/engine.js';
import type { TelemetryStore } from '../../src/learning/telemetry/store.js';
import { createTelemetryEvent } from '../../src/learning/telemetry/events.js';

describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;
  let mockStore: TelemetryStore;

  beforeEach(async () => {
    mockStore = await createMockStore();
    engine = createAnalyticsEngine(mockStore);
  });

  it('computes execution duration metrics', async () => {
    // Add execution events with durations
    for (let i = 0; i < 10; i++) {
      await mockStore.store(createTelemetryEvent('execution.completed', {
        taskId: `task-${i}`,
        taskType: 'skill',
        taskName: 'test-skill',
        durationMs: 100 + i * 10,
        success: true,
      }, `req-${i}`));
    }
    
    const metrics = await engine.computeMetrics({ days: 1 });
    
    expect(metrics.execution.duration.p50).toBeDefined();
    expect(metrics.execution.duration.p90).toBeDefined();
    expect(metrics.execution.duration.p99).toBeDefined();
  });

  it('computes success rate per intent', async () => {
    await mockStore.store(createTelemetryEvent('execution.completed', {
      taskId: 'task-1',
      taskType: 'skill',
      taskName: 'skill-a',
      success: true,
    }, 'req-1', 'intent-a'));
    
    await mockStore.store(createTelemetryEvent('execution.failed', {
      taskId: 'task-2',
      taskType: 'skill',
      taskName: 'skill-a',
      success: false,
      error: 'timeout',
    }, 'req-2', 'intent-a'));
    
    const stats = await engine.getIntentStats('intent-a');
    
    expect(stats.totalExecutions).toBe(2);
    expect(stats.successRate).toBe(0.5);
  });

  it('computes skill utilization rates', async () => {
    const skillIds = ['skill-1', 'skill-2', 'skill-3'];
    
    for (const skillId of skillIds) {
      await mockStore.store(createTelemetryEvent('execution.completed', {
        taskId: `task-${skillId}`,
        taskType: 'skill',
        taskName: skillId,
        success: true,
      }));
    }
    
    const stats = await engine.getSkillStats('skill-1');
    
    expect(stats.invocationCount).toBeGreaterThan(0);
  });

  async function createMockStore(): Promise<TelemetryStore> {
    const { createTelemetryStore } = await import('../../src/learning/telemetry/store.js');
    return createTelemetryStore({ dbPath: ':memory:' });
  }
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/analytics/engine.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/analytics/metrics.ts
export interface ExecutionMetrics {
  duration: {
    p50: number;
    p90: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };
  successRate: number;
  failureRate: number;
}

export interface IntentMetrics {
  totalExecutions: number;
  successRate: number;
  avgConfidence: number;
  avgDurationMs: number;
}

export interface SkillMetrics {
  invocationCount: number;
  successRate: number;
  avgDurationMs: number;
  lastInvoked?: Date;
}

export interface AnalyticsMetrics {
  execution: ExecutionMetrics;
  byIntent: Record<string, IntentMetrics>;
  bySkill: Record<string, SkillMetrics>;
  classificationConfidence: {
    avg: number;
    distribution: { bucket: string; count: number }[];
  };
}
```

```typescript
// orchestrator/src/learning/analytics/queries.ts
import type { TelemetryStore, TelemetryQuery } from '../telemetry/store.js';
import type { TelemetryEvent } from '../telemetry/events.js';
import type { ExecutionPayload } from '../telemetry/events.js';

export function isExecutionEvent(event: TelemetryEvent): event is TelemetryEvent & { payload: ExecutionPayload } {
  return event.type.startsWith('execution.');
}

export async function queryExecutionEvents(
  store: TelemetryStore,
  timeRange: { days: number }
): Promise<TelemetryEvent[]> {
  const now = new Date();
  const start = new Date(now.getTime() - timeRange.days * 24 * 60 * 60 * 1000);
  
  return store.query({
    types: ['execution.started', 'execution.completed', 'execution.failed'],
    timeRange: { start, end: now },
    limit: 10000,
  });
}

export async function queryClassificationEvents(
  store: TelemetryStore,
  timeRange: { days: number }
): Promise<TelemetryEvent[]> {
  const now = new Date();
  const start = new Date(now.getTime() - timeRange.days * 24 * 60 * 60 * 1000);
  
  return store.query({
    types: ['classification.confidence'],
    timeRange: { start, end: now },
    limit: 10000,
  });
}
```

```typescript
// orchestrator/src/learning/analytics/engine.ts
import type { TelemetryStore } from '../telemetry/store.js';
import type { AnalyticsMetrics, ExecutionMetrics, IntentMetrics, SkillMetrics } from './metrics.js';
import { queryExecutionEvents, queryClassificationEvents, isExecutionEvent } from './queries.js';
import type { ClassificationPayload } from '../telemetry/events.js';

export interface AnalyticsEngine {
  computeMetrics(timeRange: { days: number }): Promise<AnalyticsMetrics>;
  getIntentStats(intent: string): Promise<IntentMetrics>;
  getSkillStats(skillId: string): Promise<SkillMetrics>;
}

export function createAnalyticsEngine(store: TelemetryStore): AnalyticsEngine {
  return {
    async computeMetrics(timeRange) {
      const execEvents = await queryExecutionEvents(store, timeRange);
      const classEvents = await queryClassificationEvents(store, timeRange);
      
      const execution = computeExecutionMetrics(execEvents);
      const byIntent = computeIntentMetrics(execEvents);
      const bySkill = computeSkillMetrics(execEvents);
      const classificationConfidence = computeClassificationMetrics(classEvents);
      
      return { execution, byIntent, bySkill, classificationConfidence };
    },
    
    async getIntentStats(intent) {
      const events = await store.query({ intent, limit: 1000 });
      const execEvents = events.filter(isExecutionEvent);
      
      if (execEvents.length === 0) {
        return { totalExecutions: 0, successRate: 0, avgConfidence: 0, avgDurationMs: 0 };
      }
      
      const successes = execEvents.filter(e => e.payload.success === true).length;
      const durations = execEvents.map(e => e.payload.durationMs ?? 0).filter(d => d > 0);
      
      return {
        totalExecutions: execEvents.length,
        successRate: successes / execEvents.length,
        avgConfidence: 0, // TODO: compute from classification events
        avgDurationMs: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      };
    },
    
    async getSkillStats(skillId) {
      const events = await store.query({ limit: 1000 });
      const execEvents = events.filter(isExecutionEvent).filter(e => e.payload.taskName === skillId);
      
      if (execEvents.length === 0) {
        return { invocationCount: 0, successRate: 0, avgDurationMs: 0 };
      }
      
      const successes = execEvents.filter(e => e.payload.success === true).length;
      const durations = execEvents.map(e => e.payload.durationMs ?? 0).filter(d => d > 0);
      const lastInvoked = execEvents.reduce((latest, e) => 
        e.timestamp > latest ? e.timestamp : latest, 
        new Date(0)
      );
      
      return {
        invocationCount: execEvents.length,
        successRate: successes / execEvents.length,
        avgDurationMs: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        lastInvoked: lastInvoked.getTime() > 0 ? lastInvoked : undefined,
      };
    },
  };
}

function computeExecutionMetrics(events: ReturnType<typeof queryExecutionEvents> extends Promise<infer T> ? T : never): ExecutionMetrics {
  const completedEvents = events.filter(e => e.type === 'execution.completed' && e.payload.durationMs);
  
  if (completedEvents.length === 0) {
    return { duration: { p50: 0, p90: 0, p99: 0, avg: 0, min: 0, max: 0 }, successRate: 0, failureRate: 0 };
  }
  
  const durations = completedEvents.map(e => e.payload.durationMs!).sort((a, b) => a - b);
  const successes = completedEvents.filter(e => e.payload.success === true).length;
  
  return {
    duration: {
      p50: percentile(durations, 50),
      p90: percentile(durations, 90),
      p99: percentile(durations, 99),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
    },
    successRate: successes / completedEvents.length,
    failureRate: (completedEvents.length - successes) / completedEvents.length,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeIntentMetrics(events: ReturnType<typeof queryExecutionEvents> extends Promise<infer T> ? T : never): Record<string, IntentMetrics> {
  const byIntent: Record<string, { total: number; successes: number; durations: number[] }> = {};
  
  for (const event of events) {
    if (!event.intent) continue;
    
    if (!byIntent[event.intent]) {
      byIntent[event.intent] = { total: 0, successes: 0, durations: [] };
    }
    
    byIntent[event.intent].total++;
    if (event.payload.success === true) byIntent[event.intent].successes++;
    if (event.payload.durationMs) byIntent[event.intent].durations.push(event.payload.durationMs);
  }
  
  const result: Record<string, IntentMetrics> = {};
  for (const [intent, data] of Object.entries(byIntent)) {
    result[intent] = {
      totalExecutions: data.total,
      successRate: data.total > 0 ? data.successes / data.total : 0,
      avgConfidence: 0,
      avgDurationMs: data.durations.length > 0 
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length 
        : 0,
    };
  }
  
  return result;
}

function computeSkillMetrics(events: ReturnType<typeof queryExecutionEvents> extends Promise<infer T> ? T : never): Record<string, SkillMetrics> {
  const bySkill: Record<string, { count: number; successes: number; durations: number[] }> = {};
  
  for (const event of events) {
    const name = event.payload.taskName;
    if (!name) continue;
    
    if (!bySkill[name]) {
      bySkill[name] = { count: 0, successes: 0, durations: [] };
    }
    
    bySkill[name].count++;
    if (event.payload.success === true) bySkill[name].successes++;
    if (event.payload.durationMs) bySkill[name].durations.push(event.payload.durationMs);
  }
  
  const result: Record<string, SkillMetrics> = {};
  for (const [skill, data] of Object.entries(bySkill)) {
    result[skill] = {
      invocationCount: data.count,
      successRate: data.count > 0 ? data.successes / data.count : 0,
      avgDurationMs: data.durations.length > 0 
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length 
        : 0,
    };
  }
  
  return result;
}

function computeClassificationMetrics(events: ReturnType<typeof queryClassificationEvents> extends Promise<infer T> ? T : never) {
  if (events.length === 0) {
    return { avg: 0, distribution: [] };
  }
  
  const confidences = events.map(e => (e.payload as ClassificationPayload).confidence);
  const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  const buckets = [
    { bucket: '0.0-0.2', min: 0, max: 0.2 },
    { bucket: '0.2-0.4', min: 0.2, max: 0.4 },
    { bucket: '0.4-0.6', min: 0.4, max: 0.6 },
    { bucket: '0.6-0.8', min: 0.6, max: 0.8 },
    { bucket: '0.8-1.0', min: 0.8, max: 1.0 },
  ];
  
  const distribution = buckets.map(b => ({
    bucket: b.bucket,
    count: confidences.filter(c => c >= b.min && c < b.max).length,
  }));
  
  return { avg, distribution };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/analytics/engine.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/analytics/ orchestrator/tests/learning/analytics/
git commit -m "feat(learning): add analytics engine with metrics computation"
```

---

## Task 5: Pattern Detection

**Files:**
- Create: `orchestrator/src/learning/patterns/types.ts`
- Create: `orchestrator/src/learning/patterns/thresholds.ts`
- Create: `orchestrator/src/learning/patterns/detector.ts`
- Test: `orchestrator/tests/learning/patterns/detector.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/patterns/detector.test.ts
import { describe, it, expect } from 'vitest';
import { PatternDetector, createPatternDetector } from '../../src/learning/patterns/detector.js';
import type { AnalyticsMetrics } from '../../src/learning/analytics/metrics.js';

describe('PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = createPatternDetector();
  });

  it('detects high failure rate pattern', () => {
    const metrics: AnalyticsMetrics = {
      execution: {
        duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 },
        successRate: 0.6,
        failureRate: 0.4,
      },
      byIntent: {
        'test-intent': { totalExecutions: 10, successRate: 0.3, avgConfidence: 0.8, avgDurationMs: 100 },
      },
      bySkill: {},
      classificationConfidence: { avg: 0.85, distribution: [] },
    };
    
    const patterns = detector.detectPatterns(metrics);
    
    const highFailure = patterns.find(p => p.type === 'high_failure_rate');
    expect(highFailure).toBeDefined();
    expect(highFailure!.severity).toBe('warning');
    expect(highFailure!.affectedEntity).toBe('test-intent');
  });

  it('detects low confidence classification pattern', () => {
    const metrics: AnalyticsMetrics = {
      execution: { duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 }, successRate: 0.9, failureRate: 0.1 },
      byIntent: {},
      bySkill: {},
      classificationConfidence: { avg: 0.5, distribution: [] },
    };
    
    const patterns = detector.detectPatterns(metrics);
    
    const lowConf = patterns.find(p => p.type === 'low_confidence');
    expect(lowConf).toBeDefined();
    expect(lowConf!.severity).toBe('warning');
  });

  it('detects slow execution pattern', () => {
    const metrics: AnalyticsMetrics = {
      execution: {
        duration: { p50: 100, p90: 8000, p99: 10000, avg: 3000, min: 50, max: 15000 },
        successRate: 0.9,
        failureRate: 0.1,
      },
      byIntent: {},
      bySkill: {
        'slow-skill': { invocationCount: 10, successRate: 0.9, avgDurationMs: 6000 },
      },
      classificationConfidence: { avg: 0.85, distribution: [] },
    };
    
    const patterns = detector.detectPatterns(metrics);
    
    const slowExec = patterns.find(p => p.type === 'slow_execution');
    expect(slowExec).toBeDefined();
    expect(slowExec!.affectedEntity).toBe('slow-skill');
  });

  it('explains patterns human-readably', () => {
    const patterns = detector.detectPatterns({
      execution: { duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 }, successRate: 0.8, failureRate: 0.2 },
      byIntent: {},
      bySkill: {},
      classificationConfidence: { avg: 0.85, distribution: [] },
    });
    
    const explanation = detector.explainPattern(patterns[0]);
    expect(explanation).toContain('pattern');
    expect(explanation.length).toBeGreaterThan(20);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/patterns/detector.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/patterns/types.ts
export type PatternType =
  | 'high_failure_rate'
  | 'low_confidence'
  | 'slow_execution'
  | 'unused_capability'
  | 'routing_degeneracy'
  | 'confidence_drift';

export type PatternSeverity = 'info' | 'warning' | 'critical';

export interface PatternEvidence {
  metric: string;
  value: number;
  threshold: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  dataPoints: number;
}

export interface Pattern {
  id: string;
  type: PatternType;
  severity: PatternSeverity;
  detectedAt: Date;
  affectedEntity: string;
  evidence: PatternEvidence;
  recommendation?: string;
}
```

```typescript
// orchestrator/src/learning/patterns/thresholds.ts
export const PATTERN_THRESHOLDS = {
  HIGH_FAILURE_RATE: 0.2,
  LOW_CONFIDENCE: 0.6,
  SLOW_EXECUTION_P90_MS: 5000,
  CONFIDENCE_DRIFT_DELTA: 0.1,
  MIN_DATA_POINTS: 3,
} as const;

export function getThresholds() {
  return { ...PATTERN_THRESHOLDS };
}
```

```typescript
// orchestrator/src/learning/patterns/detector.ts
import { randomUUID } from 'node:crypto';
import type { AnalyticsMetrics } from '../analytics/metrics.js';
import type { Pattern, PatternType, PatternSeverity } from './types.js';
import { PATTERN_THRESHOLDS } from './thresholds.js';

export interface PatternDetector {
  detectPatterns(metrics: AnalyticsMetrics): Promise<Pattern[]>;
  getPatternsByType(type: PatternType): Promise<Pattern[]>;
  explainPattern(pattern: Pattern): string;
}

export function createPatternDetector(): PatternDetector {
  let detectedPatterns: Pattern[] = [];

  return {
    async detectPatterns(metrics) {
      const patterns: Pattern[] = [];
      const t = PATTERN_THRESHOLDS;

      // High failure rate
      for (const [intent, stats] of Object.entries(metrics.byIntent)) {
        if (stats.totalExecutions >= t.MIN_DATA_POINTS && stats.successRate < (1 - t.HIGH_FAILURE_RATE)) {
          patterns.push(createPattern('high_failure_rate', 'warning', intent, {
            metric: 'successRate',
            value: stats.successRate,
            threshold: 1 - t.HIGH_FAILURE_RATE,
            dataPoints: stats.totalExecutions,
          }));
        }
      }

      // Low confidence classification
      if (metrics.classificationConfidence.avg < t.LOW_CONFIDENCE) {
        patterns.push(createPattern('low_confidence', 'warning', 'classification', {
          metric: 'avgConfidence',
          value: metrics.classificationConfidence.avg,
          threshold: t.LOW_CONFIDENCE,
          dataPoints: metrics.classificationConfidence.distribution.reduce((a, b) => a + b.count, 0),
        }));
      }

      // Slow execution
      for (const [skill, stats] of Object.entries(metrics.bySkill)) {
        if (stats.avgDurationMs > t.SLOW_EXECUTION_P90_MS) {
          patterns.push(createPattern('slow_execution', 'info', skill, {
            metric: 'avgDurationMs',
            value: stats.avgDurationMs,
            threshold: t.SLOW_EXECUTION_P90_MS,
            dataPoints: stats.invocationCount,
          }));
        }
      }

      detectedPatterns = patterns;
      return patterns;
    },

    async getPatternsByType(type) {
      return detectedPatterns.filter(p => p.type === type);
    },

    explainPattern(pattern) {
      switch (pattern.type) {
        case 'high_failure_rate':
          return `Intent '${pattern.affectedEntity}' has a ${(pattern.evidence.value * 100).toFixed(0)}% failure rate, exceeding threshold of ${((1 - pattern.evidence.threshold) * 100).toFixed(0)}%. Based on ${pattern.evidence.dataPoints} data points.`;
        case 'low_confidence':
          return `Average classification confidence is ${(pattern.evidence.value * 100).toFixed(0)}%, below threshold of ${(pattern.evidence.threshold * 100).toFixed(0)}%. This may indicate ambiguous or out-of-distribution inputs.`;
        case 'slow_execution':
          return `Skill '${pattern.affectedEntity}' averages ${pattern.evidence.value.toFixed(0)}ms execution time, exceeding threshold of ${pattern.evidence.threshold.toFixed(0)}ms.`;
        case 'unused_capability':
          return `Registered capability '${pattern.affectedEntity}' has never been invoked in the observed period.`;
        case 'routing_degeneracy':
          return `Multiple intents route to the same execution plan as '${pattern.affectedEntity}'.`;
        case 'confidence_drift':
          return `Classification confidence has dropped by ${(pattern.evidence.value * 100).toFixed(0)}% compared to baseline.`;
        default:
          return `Unknown pattern type: ${pattern.type}`;
      }
    },
  };
}

function createPattern(
  type: PatternType,
  severity: PatternSeverity,
  affectedEntity: string,
  evidence: Pattern['evidence'],
): Pattern {
  return {
    id: randomUUID(),
    type,
    severity,
    detectedAt: new Date(),
    affectedEntity,
    evidence,
    recommendation: generateRecommendation(type, affectedEntity, evidence),
  };
}

function generateRecommendation(type: PatternType, entity: string, evidence: Pattern['evidence']): string {
  switch (type) {
    case 'high_failure_rate':
      return `Consider reviewing the execution plan for '${entity}' or adding error handling improvements.`;
    case 'low_confidence':
      return `Consider adding more training examples or refining the intent classifier signals.`;
    case 'slow_execution':
      return `Consider optimizing '${entity}' or adjusting the timeout threshold.`;
    case 'unused_capability':
      return `Consider removing '${entity}' from the registry or updating its activation criteria.`;
    default:
      return `Manual review recommended for ${type} affecting '${entity}'.`;
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/patterns/detector.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/patterns/ orchestrator/tests/learning/patterns/
git commit -m "feat(learning): add pattern detector with threshold-based detection"
```

---

## Task 6: Recommendation Engine

**Files:**
- Create: `orchestrator/src/learning/recommendations/engine.ts`
- Create: `orchestrator/src/learning/recommendations/generators.ts`
- Test: `orchestrator/tests/learning/recommendations/engine.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/recommendations/engine.test.ts
import { describe, it, expect } from 'vitest';
import { RecommendationEngine, createRecommendationEngine } from '../../src/learning/recommendations/engine.js';
import type { Pattern } from '../../src/learning/patterns/types.js';

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = createRecommendationEngine();
  });

  it('generates recommendations from patterns', async () => {
    const patterns: Pattern[] = [
      {
        id: 'p1',
        type: 'high_failure_rate',
        severity: 'warning',
        detectedAt: new Date(),
        affectedEntity: 'code-review',
        evidence: { metric: 'successRate', value: 0.7, threshold: 0.8, dataPoints: 10 },
        recommendation: 'Review execution plan',
      },
    ];
    
    const recommendations = await engine.generateRecommendations(patterns);
    
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].type).toBe('intent_mapping_suggestion');
    expect(recommendations[0].priority).toBe('medium');
    expect(recommendations[0].confidence).toBeGreaterThan(0);
  });

  it('computes recommendation confidence', () => {
    const rec = {
      id: 'r1',
      type: 'intent_mapping_suggestion' as const,
      priority: 'high' as const,
      target: 'test-intent',
      description: 'Add skill',
      rationale: 'Based on pattern',
      confidence: 0.9,
      patterns: ['p1'],
      actionableSteps: ['Add skill to registry'],
    };
    
    const confidence = engine.getRecommendationConfidence(rec);
    
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('explains recommendations', () => {
    const rec = {
      id: 'r1',
      type: 'skill_addition' as const,
      priority: 'high' as const,
      target: 'test-skill',
      description: 'Add test-skill to intent',
      rationale: 'Low coverage detected',
      confidence: 0.85,
      patterns: [],
      actionableSteps: ['Update intents.yaml'],
    };
    
    const explanation = engine.explainRecommendation(rec);
    
    expect(explanation).toContain('test-skill');
    expect(explanation.length).toBeGreaterThan(30);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/recommendations/engine.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/recommendations/engine.ts
import { randomUUID } from 'node:crypto';
import type { Pattern } from '../patterns/types.js';

export type RecommendationType =
  | 'intent_mapping_suggestion'
  | 'confidence_threshold_adjustment'
  | 'skill_dependency_hint'
  | 'reviewer_coverage_gap'
  | 'skill_addition'
  | 'skill_removal';

export type RecommendationPriority = 'low' | 'medium' | 'high';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  target: string;
  description: string;
  rationale: string;
  confidence: number;
  patterns: string[];
  actionableSteps: string[];
  estimatedImpact?: string;
}

export interface RecommendationEngine {
  generateRecommendations(patterns: Pattern[]): Promise<Recommendation[]>;
  getRecommendationConfidence(rec: Recommendation): number;
  explainRecommendation(rec: Recommendation): string;
}

export function createRecommendationEngine(): RecommendationEngine {
  return {
    async generateRecommendations(patterns) {
      const recommendations: Recommendation[] = [];
      
      for (const pattern of patterns) {
        const rec = generateFromPattern(pattern);
        if (rec) recommendations.push(rec);
      }
      
      return recommendations;
    },

    getRecommendationConfidence(rec) {
      // Base confidence from patterns
      let confidence = 0.7;
      
      // Adjust by pattern count
      confidence += rec.patterns.length * 0.05;
      
      // Adjust by severity
      switch (rec.priority) {
        case 'high': confidence += 0.1; break;
        case 'low': confidence -= 0.1; break;
      }
      
      return Math.min(1, Math.max(0, confidence));
    },

    explainRecommendation(rec) {
      const stepList = rec.actionableSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      
      return `Recommendation: ${rec.description}\n` +
        `Target: ${rec.target}\n` +
        `Rationale: ${rec.rationale}\n` +
        `Confidence: ${(rec.confidence * 100).toFixed(0)}%\n` +
        `Actionable Steps:\n${stepList}` +
        (rec.estimatedImpact ? `\nEstimated Impact: ${rec.estimatedImpact}` : '');
    },
  };
}

function generateFromPattern(pattern: Pattern): Recommendation | null {
  switch (pattern.type) {
    case 'high_failure_rate':
      return {
        id: randomUUID(),
        type: 'intent_mapping_suggestion',
        priority: pattern.severity === 'critical' ? 'high' : 'medium',
        target: pattern.affectedEntity,
        description: `Review intent mapping for '${pattern.affectedEntity}' due to high failure rate`,
        rationale: pattern.evidence.dataPoints >= 5 
          ? `Based on ${pattern.evidence.dataPoints} executions with ${(pattern.evidence.value * 100).toFixed(0)}% failure rate`
          : 'Limited data - manual review recommended',
        confidence: pattern.evidence.dataPoints >= 10 ? 0.85 : 0.6,
        patterns: [pattern.id],
        actionableSteps: [
          `Review execution plan for '${pattern.affectedEntity}'`,
          'Check skill dependencies and ordering',
          'Consider adding error recovery steps',
        ],
        estimatedImpact: 'Could reduce failure rate by 10-30%',
      };

    case 'low_confidence':
      return {
        id: randomUUID(),
        type: 'confidence_threshold_adjustment',
        priority: 'medium',
        target: 'classification',
        description: 'Classification confidence threshold may need adjustment',
        rationale: `Average confidence of ${(pattern.evidence.value * 100).toFixed(0)}% suggests ambiguous classification cases`,
        confidence: 0.75,
        patterns: [pattern.id],
        actionableSteps: [
          'Review classification signals for edge cases',
          'Consider adding fallback intent for low confidence',
          'Audit training data distribution',
        ],
      };

    case 'slow_execution':
      return {
        id: randomUUID(),
        type: 'skill_dependency_hint',
        priority: 'low',
        target: pattern.affectedEntity,
        description: `Optimize execution for '${pattern.affectedEntity}'`,
        rationale: `Average duration ${pattern.evidence.value.toFixed(0)}ms exceeds threshold ${pattern.evidence.threshold.toFixed(0)}ms`,
        confidence: 0.8,
        patterns: [pattern.id],
        actionableSteps: [
          `Profile '${pattern.affectedEntity}' execution`,
          'Check for unnecessary I/O or network calls',
          'Consider caching or memoization',
        ],
        estimatedImpact: 'Could reduce execution time by 20-40%',
      };

    case 'unused_capability':
      return {
        id: randomUUID(),
        type: 'skill_removal',
        priority: 'low',
        target: pattern.affectedEntity,
        description: `Consider removing unused capability '${pattern.affectedEntity}'`,
        rationale: 'No invocations in observed period - may indicate misconfiguration or deprecated feature',
        confidence: 0.7,
        patterns: [pattern.id],
        actionableSteps: [
          `Verify '${pattern.affectedEntity}' is not needed`,
          'Check if activation criteria are too restrictive',
          'Consider archiving instead of removing',
        ],
      };

    default:
      return null;
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/recommendations/engine.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/recommendations/ orchestrator/tests/learning/recommendations/
git commit -m "feat(learning): add recommendation engine with pattern-based generation"
```

---

## Task 7: Governance Layer

**Files:**
- Create: `orchestrator/src/learning/governance/tickets.ts`
- Create: `orchestrator/src/learning/governance/audit.ts`
- Create: `orchestrator/src/learning/governance/layer.ts`
- Test: `orchestrator/tests/learning/governance/layer.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/governance/layer.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceLayer, createGovernanceLayer } from '../../src/learning/governance/layer.js';
import type { Recommendation } from '../../src/learning/recommendations/engine.js';

describe('GovernanceLayer', () => {
  let governance: GovernanceLayer;

  beforeEach(() => {
    governance = createGovernanceLayer();
  });

  it('submits recommendation as ticket', async () => {
    const rec: Recommendation = {
      id: 'r1',
      type: 'intent_mapping_suggestion',
      priority: 'high',
      target: 'test-intent',
      description: 'Add skill to intent',
      rationale: 'High failure rate detected',
      confidence: 0.85,
      patterns: ['p1'],
      actionableSteps: ['Update registry'],
    };
    
    const ticket = await governance.submitRecommendation(rec);
    
    expect(ticket.id).toBeDefined();
    expect(ticket.status).toBe('pending');
    expect(ticket.recommendation).toEqual(rec);
  });

  it('approves recommendation', async () => {
    const rec: Recommendation = {
      id: 'r1',
      type: 'intent_mapping_suggestion',
      priority: 'high',
      target: 'test-intent',
      description: 'Add skill',
      rationale: 'Test',
      confidence: 0.85,
      patterns: [],
      actionableSteps: [],
    };
    
    const ticket = await governance.submitRecommendation(rec);
    await governance.approveRecommendation(ticket.id);
    
    const updated = await governance.getTicket(ticket.id);
    expect(updated!.status).toBe('approved');
    expect(updated!.reviewedAt).toBeDefined();
  });

  it('rejects recommendation with reason', async () => {
    const rec: Recommendation = {
      id: 'r1',
      type: 'intent_mapping_suggestion',
      priority: 'medium',
      target: 'test-intent',
      description: 'Add skill',
      rationale: 'Test',
      confidence: 0.6,
      patterns: [],
      actionableSteps: [],
    };
    
    const ticket = await governance.submitRecommendation(rec);
    await governance.rejectRecommendation(ticket.id, 'Not applicable to our use case');
    
    const updated = await governance.getTicket(ticket.id);
    expect(updated!.status).toBe('rejected');
    expect(updated!.rejectionReason).toBe('Not applicable to our use case');
  });

  it('lists pending recommendations', async () => {
    const rec1: Recommendation = { id: 'r1', type: 'skill_addition', priority: 'high', target: 's1', description: 'd1', rationale: 'r1', confidence: 0.8, patterns: [], actionableSteps: [] };
    const rec2: Recommendation = { id: 'r2', type: 'skill_removal', priority: 'low', target: 's2', description: 'd2', rationale: 'r2', confidence: 0.6, patterns: [], actionableSteps: [] };
    
    await governance.submitRecommendation(rec1);
    await governance.submitRecommendation(rec2);
    
    const pending = await governance.getPendingRecommendations();
    
    expect(pending).toHaveLength(2);
    expect(pending.every(t => t.status === 'pending')).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/governance/layer.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/governance/tickets.ts
import { randomUUID } from 'node:crypto';
import type { Recommendation } from '../recommendations/engine.js';

export type TicketStatus = 'pending' | 'approved' | 'rejected';

export interface GovernanceTicket {
  id: string;
  recommendation: Recommendation;
  status: TicketStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export function createTicket(rec: Recommendation): GovernanceTicket {
  return {
    id: randomUUID(),
    recommendation: rec,
    status: 'pending',
    submittedAt: new Date(),
  };
}
```

```typescript
// orchestrator/src/learning/governance/audit.ts
export interface AuditEntry {
  id: string;
  ticketId: string;
  action: 'submitted' | 'approved' | 'rejected';
  timestamp: Date;
  performedBy?: string;
  details?: string;
}

export class AuditTrail {
  private entries: AuditEntry[] = [];

  addEntry(ticketId: string, action: AuditEntry['action'], performedBy?: string, details?: string) {
    this.entries.push({
      id: randomUUID(),
      ticketId,
      action,
      timestamp: new Date(),
      performedBy,
      details,
    });
  }

  getEntries(ticketId?: string): AuditEntry[] {
    if (ticketId) {
      return this.entries.filter(e => e.ticketId === ticketId);
    }
    return [...this.entries];
  }
}
```

```typescript
// orchestrator/src/learning/governance/layer.ts
import { randomUUID } from 'node:crypto';
import type { Recommendation } from '../recommendations/engine.js';
import type { GovernanceTicket, TicketStatus } from './tickets.js';
import { createTicket } from './tickets.js';
import { AuditTrail } from './audit.js';

export interface GovernanceLayer {
  submitRecommendation(rec: Recommendation): Promise<GovernanceTicket>;
  approveRecommendation(ticketId: string, reviewedBy?: string): Promise<void>;
  rejectRecommendation(ticketId: string, reason: string, reviewedBy?: string): Promise<void>;
  getTicket(ticketId: string): Promise<GovernanceTicket | null>;
  getPendingRecommendations(): Promise<GovernanceTicket[]>;
}

export function createGovernanceLayer(): GovernanceLayer {
  const tickets = new Map<string, GovernanceTicket>();
  const audit = new AuditTrail();

  return {
    async submitRecommendation(rec) {
      const ticket = createTicket(rec);
      tickets.set(ticket.id, ticket);
      audit.addEntry(ticket.id, 'submitted');
      return ticket;
    },

    async approveRecommendation(ticketId, reviewedBy) {
      const ticket = tickets.get(ticketId);
      if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);
      
      ticket.status = 'approved';
      ticket.reviewedAt = new Date();
      ticket.reviewedBy = reviewedBy;
      audit.addEntry(ticketId, 'approved', reviewedBy);
    },

    async rejectRecommendation(ticketId, reason, reviewedBy) {
      const ticket = tickets.get(ticketId);
      if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);
      
      ticket.status = 'rejected';
      ticket.reviewedAt = new Date();
      ticket.reviewedBy = reviewedBy;
      ticket.rejectionReason = reason;
      audit.addEntry(ticketId, 'rejected', reviewedBy, reason);
    },

    async getTicket(ticketId) {
      return tickets.get(ticketId) ?? null;
    },

    async getPendingRecommendations() {
      return [...tickets.values()].filter(t => t.status === 'pending');
    },
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/governance/layer.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/governance/ orchestrator/tests/learning/governance/
git commit -m "feat(learning): add governance layer with approval workflow"
```

---

## Task 8: Scheduler

**Files:**
- Create: `orchestrator/src/learning/scheduler/analyzer.ts`
- Create: `orchestrator/src/learning/scheduler/scheduler.ts`
- Test: `orchestrator/tests/learning/scheduler/analyzer.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/scheduler/analyzer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ScheduledAnalyzer, createScheduledAnalyzer } from '../../src/learning/scheduler/analyzer.js';
import type { LearningLayer } from '../../src/learning/index.js';

describe('ScheduledAnalyzer', () => {
  it('runs analysis and returns results', async () => {
    const mockLayer = createMockLearningLayer();
    const analyzer = createScheduledAnalyzer(mockLayer, { intervalHours: 24 });
    
    const result = await analyzer.runAnalysis();
    
    expect(result.metrics).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.executedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('returns last analysis time', async () => {
    const mockLayer = createMockLearningLayer();
    const analyzer = createScheduledAnalyzer(mockLayer, { intervalHours: 24 });
    
    const lastTime = await analyzer.getLastAnalysisTime();
    
    expect(lastTime).toBeNull(); // No analysis run yet
    
    await analyzer.runAnalysis();
    
    const afterTime = await analyzer.getLastAnalysisTime();
    expect(afterTime).toBeInstanceOf(Date);
  });

  it('detects last analysis time persists', async () => {
    const mockLayer = createMockLearningLayer();
    const analyzer = createScheduledAnalyzer(mockLayer, { intervalHours: 24 });
    
    await analyzer.runAnalysis();
    const firstRun = await analyzer.getLastAnalysisTime();
    
    // Second run should have same lastAnalysisTime
    await analyzer.runAnalysis();
    const secondRun = await analyzer.getLastAnalysisTime();
    
    expect(secondRun).toEqual(firstRun);
  });

  function createMockLearningLayer() {
    return {
      store: {
        query: vi.fn().mockResolvedValue([]),
        getStats: vi.fn().mockResolvedValue({ total: 0, byType: {}, byIntent: {} }),
      },
      analytics: {
        computeMetrics: vi.fn().mockResolvedValue({
          execution: { duration: { p50: 100, p90: 200, p99: 300, avg: 150, min: 50, max: 500 }, successRate: 0.9, failureRate: 0.1 },
          byIntent: {},
          bySkill: {},
          classificationConfidence: { avg: 0.85, distribution: [] },
        }),
      },
      patterns: {
        detectPatterns: vi.fn().mockResolvedValue([]),
      },
      recommendations: {
        generateRecommendations: vi.fn().mockResolvedValue([]),
      },
    } as unknown as LearningLayer;
  }
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/scheduler/analyzer.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/scheduler/scheduler.ts
export interface SchedulerOptions {
  intervalHours: number;
  enabled?: boolean;
}

export interface Scheduler {
  scheduleNext(): void;
  isEnabled(): boolean;
  getIntervalHours(): number;
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  return {
    scheduleNext() {
      // Placeholder - actual scheduling handled by external cron/job
    },
    isEnabled() {
      return options.enabled ?? true;
    },
    getIntervalHours() {
      return options.intervalHours;
    },
  };
}
```

```typescript
// orchestrator/src/learning/scheduler/analyzer.ts
import type { LearningLayer } from '../index.js';
import type { AnalyticsMetrics } from '../analytics/metrics.js';
import type { Pattern } from '../patterns/types.js';
import type { Recommendation } from '../recommendations/engine.js';
import { createScheduler, type SchedulerOptions } from './scheduler.js';

export interface AnalysisResult {
  metrics: AnalyticsMetrics;
  patterns: Pattern[];
  recommendations: Recommendation[];
  executedAt: Date;
  durationMs: number;
}

export interface AnalysisOptions {
  timeRange?: { days: number };
  includeRecommendations?: boolean;
}

export interface ScheduledAnalyzer {
  runAnalysis(options?: AnalysisOptions): Promise<AnalysisResult>;
  getLastAnalysisTime(): Promise<Date | null>;
  scheduleNext(): void;
}

export interface ScheduledAnalyzerOptions extends SchedulerOptions {
  timeRange?: { days: number };
}

export function createScheduledAnalyzer(
  layer: LearningLayer,
  options: ScheduledAnalyzerOptions = {},
): ScheduledAnalyzer {
  let lastAnalysisTime: Date | null = null;
  const scheduler = createScheduler(options);

  return {
    async runAnalysis(options = {}) {
      const startTime = Date.now();
      const timeRange = options.timeRange ?? { days: options.intervalHours ? options.intervalHours / 24 : 1 };
      
      // Compute metrics
      const metrics = await layer.analytics.computeMetrics(timeRange);
      
      // Detect patterns
      const patterns = await layer.patterns.detectPatterns(metrics);
      
      // Generate recommendations
      const recommendations = options.includeRecommendations !== false
        ? await layer.recommendations.generateRecommendations(patterns)
        : [];
      
      const durationMs = Date.now() - startTime;
      lastAnalysisTime = new Date();
      
      return {
        metrics,
        patterns,
        recommendations,
        executedAt: lastAnalysisTime,
        durationMs,
      };
    },

    async getLastAnalysisTime() {
      return lastAnalysisTime;
    },

    scheduleNext() {
      scheduler.scheduleNext();
    },
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/scheduler/analyzer.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/scheduler/ orchestrator/tests/learning/scheduler/
git commit -m "feat(learning): add scheduled analyzer with interval support"
```

---

## Task 9: Learning Layer Index

**Files:**
- Create: `orchestrator/src/learning/index.ts`
- Test: `orchestrator/tests/learning/index.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/learning/index.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createLearningLayer, type LearningLayer, runAnalysis } from '../../src/learning/index.js';

describe('LearningLayer', () => {
  it('creates learning layer with all components', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });
    
    expect(layer.collector).toBeDefined();
    expect(layer.store).toBeDefined();
    expect(layer.analytics).toBeDefined();
    expect(layer.patterns).toBeDefined();
    expect(layer.recommendations).toBeDefined();
    expect(layer.scheduler).toBeDefined();
    expect(layer.governance).toBeDefined();
  });

  it('runs analysis end-to-end', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });
    
    const result = await runAnalysis(layer);
    
    expect(result.metrics).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/learning/index.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/learning/index.ts
export type { TelemetryEvent, EventType, ExecutionPayload, ClassificationPayload, ReviewerPayload, WorkflowPayload } from './telemetry/events.js';
export type { TelemetryStore, TelemetryQuery, TelemetryStats, TimeRange } from './telemetry/store.js';
export { createTelemetryCollector, type TelemetryCollector } from './telemetry/collector.js';

export type { TelemetryCollector as LearningLayer };

export type { AnalyticsEngine } from './analytics/engine.js';
export type { AnalyticsMetrics, ExecutionMetrics, IntentMetrics, SkillMetrics } from './analytics/metrics.js';

export type { Pattern, PatternType, PatternSeverity } from './patterns/types.js';
export { createPatternDetector, type PatternDetector } from './patterns/detector.js';

export type { Recommendation, RecommendationType, RecommendationPriority } from './recommendations/engine.js';
export { createRecommendationEngine, type RecommendationEngine } from './recommendations/engine.js';

export type { GovernanceTicket, TicketStatus } from './governance/tickets.js';
export { createGovernanceLayer, type GovernanceLayer } from './governance/layer.js';

export type { AnalysisResult, AnalysisOptions, ScheduledAnalyzer } from './scheduler/analyzer.js';
export { createScheduledAnalyzer } from './scheduler/analyzer.js';

import { createTelemetryStore, type TelemetryStore } from './telemetry/store.js';
import { createTelemetryCollector, type TelemetryCollector } from './telemetry/collector.js';
import { createAnalyticsEngine, type AnalyticsEngine } from './analytics/engine.js';
import { createPatternDetector, type PatternDetector } from './patterns/detector.js';
import { createRecommendationEngine, type RecommendationEngine } from './recommendations/engine.js';
import { createGovernanceLayer, type GovernanceLayer } from './governance/layer.js';
import { createScheduledAnalyzer, type ScheduledAnalyzer, type AnalysisResult } from './scheduler/analyzer.js';
import type { TelemetryStoreOptions } from './telemetry/store.js';

export interface LearningLayer {
  collector: TelemetryCollector;
  store: TelemetryStore;
  analytics: AnalyticsEngine;
  patterns: PatternDetector;
  recommendations: RecommendationEngine;
  governance: GovernanceLayer;
  scheduler: ScheduledAnalyzer;
}

export interface LearningLayerOptions extends TelemetryStoreOptions {
  intervalHours?: number;
}

export async function createLearningLayer(options: LearningLayerOptions): Promise<LearningLayer> {
  const store = await createTelemetryStore({ dbPath: options.dbPath, retentionDays: options.retentionDays });
  const collector = createTelemetryCollector(store);
  const analytics = createAnalyticsEngine(store);
  const patterns = createPatternDetector();
  const recommendations = createRecommendationEngine();
  const governance = createGovernanceLayer();
  const scheduler = createScheduledAnalyzer(
    { collector, store, analytics, patterns, recommendations, governance } as LearningLayer,
    { intervalHours: options.intervalHours ?? 24 },
  );

  return { collector, store, analytics, patterns, recommendations, governance, scheduler };
}

export async function runAnalysis(layer: LearningLayer, options?: { timeRange?: { days: number } }): Promise<AnalysisResult> {
  return layer.scheduler.runAnalysis(options);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/index.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/learning/index.ts orchestrator/tests/learning/index.test.ts
git commit -m "feat(learning): add learning layer index and factory function"
```

---

## Task 10: Analytics CLI

**Files:**
- Create: `orchestrator/src/analytics-cli.ts`
- Test: `orchestrator/tests/analytics-cli.test.ts`

- [x] **Step 1: Write failing test**

```typescript
// orchestrator/tests/analytics-cli.test.ts
import { describe, it, expect } from 'vitest';
import { parseAnalyticsCommand } from '../../src/analytics-cli.js';

describe('AnalyticsCLI', () => {
  it('parses run command', () => {
    const result = parseAnalyticsCommand(['analytics', 'run', '--range', '7d']);
    
    expect(result.command).toBe('run');
    expect(result.options.range).toBe('7d');
  });

  it('parses patterns command', () => {
    const result = parseAnalyticsCommand(['analytics', 'patterns', '--type', 'high_failure_rate']);
    
    expect(result.command).toBe('patterns');
    expect(result.options.type).toBe('high_failure_rate');
  });

  it('parses recommendations command', () => {
    const result = parseAnalyticsCommand(['analytics', 'recommendations', '--priority', 'high']);
    
    expect(result.command).toBe('recommendations');
    expect(result.options.priority).toBe('high');
  });

  it('parses export command', () => {
    const result = parseAnalyticsCommand(['analytics', 'export', '--format', 'json', '--output', 'out.json']);
    
    expect(result.command).toBe('export');
    expect(result.options.format).toBe('json');
    expect(result.options.output).toBe('out.json');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd orchestrator && pnpm test -- tests/analytics-cli.test.ts`
Expected: FAIL with "Cannot find module"

- [x] **Step 3: Write implementation**

```typescript
// orchestrator/src/analytics-cli.ts
export interface CLICommand {
  command: string;
  subcommand?: string;
  options: Record<string, string>;
}

export function parseAnalyticsCommand(args: string[]): CLICommand {
  const [base, command, ...rest] = args;
  
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = rest[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = 'true';
      }
    }
  }
  
  return { command, options };
}

export function formatAnalysisResult(result: { metrics?: unknown; patterns?: unknown[]; recommendations?: unknown[] }): string {
  const lines: string[] = [];
  
  lines.push('=== Analysis Results ===');
  
  if (result.metrics) {
    lines.push('\n--- Metrics ---');
    lines.push(JSON.stringify(result.metrics, null, 2));
  }
  
  if (result.patterns?.length) {
    lines.push('\n--- Patterns ---');
    for (const pattern of result.patterns as Array<{ type: string; severity: string; affectedEntity: string }>) {
      lines.push(`  [${pattern.severity}] ${pattern.type} - ${pattern.affectedEntity}`);
    }
  }
  
  if (result.recommendations?.length) {
    lines.push('\n--- Recommendations ---');
    for (const rec of result.recommendations as Array<{ priority: string; description: string; confidence: number }>) {
      lines.push(`  [${rec.priority}] ${rec.description} (${(rec.confidence * 100).toFixed(0)}% confidence)`);
    }
  }
  
  return lines.join('\n');
}

export async function runAnalyticsCommand(layer: unknown, cmd: CLICommand): Promise<string> {
  const { createLearningLayer, runAnalysis } = await import('./learning/index.js');
  
  switch (cmd.command) {
    case 'run': {
      const timeRange = parseTimeRange(cmd.options.range ?? '1d');
      const layerInst = layer as ReturnType<typeof createLearningLayer> extends Promise<infer T> ? Awaited<T> : never;
      const result = await runAnalysis(layerInst, { timeRange });
      return formatAnalysisResult(result);
    }
    
    case 'patterns':
      return 'Patterns would be listed here';
    
    case 'recommendations':
      return 'Recommendations would be listed here';
    
    case 'export':
      return 'Export would be written to file';
    
    default:
      throw new Error(`Unknown command: ${cmd.command}`);
  }
}

function parseTimeRange(range: string): { days: number } {
  const match = range.match(/^(\d+)d$/);
  if (match) return { days: parseInt(match[1]) };
  
  const weekMatch = range.match(/^(\d+)w$/);
  if (weekMatch) return { days: parseInt(weekMatch[1]) * 7 };
  
  return { days: 1 };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/analytics-cli.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add orchestrator/src/analytics-cli.ts orchestrator/tests/analytics-cli.test.ts
git commit -m "feat(learning): add analytics CLI with command parsing"
```

---

## Task 11: Integration Test

**Files:**
- Create: `orchestrator/tests/learning/integration.test.ts`

- [x] **Step 1: Write integration test**

```typescript
// orchestrator/tests/learning/integration.test.ts
import { describe, it, expect } from 'vitest';
import { createLearningLayer, runAnalysis } from '../../src/learning/index.js';
import { createTelemetryEvent, type ExecutionPayload } from '../../src/learning/telemetry/events.js';

describe('Learning Layer Integration', () => {
  it('end-to-end: emit events, run analysis, detect patterns', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });
    
    // Emit some telemetry events
    const events = [
      createTelemetryEvent('execution.completed', {
        taskId: 'task-1',
        taskType: 'skill',
        taskName: 'skill-a',
        durationMs: 100,
        success: true,
      }, 'req-1', 'intent-a'),
      createTelemetryEvent('execution.completed', {
        taskId: 'task-2',
        taskType: 'skill',
        taskName: 'skill-a',
        durationMs: 150,
        success: true,
      }, 'req-2', 'intent-a'),
      createTelemetryEvent('execution.completed', {
        taskId: 'task-3',
        taskType: 'skill',
        taskName: 'skill-a',
        durationMs: 80,
        success: false,
        error: 'timeout',
      }, 'req-3', 'intent-a'),
    ];
    
    for (const event of events) {
      layer.collector.emit(event);
    }
    
    await layer.collector.flush();
    
    // Run analysis
    const result = await runAnalysis(layer, { timeRange: { days: 1 } });
    
    expect(result.metrics).toBeDefined();
    expect(result.executedAt).toBeInstanceOf(Date);
    
    // If we have enough data, patterns should be detected
    if (result.patterns.length > 0) {
      expect(result.patterns[0].type).toBeDefined();
    }
  });

  it('recommendation workflow: submit, approve, audit', async () => {
    const layer = await createLearningLayer({ dbPath: ':memory:' });
    
    // Create a mock recommendation
    const { Recommendation } = await import('../../src/learning/recommendations/engine.js');
    
    const rec = {
      id: 'r1',
      type: 'intent_mapping_suggestion' as const,
      priority: 'high' as const,
      target: 'test-intent',
      description: 'Add skill to improve coverage',
      rationale: 'Low coverage detected in analytics',
      confidence: 0.85,
      patterns: [],
      actionableSteps: ['Update intents.yaml'],
    };
    
    // Submit recommendation
    const ticket = await layer.governance.submitRecommendation(rec);
    expect(ticket.status).toBe('pending');
    
    // Approve recommendation
    await layer.governance.approveRecommendation(ticket.id, 'admin');
    
    const updated = await layer.governance.getTicket(ticket.id);
    expect(updated!.status).toBe('approved');
    expect(updated!.reviewedBy).toBe('admin');
  });
});
```

- [x] **Step 2: Run test to verify it passes**

Run: `cd orchestrator && pnpm test -- tests/learning/integration.test.ts`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add orchestrator/tests/learning/integration.test.ts
git commit -m "test(learning): add integration test for full workflow"
```

---

## Task 12: Final Verification

- [x] **Step 1: Run all tests**

Run: `cd orchestrator && pnpm test`
Expected: All tests pass (should be 190+ tests now)

- [x] **Step 2: Verify no lint errors**

Run: `cd orchestrator && pnpm run check`
Expected: No errors

- [x] **Step 3: Build verification**

Run: `cd orchestrator && pnpm run build`
Expected: Compiles without errors

---

## Summary

| Task | Files Created | Tests |
|------|--------------|-------|
| 1 | 1 | 1 |
| 2 | 2 | 4 |
| 3 | 1 | 3 |
| 4 | 3 | 3 |
| 5 | 3 | 4 |
| 6 | 2 | 3 |
| 7 | 3 | 4 |
| 8 | 2 | 3 |
| 9 | 1 | 2 |
| 10 | 1 | 4 |
| 11 | 1 | 2 |
| **Total** | **20 files** | **33 tests** |

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks

**2. Inline Execution** - Execute tasks in this session using subagent-driven-development

Which approach?

---

## ✅ Execution Complete

**Status:** All 12 tasks shipped on branch `feat/orchestrator-sub-spec-3-learning` in worktree `.worktrees/sub-spec-3-learning`.

### Final Verification (Task 12)

| Check | Result |
|-------|--------|
| Tests | **243 / 243 passing** (42 files, 6.4s) |
| Lint (`pnpm run lint` = `tsc --noEmit`) | clean |
| Build (`pnpm run build`) | success, `dist/bin.js` chmod +x |

### Post-ship Code Review

A full review produced **17 findings** across 12 files. All were fixed in commit `fb60c36` (`fix(learning): address all 17 code review findings`):

- **Real bugs:** collector re-entrancy, `dbPath` ignored, inline type predicate drift, `isExecutionEvent` string-prefix typing, audit log not persisted, CLI subcommands unhandled, `parseAnalyticsCommand` silent pass-through.
- **Hardening:** `daysToTimeRange` helper, `EXECUTION_EVENT_TYPES` const, `getLastPatterns()` exposure, status secondary index, `intervalHours > 0` validation, `LearningLayerValidationError`, `AnalyticsCommandError`, `SchedulerValidationError`.
- **Nits:** `AUTO_FLUSH_THRESHOLD` constant, `DEFAULT_INTERVAL_HOURS` constant, ring buffer for audit (`maxEntries`), `clamp01` for confidence, drop non-null assertions.

Test count grew from 223 → 243 over the review.

### Files Delivered

- `orchestrator/src/learning/telemetry/{events,store,collector}.ts` (in-memory, JSONL-auditable)
- `orchestrator/src/learning/analytics/{metrics,queries,engine}.ts` (typed event discrimination)
- `orchestrator/src/learning/patterns/{types,thresholds,detector}.ts`
- `orchestrator/src/learning/recommendations/engine.ts` (6 types, clamped confidence)
- `orchestrator/src/learning/governance/{tickets,audit,layer}.ts` (JSONL persistence + status index)
- `orchestrator/src/learning/scheduler/{scheduler,analyzer}.ts` (validated)
- `orchestrator/src/learning/index.ts` (curated `createLearningLayer` factory)
- `orchestrator/src/analytics-cli.ts` (analyze / patterns / recommendations / status dispatch)
- `orchestrator/tests/learning/**` (10 test files, 243 tests)

### What's Next

- Sub-Spec 4: wire the learning layer to live orchestrator execution (emit events from `ExecutionEngine`).
- Optional: implement the scaffolded 3-tier SQLite fallback in `TelemetryStore`.
- Run `pnpm analytics status` to inspect the in-memory event store from the CLI.