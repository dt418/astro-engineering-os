export type ExecutionEventType =
  | 'execution:started'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled';

export interface ExecutionEvent {
  readonly type: ExecutionEventType;
  readonly requestId: string;
  readonly timestamp: Date;
  readonly data: Record<string, unknown>;
}

export type EventListener = (event: ExecutionEvent) => void;

export class ExecutionEventEmitter {
  private listeners: Map<ExecutionEventType, Set<EventListener>> = new Map();

  on(event: ExecutionEventType, listener: EventListener): () => void {
    const existing = this.listeners.get(event) ?? new Set();
    existing.add(listener);
    this.listeners.set(event, existing);
    return () => this.off(event, listener);
  }

  off(event: ExecutionEventType, listener: EventListener): void {
    const existing = this.listeners.get(event);
    if (existing) {
      existing.delete(listener);
    }
  }

  emit(event: ExecutionEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}