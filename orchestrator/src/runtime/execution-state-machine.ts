export type ExecutionState = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StateTransition {
  readonly from: ExecutionState;
  readonly to: ExecutionState;
  readonly allowed: boolean;
}

const VALID_TRANSITIONS: ReadonlyMap<ExecutionState, readonly ExecutionState[]> = new Map([
  ['planned', ['running', 'cancelled']],
  ['running', ['completed', 'failed', 'cancelled']],
  ['completed', []],
  ['failed', []],
  ['cancelled', []],
]);

export class ExecutionStateMachine {
  private _state: ExecutionState;

  constructor(initialState: ExecutionState = 'planned') {
    this._state = initialState;
  }

  get state(): ExecutionState {
    return this._state;
  }

  canTransition(next: ExecutionState): boolean {
    const allowed = VALID_TRANSITIONS.get(this._state) ?? [];
    return allowed.includes(next);
  }

  transition(next: ExecutionState): boolean {
    if (!this.canTransition(next)) {
      return false;
    }
    this._state = next;
    return true;
  }

  reset(): void {
    this._state = 'planned';
  }

  getTransition(next: ExecutionState): StateTransition {
    return {
      from: this._state,
      to: next,
      allowed: this.canTransition(next),
    };
  }
}