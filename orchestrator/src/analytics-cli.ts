export interface CLICommand {
  command: string;
  subcommand?: string;
  options: Record<string, string>;
}

export function parseAnalyticsCommand(args: string[]): CLICommand {
  const [_base, command, ...rest] = args;

  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg && arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = rest[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = 'true';
      }
    }
  }

  return { command: command ?? '', options };
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

function parseTimeRange(range: string): { days: number } {
  const match = range.match(/^(\d+)d$/);
  if (match && match[1]) return { days: parseInt(match[1], 10) };

  const weekMatch = range.match(/^(\d+)w$/);
  if (weekMatch && weekMatch[1]) return { days: parseInt(weekMatch[1], 10) * 7 };

  return { days: 1 };
}
