export class ReadyQueue {
  private queue: string[] = [];

  enqueue(taskId: string): void {
    if (!this.queue.includes(taskId)) {
      this.queue.push(taskId);
    }
  }

  enqueueBatch(taskIds: string[]): void {
    for (const id of taskIds) {
      this.enqueue(id);
    }
  }

  dequeue(): string | null {
    return this.queue.shift() ?? null;
  }

  dequeueN(n: number): string[] {
    const tasks: string[] = [];
    for (let i = 0; i < n && this.queue.length > 0; i++) {
      const task = this.dequeue();
      if (task) tasks.push(task);
    }
    return tasks;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }

  peek(): string | null {
    return this.queue[0] ?? null;
  }
}