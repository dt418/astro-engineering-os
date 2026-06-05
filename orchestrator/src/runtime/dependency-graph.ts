import type { ExecutionTask } from './execution-task.js';

export interface TaskNode {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly dependencies: readonly string[];
}

export interface DependencyGraph {
  readonly nodes: ReadonlyMap<string, TaskNode>;
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  readonly dependents: ReadonlyMap<string, readonly string[]>;
}

export interface CycleError {
  readonly code: 'CYCLE_DETECTED';
  readonly message: string;
  readonly cycleNodes: readonly string[];
}

export function createCycleError(cycleNodes: readonly string[]): CycleError {
  return {
    code: 'CYCLE_DETECTED',
    message: `Circular dependency detected: ${cycleNodes.join(' → ')}`,
    cycleNodes,
  };
}

export function buildGraph(tasks: ExecutionTask[]): DependencyGraph {
  const nodes = new Map<string, TaskNode>();
  const adjacency = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    nodes.set(task.id, {
      id: task.id,
      type: task.type,
      target: task.target,
      dependencies: task.dependencies,
    });
    adjacency.set(task.id, [...task.dependencies]);
    dependents.set(task.id, []);
  }

  for (const task of tasks) {
    for (const dep of task.dependencies) {
      const existing = dependents.get(dep) ?? [];
      dependents.set(dep, [...existing, task.id]);
    }
  }

  return {
    nodes,
    adjacency: new Map(adjacency),
    dependents: new Map(dependents),
  };
}

export function detectCycles(graph: DependencyGraph): CycleError | null {
  const inDegree = new Map<string, number>();

  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, 0);
  }

  for (const node of graph.nodes.values()) {
    for (const depId of node.dependencies) {
      inDegree.set(depId, (inDegree.get(depId) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  let processed = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    processed++;
    for (const neighbor of graph.adjacency.get(id) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (processed !== graph.nodes.size) {
    const cycleNodes: string[] = [];
    for (const [id, degree] of [...inDegree.entries()]) {
      if (degree > 0) cycleNodes.push(id);
    }
    return createCycleError(cycleNodes);
  }

  return null;
}

export function topologicalSort(graph: DependencyGraph): readonly string[][] {
  const levels: string[][] = [];
  const completed = new Set<string>();
  const pendingDegrees = new Map<string, number>();
  const externalDeps = new Set<string>();

  for (const [id, node] of [...graph.nodes.entries()]) {
    let degree = 0;
    for (const dep of node.dependencies) {
      if (graph.nodes.has(dep)) {
        degree++;
      } else {
        externalDeps.add(dep);
      }
    }
    pendingDegrees.set(id, degree);
  }

  while (completed.size < graph.nodes.size) {
    const level: string[] = [];

    for (const [id, degree] of pendingDegrees) {
      if (completed.has(id)) continue;
      if (degree === 0) level.push(id);
    }

    if (level.length === 0 && completed.size < graph.nodes.size) {
      const unvisited = [...pendingDegrees.entries()]
        .filter(([id]) => !completed.has(id))
        .map(([id]) => id);
      throw Object.assign(new Error('Graph has unresolvable dependencies'), {
        code: 'CYCLE_DETECTED',
        cycleNodes: unvisited,
      });
    }

    levels.push([...level]);
    for (const id of level) completed.add(id);

    for (const [id, node] of [...graph.nodes.entries()]) {
      if (completed.has(id)) continue;
      const externalCount = node.dependencies.filter(d => externalDeps.has(d)).length;
      const internalSatisfied = node.dependencies.filter(d => completed.has(d)).length;
      pendingDegrees.set(id, node.dependencies.length - externalCount - internalSatisfied);
    }
  }

  return levels;
}

export function getReadyTasks(
  graph: DependencyGraph,
  completed: ReadonlySet<string>,
  pendingDegrees: ReadonlyMap<string, number>,
): string[] {
  const ready: string[] = [];
  for (const [id, degree] of pendingDegrees) {
    if (completed.has(id)) continue;
    if (degree === 0) ready.push(id);
  }
  return ready;
}

export function updatePendingDegrees(
  graph: DependencyGraph,
  completedTaskId: string,
  pendingDegrees: Map<string, number>,
): void {
  const dependents = graph.dependents.get(completedTaskId) ?? [];
  for (const dependentId of dependents) {
    if (pendingDegrees.has(dependentId)) {
      pendingDegrees.set(
        dependentId,
        Math.max(0, (pendingDegrees.get(dependentId) ?? 1) - 1),
      );
    }
  }
}