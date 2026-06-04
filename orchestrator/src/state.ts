import type { TaskNode, TaskState } from './types.js';

const TRANSITIONS: Record<TaskState, TaskState[]> = {
  pending: ['ready', 'blocked', 'failed'],
  ready: ['running', 'failed'],
  running: ['completed', 'failed', 'blocked'],
  completed: [],
  failed: ['running'],
  blocked: ['ready', 'failed'],
};

const TERMINAL_STATES: ReadonlySet<TaskState> = new Set<TaskState>([
  'completed',
  'failed',
]);

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
      return TERMINAL_STATES.has(state);
    },
    canTransition(from, to) {
      const next = TRANSITIONS[from];
      return next ? next.includes(to) : false;
    },
  };
}
