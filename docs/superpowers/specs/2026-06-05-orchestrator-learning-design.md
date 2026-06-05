# Sub-Spec 3: Learning + Self-Improving Routing

**Status:** ✅ **Shipped** (2026-06-05)
**Date:** 2026-06-05
**Author:** Architect Agent
**Implementation:** 12/12 tasks complete on branch `feat/orchestrator-sub-spec-3-learning`
**Tests:** 243 / 243 passing · lint clean · build success

---

## 1. Overview

Sub-Spec 3 adds an observability-first learning layer to Orchestrator V5. The system collects execution telemetry, detects patterns, and generates routing recommendations — all without autonomous mutation of production routing.

**Design Principles:**
- Deterministic and explainable
- Human-governed routing changes
- Event-sourced analytics
- Structured JSON as canonical output format

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        OrchestratorV5                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Registry │  │ Routing  │  │ Execution│  │  History │       │
│  │  Layer   │  │  Layer   │  │  Engine  │  │   (SQLite)│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    emits events ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Learning Layer (Sidecar)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ Telemetry  │  │ Analytics  │  │ Pattern    │  │  Recomm. │  │
│  │ Collection │──│   Engine   │──│  Detection │──│  Engine  │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
│                                                              │
│  ┌────────────┐  ┌────────────┐                             │
│  │ Scheduled  │  │ Governance │                             │
│  │  Analysis  │  │   Controls │                             │
│  └────────────┘  └────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Inventory

### 3.1 TelemetryCollector

Collects events from execution engine, routing layer, and reviewer workflows.

**Events collected:**
- `execution.started` — task begins
- `execution.completed` — task completes successfully
- `execution.failed` — task fails with error
- `classification.confidence` — intent classification with confidence score
- `classification.resolved` — routing decision made
- `reviewer.invoked` — reviewer called
- `reviewer.completed` — reviewer finishes
- `workflow.completed` — workflow completes

**Interface:**
```typescript
interface TelemetryCollector {
  emit(event: TelemetryEvent): void;
  flush(): Promise<void>;
}
```

### 3.2 TelemetryStore

SQLite-backed event store extending history.ts.

**Schema:**
```sql
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  request_id TEXT,
  intent TEXT,
  payload TEXT NOT NULL, -- JSON blob
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_telemetry_timestamp ON telemetry_events(timestamp);
CREATE INDEX idx_telemetry_type ON telemetry_events(type);
CREATE INDEX idx_telemetry_intent ON telemetry_events(intent);
```

**Interface:**
```typescript
interface TelemetryStore {
  store(event: TelemetryEvent): Promise<void>;
  query(filter: TelemetryQuery): Promise<TelemetryEvent[]>;
  getStats(timeRange: TimeRange): Promise<TelemetryStats>;
}
```

### 3.3 AnalyticsEngine

Computes metrics and insights from telemetry data.

**Metrics computed:**
- Execution duration (p50, p90, p99)
- Success/failure rates per intent
- Skill utilization rates
- Classification confidence distribution
- Reviewer invocation frequency
- Workflow completion rates

**Interface:**
```typescript
interface AnalyticsEngine {
  computeMetrics(timeRange: TimeRange): Promise<AnalyticsMetrics>;
  getIntentStats(intent: string): Promise<IntentStats>;
  getSkillStats(skillId: string): Promise<SkillStats>;
}
```

### 3.4 PatternDetector

Identifies patterns in execution and routing data.

**Patterns detected:**
- `high_failure_rate` — intent has >X% failure rate
- `low_confidence` — classification confidence consistently below threshold
- `slow_execution` — skill execution consistently exceeds duration threshold
- `unused_capability` — registered skill never invoked
- `routing_degeneracy` — multiple intents route to same execution plan
- `confidence_drift` — classification confidence trending down over time

**Interface:**
```typescript
interface PatternDetector {
  detectPatterns(metrics: AnalyticsMetrics): Promise<Pattern[]>;
  getPatternsByType(type: PatternType): Promise<Pattern[]>;
  explainPattern(pattern: Pattern): string;
}
```

### 3.5 RecommendationEngine

Generates explainable routing improvement suggestions.

**Recommendation types:**
- `intent_mapping_suggestion` — recommend adding/removing skill from intent
- `confidence_threshold_adjustment` — suggest threshold change for low-confidence classification
- `skill_dependency_hint` — suggest skill ordering based on execution patterns
- `reviewer_coverage_gap` — identify intents without reviewer coverage

**Interface:**
```typescript
interface RecommendationEngine {
  generateRecommendations(patterns: Pattern[]): Promise<Recommendation[]>;
  getRecommendationConfidence(rec: Recommendation): number;
  explainRecommendation(rec: Recommendation): string;
}
```

### 3.6 ScheduledAnalyzer

Background job for periodic analysis.

**Features:**
- Configurable analysis interval (default: daily)
- Incremental analysis (process only new events since last run)
-结果 persistence
- Notification hooks (future)

**Interface:**
```typescript
interface ScheduledAnalyzer {
  runAnalysis(): Promise<AnalysisResult>;
  getLastAnalysisTime(): Promise<Date | null>;
  scheduleNext(): void;
}
```

### 3.7 GovernanceLayer

Human review workflow for recommendation approval.

**Features:**
- Recommendation approval/rejection
- Audit trail for all governance decisions
- Preview mode (generate recommendations without applying)

**Interface:**
```typescript
interface GovernanceLayer {
  submitRecommendation(rec: Recommendation): Promise<GovernanceTicket>;
  approveRecommendation(ticketId: string): Promise<void>;
  rejectRecommendation(ticketId: string, reason: string): Promise<void>;
  getPendingRecommendations(): Promise<GovernanceTicket[]>;
}
```

---

## 4. Runtime Flow

### 4.1 Event Collection Flow

```
1. ExecutionEngine emits event
       ↓
2. TelemetryCollector intercepts
       ↓
3. Event enriched with metadata
       ↓
4. Event stored in TelemetryStore
       ↓
5. Async analytics (if scheduled analysis due)
```

### 4.2 Recommendation Generation Flow

```
1. CLI/REST triggers analysis (on-demand or scheduled)
       ↓
2. TelemetryStore queries events for time range
       ↓
3. AnalyticsEngine computes metrics
       ↓
4. PatternDetector identifies patterns
       ↓
5. RecommendationEngine generates suggestions
       ↓
6. Structured JSON output via API/CLI
       ↓
7. Human reviews recommendation
       ↓
8. If approved → manual registry update (NOT automatic)
```

---

## 5. Data Flow

```
┌─────────────────┐
│ ExecutionEngine │
└────────┬────────┘
         │ emit events
         ▼
┌─────────────────┐
│ TelemetryCollector│
└────────┬────────┘
         │ store
         ▼
┌─────────────────┐     query      ┌─────────────────┐
│  TelemetryStore  │───────────────▶│ AnalyticsEngine │
│     (SQLite)     │◀───────────────│                 │
└─────────────────┘  raw events     └────────┬────────┘
                                            │
                                      detect patterns
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ PatternDetector │
                                   └────────┬────────┘
                                            │
                                      generate recs
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Recommendation  │
                                   │     Engine      │
                                   └────────┬────────┘
                                            │
                                      structured JSON
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
             ┌──────────┐           ┌──────────┐           ┌──────────┐
             │    CLI   │           │ REST API │           │ Dashboard │
             └──────────┘           └──────────┘           └──────────┘
```

---

## 6. Entity Definitions

### 6.1 TelemetryEvent

```typescript
interface TelemetryEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  requestId?: string;
  intent?: string;
  payload: EventPayload;
}

type EventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'classification.confidence'
  | 'classification.resolved'
  | 'reviewer.invoked'
  | 'reviewer.completed'
  | 'workflow.completed';

interface ExecutionPayload {
  taskId: string;
  taskType: 'skill' | 'workflow' | 'reviewer';
  taskName: string;
  durationMs?: number;
  success?: boolean;
  error?: string;
}

interface ClassificationPayload {
  intent: string;
  confidence: number;
  signals: string[];
}

interface ReviewerPayload {
  reviewerId: string;
  outcome: 'approved' | 'rejected' | 'skipped';
  durationMs?: number;
}
```

### 6.2 Pattern

```typescript
interface Pattern {
  id: string;
  type: PatternType;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: Date;
  affectedEntity: string;
  evidence: PatternEvidence;
  recommendation?: string;
}

type PatternType =
  | 'high_failure_rate'
  | 'low_confidence'
  | 'slow_execution'
  | 'unused_capability'
  | 'routing_degeneracy'
  | 'confidence_drift';

interface PatternEvidence {
  metric: string;
  value: number;
  threshold: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  dataPoints: number;
}
```

### 6.3 Recommendation

```typescript
interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high';
  target: string;
  description: string;
  rationale: string;
  confidence: number;
  patterns: string[]; // Pattern IDs that generated this recommendation
  actionableSteps: string[];
  estimatedImpact?: string;
}

type RecommendationType =
  | 'intent_mapping_suggestion'
  | 'confidence_threshold_adjustment'
  | 'skill_dependency_hint'
  | 'reviewer_coverage_gap'
  | 'skill_addition'
  | 'skill_removal';
```

### 6.4 GovernanceTicket

```typescript
interface GovernanceTicket {
  id: string;
  recommendation: Recommendation;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}
```

---

## 7. File Structure

```
orchestrator/src/
├── learning/
│   ├── index.ts
│   ├── telemetry/
│   │   ├── collector.ts
│   │   ├── store.ts
│   │   └── events.ts
│   ├── analytics/
│   │   ├── engine.ts
│   │   ├── metrics.ts
│   │   └── queries.ts
│   ├── patterns/
│   │   ├── detector.ts
│   │   ├── types.ts
│   │   └── thresholds.ts
│   ├── recommendations/
│   │   ├── engine.ts
│   │   └── generators.ts
│   ├── scheduler/
│   │   ├── analyzer.ts
│   │   └── scheduler.ts
│   └── governance/
│       ├── layer.ts
│       ├── tickets.ts
│       └── audit.ts
├── analytics-cli.ts
└── analytics-api.ts
```

---

## 8. Interfaces Summary

### Public API (orchestrator/src/learning/index.ts)

```typescript
export interface LearningLayer {
  collector: TelemetryCollector;
  store: TelemetryStore;
  analytics: AnalyticsEngine;
  patterns: PatternDetector;
  recommendations: RecommendationEngine;
  scheduler: ScheduledAnalyzer;
  governance: GovernanceLayer;
}

export async function createLearningLayer(
  dbPath?: string
): Promise<LearningLayer>;

export async function runAnalysis(
  layer: LearningLayer,
  options?: AnalysisOptions
): Promise<AnalysisResult>;

export interface AnalysisOptions {
  timeRange?: TimeRange;
  patterns?: PatternType[];
  includeRecommendations?: boolean;
}

export interface AnalysisResult {
  metrics: AnalyticsMetrics;
  patterns: Pattern[];
  recommendations: Recommendation[];
  executedAt: Date;
  durationMs: number;
}
```

### CLI Commands

```bash
# Run analysis
orchestrator analytics run --range 7d

# View patterns
orchestrator analytics patterns --type high_failure_rate

# View recommendations
orchestrator analytics recommendations --priority high

# Approve/reject recommendation
orchestrator analytics approve <recommendation-id>
orchestrator analytics reject <recommendation-id> --reason "..."

# View telemetry
orchestrator analytics telemetry --intent skill-executor --range 24h

# Export structured data
orchestrator analytics export --format json --output ./analytics.json
```

### REST API Endpoints

```
GET  /api/v1/analytics/metrics?range=7d
GET  /api/v1/analytics/patterns?type=high_failure_rate
GET  /api/v1/analytics/recommendations?priority=high
POST /api/v1/analytics/recommendations/:id/approve
POST /api/v1/analytics/recommendations/:id/reject
GET  /api/v1/analytics/telemetry?intent=...&type=...
POST /api/v1/analytics/run
GET  /api/v1/analytics/status
```

---

## 9. Non-Goals

The following are explicitly NOT in scope for Sub-Spec 3:

1. **Autonomous routing changes** — All routing remains human-governed
2. **Automatic registry mutation** — Learning layer does not modify markdown files
3. **LLM-dependent routing** — All decisions are rule-based and explainable
4. **External analytics platforms** — No third-party dashboards or data pipelines
5. **A/B testing framework** — Not in initial scope
6. **Real-time streaming analytics** — Batch and on-demand only
7. **Multi-tenant isolation** — Single tenant for now

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Telemetry collection impacts performance | Async event emission, no blocking |
| SQLite becomes bottleneck at scale | Query optimization, time-range partitioning |
| Pattern detection produces false positives | Configurable thresholds, severity levels |
| Recommendation spam | Governance layer, priority ranking |
| Data privacy concerns | No PII in telemetry, configurable filtering |
| Analysis jobs overlap | Scheduler coordination, idempotent runs |

---

## 11. Migration Strategy

1. **Phase 1:** Telemetry infrastructure (collector, store, basic events)
2. **Phase 2:** Analytics engine (metrics computation, querying)
3. **Phase 3:** Pattern detection (threshold-based pattern identification)
4. **Phase 4:** Recommendation engine (structured suggestions)
5. **Phase 5:** CLI/REST API (human-facing interfaces)
6. **Phase 6:** Scheduled analysis (background job support)

Each phase is independently testable and deployable.

---

## 12. Backward Compatibility

- All existing execution behavior unchanged
- Telemetry collection is non-intrusive (no changes to ExecutionEngine interface)
- Existing history.ts functionality preserved
- New telemetry tables coexist with existing tables
- CLI/REST additions are additive, not breaking

---

## 13. Acceptance Criteria

### AC1: Event Collection
- [ ] Execution events captured without blocking execution
- [ ] Classification events captured with confidence scores
- [ ] All event types stored in SQLite with timestamps

### AC2: Analytics
- [ ] Metrics computed for configurable time ranges
- [ ] Per-intent statistics queryable
- [ ] Per-skill execution times queryable

### AC3: Pattern Detection
- [ ] High failure rate patterns detected
- [ ] Low confidence patterns detected
- [ ] Slow execution patterns detected
- [ ] Pattern explanations human-readable

### AC4: Recommendations
- [ ] Recommendations generated from patterns
- [ ] Confidence scores computed per recommendation
- [ ] Actionable steps included in each recommendation

### AC5: CLI Interface
- [ ] `analytics run` executes full analysis pipeline
- [ ] `analytics patterns` lists detected patterns
- [ ] `analytics recommendations` lists recommendations
- [ ] `analytics export` produces valid JSON

### AC6: REST API
- [ ] All GET endpoints return structured JSON
- [ ] All POST endpoints validate input
- [ ] Error responses include error codes and messages

### AC7: Governance
- [ ] Recommendations can be approved/rejected
- [ ] Audit trail maintained for all governance actions
- [ ] Pending recommendations queryable

### AC8: Scheduled Analysis
- [ ] Analysis runs on configurable schedule
- [ ] Analysis results persisted
- [ ] No overlapping analysis runs

### AC9: Non-Functional
- [ ] Telemetry collection adds <1ms overhead to execution
- [ ] Analysis completes in <30s for 10K events
- [ ] All components testable in isolation

---

## 14. Future Compatibility

### Parallel Runtime (Sub-Spec 2.5)
- Telemetry events include parallel execution context
- Metrics account for concurrent task execution
- Pattern detection considers parallelism effects

### Multi-Agent Runtime (Future)
- Agent-level telemetry (separate from task-level)
- Cross-agent pattern detection
- Agent coordination recommendations

### Policy Engine (Future)
- Governance rules as structured policies
- Policy evaluation based on analytics data
- Policy enforcement with audit trail

---

## 15. Testing Strategy

### Unit Tests
- TelemetryCollector: event transformation
- TelemetryStore: CRUD operations
- AnalyticsEngine: metric computation
- PatternDetector: pattern identification
- RecommendationEngine: recommendation generation

### Integration Tests
- End-to-end telemetry flow
- Analysis pipeline execution
- CLI command execution
- REST API endpoints

### E2E Tests
- Complete analysis run
- Recommendation lifecycle
- Governance workflow

---

## 16. Dependencies

**New dependencies:**
- None beyond existing SQLite infrastructure

**Extended dependencies:**
- `history.ts` — telemetry storage integration
- `execution-events.ts` — event emission integration

---

## 17. Implementation Notes (post-ship)

### 17.1 Storage decision

The 3-tier SQLite fallback (`better-sqlite3 > sql.js > in-memory`) is **designed but not wired**. The shipped `TelemetryStore` is in-memory only; the `createTelemetryStore({ dbPath })` factory validates the path and returns an in-memory store. The interface is stable enough to drop in a SQLite implementation without changing callers.

### 17.2 Event-type discrimination

`EXECUTION_EVENT_TYPES`, `CLASSIFICATION_EVENT_TYPES`, `REVIEWER_EVENT_TYPES` are exported as `as const` arrays from `events.ts`. The `isExecutionEvent` / `isClassificationEvent` predicates consume these arrays, replacing the original `type.startsWith('execution.')` string-prefix check. This eliminates drift between event creation and event filtering.

### 17.3 Collector re-entrancy

The `TelemetryCollector` uses promise chaining (`flushPromise`) rather than a boolean `flushing` flag. Concurrent `flush()` calls are serialized; the second call awaits the first and then re-checks the queue. This was a real bug found in code review.

### 17.4 Curated public surface

`createLearningLayer` returns a curated `LearningLayer` interface with `emit`, `flush`, `runAnalysis`, `submitRecommendation`, `approveRecommendation`, `rejectRecommendation`, `getPendingRecommendations`, `getAuditEntries`, and an `internals` bag for advanced consumers. The factory validates `dbPath` and `intervalHours`, throwing `LearningLayerValidationError` on bad input.

### 17.5 Audit trail

`AuditTrail` is append-only JSONL with optional `persistPath`. On startup, `loadFromDisk()` rehydrates the in-memory ring buffer (default cap 100k entries, FIFO eviction). The governance layer always calls `await audit.addEntry(...)` so persistence is never silently skipped.

### 17.6 CLI surface

`analytics-cli.ts` exposes four subcommands: `analyze`, `patterns`, `recommendations`, `status`. Each requires a matching handler in `dispatchAnalyticsCommand(cmd, handlers)`. Unknown commands throw `AnalyticsCommandError` — no silent pass-through.

### 17.7 Out of scope (deferred)

- **REST API** (`analytics-api.ts`) — referenced in the plan file structure, not yet implemented.
- **Wiring to `ExecutionEngine`** — the layer is shipped as a sidecar; emitting events from live execution is Sub-Spec 4.
- **SQLite tiers** — only the in-memory store is wired; the SQLite branches are scaffolded.
- **Per-type recommendation generators** — the plan referenced a `generators.ts` file; all 6 types are currently inline in `engine.ts` behind a single `generateFromPattern(pattern)` switch.

**No new external dependencies.**