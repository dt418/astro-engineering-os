import { describe, it, expect } from 'vitest';
import { parseAnalyticsCommand } from '../src/analytics-cli.js';

describe('AnalyticsCLI', () => {
  it('parses run command', () => {
    const result = parseAnalyticsCommand(['analytics', 'run', '--range', '7d']);

    expect(result.command).toBe('run');
    expect(result.options.range).toBe('7d');
  });

  it('parses patterns command', () => {
    const result = parseAnalyticsCommand(['analytics', 'patterns', '--type', 'high_failure_rate']);

    expect(result.command).toBe('patterns');
    expect(result.options.type).toBe('high_failure_rate');
  });

  it('parses recommendations command', () => {
    const result = parseAnalyticsCommand(['analytics', 'recommendations', '--priority', 'high']);

    expect(result.command).toBe('recommendations');
    expect(result.options.priority).toBe('high');
  });

  it('parses export command', () => {
    const result = parseAnalyticsCommand([
      'analytics',
      'export',
      '--format',
      'json',
      '--output',
      'out.json',
    ]);

    expect(result.command).toBe('export');
    expect(result.options.format).toBe('json');
    expect(result.options.output).toBe('out.json');
  });
});
