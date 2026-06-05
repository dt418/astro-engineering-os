export const DEFAULT_INTERVAL_HOURS = 24;

export interface SchedulerOptions {
  intervalHours: number;
  enabled?: boolean;
}

export interface Scheduler {
  scheduleNext(): void;
  isEnabled(): boolean;
  getIntervalHours(): number;
}

export class SchedulerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulerValidationError';
  }
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  if (!Number.isFinite(options.intervalHours) || options.intervalHours <= 0) {
    throw new SchedulerValidationError(
      `createScheduler: intervalHours must be a positive number, received ${options.intervalHours}`,
    );
  }

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
