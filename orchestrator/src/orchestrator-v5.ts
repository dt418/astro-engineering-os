import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
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
import { ExecutionEngine } from './runtime/execution-engine.js';
import type { TaskType } from './runtime/execution-task.js';
import type { Executor } from './executors/skill-executor.js';
import { SkillExecutor } from './executors/skill-executor.js';
import { WorkflowExecutor, ReviewerExecutor } from './executors/workflow-reviewer-executor.js';
import type { ExecutionResult } from './runtime/execution-result.js';

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

export interface ExecutionRequest {
  readonly input: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ExecutionResponse {
  readonly requestId: string;
  readonly classification: Classification;
  readonly plan: ExecutionPlan;
  readonly result: ExecutionResult;
}

export interface OrchestratorV5Deps {
  skills: SkillsRegistry;
  agents: AgentsRegistry;
  workflows: WorkflowsRegistry;
  reviewers: ReviewersRegistry;
  intents: IntentsRegistry;
  classifier: IntentClassifier;
  executionEngine?: ExecutionEngine;
}

export class OrchestratorV5 {
  readonly skills: SkillsRegistry;
  readonly agents: AgentsRegistry;
  readonly workflows: WorkflowsRegistry;
  readonly reviewers: ReviewersRegistry;
  readonly intents: IntentsRegistry;
  readonly classifier: IntentClassifier;
  readonly engine: ExecutionEngine;

  constructor(deps: OrchestratorV5Deps) {
    this.skills = deps.skills;
    this.agents = deps.agents;
    this.workflows = deps.workflows;
    this.reviewers = deps.reviewers;
    this.intents = deps.intents;
    this.classifier = deps.classifier;
    this.engine =
      deps.executionEngine ??
      new ExecutionEngine(
        new Map<TaskType, Executor>([
          ['skill', new SkillExecutor(deps.skills)],
          ['workflow', new WorkflowExecutor(deps.workflows)],
          ['reviewer', new ReviewerExecutor(deps.reviewers)],
        ] as const),
      );
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

  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    return this.executeAsync(request);
  }

  async executeAsync(request: ExecutionRequest): Promise<ExecutionResponse> {
    const built = this.#buildExecutionResponse(request);
    return { requestId: built.requestId, classification: built.classification, plan: built.plan, result: await built.result };
  }

  #buildExecutionResponse(request: ExecutionRequest): {
    requestId: string;
    classification: Classification;
    plan: ExecutionPlan;
    result: Promise<ExecutionResult>;
  } {
    const requestId = randomUUID();
    const classification = this.classifier.classify(request.input);
    const plan = this.plan({ input: request.input, context: request.context });
    const result = this.engine.execute(plan, requestId);
    return { requestId, classification, plan, result };
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

  const engine = new ExecutionEngine(
    new Map<TaskType, Executor>([
      ['skill', new SkillExecutor(skills)],
      ['workflow', new WorkflowExecutor(workflows)],
      ['reviewer', new ReviewerExecutor(reviewers)],
    ] as const),
  );

  return new OrchestratorV5({
    skills,
    agents,
    workflows,
    reviewers,
    intents,
    classifier: createIntentClassifier(),
    executionEngine: engine,
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
