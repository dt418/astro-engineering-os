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
