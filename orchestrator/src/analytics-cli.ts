export const KNOWN_ANALYTICS_COMMANDS = ['analyze', 'patterns', 'recommendations', 'status'] as const;
export type KnownAnalyticsCommand = (typeof KNOWN_ANALYTICS_COMMANDS)[number];

export class AnalyticsCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsCommandError';
  }
}

export interface CLICommand {
  command: string;
  subcommand?: string;
  options: Record<string, string>;
}

export function parseAnalyticsCommand(args: string[]): CLICommand {
  const [_base, command, ...rest] = args;

  if (!command) {
    throw new AnalyticsCommandError(
      `Missing command. Expected one of: ${KNOWN_ANALYTICS_COMMANDS.join(', ')}`,
    );
  }

  if (!(KNOWN_ANALYTICS_COMMANDS as readonly string[]).includes(command)) {
    throw new AnalyticsCommandError(
      `Unknown command '${command}'. Expected one of: ${KNOWN_ANALYTICS_COMMANDS.join(', ')}`,
    );
  }

  const subcommand = rest[0] && !rest[0].startsWith('--') ? rest[0] : undefined;
  const optArgs = subcommand ? rest.slice(1) : rest;

  const options: Record<string, string> = {};
  for (let i = 0; i < optArgs.length; i++) {
    const arg = optArgs[i];
    if (arg && arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = optArgs[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = 'true';
      }
    }
  }

  return { command, subcommand, options };
}

export interface AnalyticsCliHandlers {
  runAnalysis?: (timeRange: { days: number }) => Promise<{
    metrics: unknown;
    patterns: unknown[];
    recommendations: unknown[];
  }>;
  listPatterns?: (timeRange: { days: number }) => Promise<unknown[]>;
  listRecommendations?: () => Promise<unknown[]>;
  getStatus?: () => Promise<{ storeSize: number; pendingTickets: number; lastAnalysisAt: Date | null }>;
}

export async function dispatchAnalyticsCommand(
  cmd: CLICommand,
  handlers: AnalyticsCliHandlers,
): Promise<string> {
  const timeRange = parseTimeRange(cmd.options.range ?? '1d');

  switch (cmd.command) {
    case 'analyze': {
      if (!handlers.runAnalysis) {
        throw new AnalyticsCommandError("'analyze' requires runAnalysis handler");
      }
      const result = await handlers.runAnalysis(timeRange);
      return formatAnalysisResult(result);
    }
    case 'patterns': {
      if (!handlers.listPatterns) {
        throw new AnalyticsCommandError("'patterns' requires listPatterns handler");
      }
      const patterns = await handlers.listPatterns(timeRange);
      return formatPatternsList(patterns);
    }
    case 'recommendations': {
      if (!handlers.listRecommendations) {
        throw new AnalyticsCommandError("'recommendations' requires listRecommendations handler");
      }
      const recs = await handlers.listRecommendations();
      return formatRecommendationsList(recs);
    }
    case 'status': {
      if (!handlers.getStatus) {
        throw new AnalyticsCommandError("'status' requires getStatus handler");
      }
      const status = await handlers.getStatus();
      return formatStatus(status);
    }
    default:
      throw new AnalyticsCommandError(`Unknown command: ${cmd.command}`);
  }
}

export function formatAnalysisResult(result: {
  metrics?: unknown;
  patterns?: unknown[];
  recommendations?: unknown[];
}): string {
  const lines: string[] = [];

  lines.push('=== Analysis Results ===');

  if (result.metrics) {
    lines.push('\n--- Metrics ---');
    lines.push(JSON.stringify(result.metrics, null, 2));
  }

  if (result.patterns?.length) {
    lines.push('\n--- Patterns ---');
    for (const pattern of result.patterns as Array<{
      type: string;
      severity: string;
      affectedEntity: string;
    }>) {
      lines.push(`  [${pattern.severity}] ${pattern.type} - ${pattern.affectedEntity}`);
    }
  }

  if (result.recommendations?.length) {
    lines.push('\n--- Recommendations ---');
    for (const rec of result.recommendations as Array<{
      priority: string;
      description: string;
      confidence: number;
    }>) {
      lines.push(`  [${rec.priority}] ${rec.description} (${(rec.confidence * 100).toFixed(0)}% confidence)`);
    }
  }

  return lines.join('\n');
}

export function formatPatternsList(patterns: unknown[]): string {
  if (patterns.length === 0) return 'No patterns detected.';
  const lines = ['=== Patterns ==='];
  for (const pattern of patterns as Array<{
    type: string;
    severity: string;
    affectedEntity: string;
  }>) {
    lines.push(`  [${pattern.severity}] ${pattern.type} - ${pattern.affectedEntity}`);
  }
  return lines.join('\n');
}

export function formatRecommendationsList(recs: unknown[]): string {
  if (recs.length === 0) return 'No recommendations.';
  const lines = ['=== Recommendations ==='];
  for (const rec of recs as Array<{
    priority: string;
    description: string;
    confidence: number;
  }>) {
    lines.push(`  [${rec.priority}] ${rec.description} (${(rec.confidence * 100).toFixed(0)}% confidence)`);
  }
  return lines.join('\n');
}

export function formatStatus(status: {
  storeSize: number;
  pendingTickets: number;
  lastAnalysisAt: Date | null;
}): string {
  return (
    '=== Status ===\n' +
    `  Events stored:     ${status.storeSize}\n` +
    `  Pending tickets:   ${status.pendingTickets}\n` +
    `  Last analysis:     ${status.lastAnalysisAt ? status.lastAnalysisAt.toISOString() : 'never'}`
  );
}

export function parseTimeRange(range: string): { days: number } {
  const match = range.match(/^(\d+)d$/);
  if (match && match[1]) return { days: parseInt(match[1], 10) };

  const weekMatch = range.match(/^(\d+)w$/);
  if (weekMatch && weekMatch[1]) return { days: parseInt(weekMatch[1], 10) * 7 };

  throw new AnalyticsCommandError(
    `Invalid time range '${range}'. Expected format: '<N>d' or '<N>w' (e.g. '7d', '2w').`,
  );
}
