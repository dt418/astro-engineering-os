export interface WorkerPoolConfig {
  readonly maxWorkers: number;
}

export class WorkerPool<Task, Result> {
  private readonly maxWorkers: number;
  private activeCount = 0;
  private pendingResults: Promise<Result>[] = [];

  constructor(config: WorkerPoolConfig) {
    this.maxWorkers = config.maxWorkers;
  }

  async run(
    tasks: Task[],
    handler: (task: Task) => Promise<Result>,
  ): Promise<Result[]> {
    if (tasks.length === 0) return [];

    const results: Result[] = [];
    const pending: Promise<Result>[] = [];

    for (const task of tasks) {
      while (this.activeCount >= this.maxWorkers) {
        const settled = await Promise.race(pending);
        const index = pending.findIndex(p => p === settled);
        if (index > -1) pending.splice(index, 1);
        this.activeCount--;
      }

      this.activeCount++;
      const promise = handler(task).then(result => {
        this.activeCount--;
        return result;
      });
      pending.push(promise);
    }

    const allResults = await Promise.all(pending);
    return allResults;
  }

  get activeWorkers(): number {
    return this.activeCount;
  }

  get availableSlots(): number {
    return Math.max(0, this.maxWorkers - this.activeCount);
  }
}