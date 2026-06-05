export const PATTERN_THRESHOLDS = {
  HIGH_FAILURE_RATE: 0.2,
  LOW_CONFIDENCE: 0.6,
  SLOW_EXECUTION_P90_MS: 5000,
  CONFIDENCE_DRIFT_DELTA: 0.1,
  MIN_DATA_POINTS: 3,
} as const;

export function getThresholds() {
  return { ...PATTERN_THRESHOLDS };
}
