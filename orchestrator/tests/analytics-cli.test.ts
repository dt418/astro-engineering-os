import { describe, it, expect, vi } from 'vitest';
import {
  parseAnalyticsCommand,
  dispatchAnalyticsCommand,
  AnalyticsCommandError,
  parseTimeRange,
} from '../src/analytics-cli.js';

describe('AnalyticsCLI', () => {
  it('parses analyze command', () => {
    const result = parseAnalyticsCommand(['analytics', 'analyze', '--range', '7d']);

    expect(result.command).toBe('analyze');
    expect(result.options.range).toBe('7d');
  });

  it('parses patterns command with subcommand', () => {
    const result = parseAnalyticsCommand([
      'analytics',
      'patterns',
      'high_failure_rate',
      '--range',
      '2w',
    ]);

    expect(result.command).toBe('patterns');
    expect(result.subcommand).toBe('high_failure_rate');
    expect(result.options.range).toBe('2w');
  });

  it('parses recommendations command', () => {
    const result = parseAnalyticsCommand(['analytics', 'recommendations', '--priority', 'high']);

    expect(result.command).toBe('recommendations');
    expect(result.options.priority).toBe('high');
  });

  it('parses status command', () => {
    const result = parseAnalyticsCommand(['analytics', 'status']);

    expect(result.command).toBe('status');
  });

  it('rejects unknown command', () => {
    expect(() => parseAnalyticsCommand(['analytics', 'run', '--range', '7d'])).toThrow(
      AnalyticsCommandError,
    );
  });

  it('rejects missing command', () => {
    expect(() => parseAnalyticsCommand(['analytics'])).toThrow(AnalyticsCommandError);
  });

  it('dispatches analyze to runAnalysis handler', async () => {
    const runAnalysis = vi.fn().mockResolvedValue({
      metrics: { execution: { successRate: 0.9 } },
      patterns: [],
      recommendations: [],
    });
    const cmd = parseAnalyticsCommand(['analytics', 'analyze', '--range', '7d']);
    const out = await dispatchAnalyticsCommand(cmd, { runAnalysis });

    expect(runAnalysis).toHaveBeenCalledWith({ days: 7 });
    expect(out).toContain('Analysis Results');
  });

  it('dispatches patterns to listPatterns handler', async () => {
    const listPatterns = vi.fn().mockResolvedValue([
      { type: 'high_failure_rate', severity: 'warning', affectedEntity: 'intent-x' },
    ]);
    const cmd = parseAnalyticsCommand(['analytics', 'patterns', '--range', '3d']);
    const out = await dispatchAnalyticsCommand(cmd, { listPatterns });

    expect(listPatterns).toHaveBeenCalledWith({ days: 3 });
    expect(out).toContain('high_failure_rate');
  });

  it('dispatches status and formats', async () => {
    const getStatus = vi.fn().mockResolvedValue({
      storeSize: 42,
      pendingTickets: 3,
      lastAnalysisAt: new Date('2026-06-05T00:00:00Z'),
    });
    const cmd = parseAnalyticsCommand(['analytics', 'status']);
    const out = await dispatchAnalyticsCommand(cmd, { getStatus });

    expect(out).toContain('Events stored:     42');
    expect(out).toContain('Pending tickets:   3');
  });

  it('parseTimeRange supports days and weeks', () => {
    expect(parseTimeRange('7d')).toEqual({ days: 7 });
    expect(parseTimeRange('2w')).toEqual({ days: 14 });
    expect(() => parseTimeRange('5x')).toThrow(AnalyticsCommandError);
  });
});
