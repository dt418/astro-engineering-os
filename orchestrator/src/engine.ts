import type { RoutingRule } from './types.js';

export function parseRules(markdown: string): RoutingRule[] {
  const rules: RoutingRule[] = [];
  const blocks = markdown.split(/^##\s+rule:\s+/m).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const headerLine = lines[0];
    if (headerLine === undefined) continue;
    const pattern = headerLine.trim();
    const rule: RoutingRule = {
      id: pattern,
      pattern,
      agent: '',
      priority: 0,
    };

    let inConfig = false;
    for (const rawLine of lines.slice(1)) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const entryMatch = trimmed.match(/^-?\s*(\w+):\s*(.*)$/);
      if (!entryMatch) continue;
      const key = entryMatch[1];
      const valRaw = entryMatch[2];
      if (key === undefined) continue;

      if (valRaw === '') {
        if (key === 'config') {
          inConfig = true;
          rule.config = {};
        }
        continue;
      }

      if (valRaw === undefined) continue;
      const val = isNaN(Number(valRaw)) ? valRaw : Number(valRaw);

      if (inConfig) {
        if (rule.config) {
          rule.config[key] = val;
        }
      } else if (key === 'agent') {
        rule.agent = val as string;
      } else if (key === 'priority') {
        rule.priority = val as number;
      }
    }
    rules.push(rule);
  }

  return rules;
}

export function matchRule(
  rules: RoutingRule[],
  task: string,
): RoutingRule | null {
  for (const rule of rules) {
    const escaped = rule.pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexBody = escaped.replace(/\*/g, '.*');
    const regex = new RegExp('^' + regexBody + '$');
    if (regex.test(task)) return rule;
  }
  return null;
}
