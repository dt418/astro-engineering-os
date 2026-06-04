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
      let trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('- ')) trimmed = trimmed.slice(2);
      if (trimmed === 'config:') {
        inConfig = true;
        rule.config = {};
        continue;
      }
      const m = trimmed.match(/^(\w+):\s*(.+)$/);
      if (!m) continue;
      const key = m[1];
      const valRaw = m[2];
      if (key === undefined || valRaw === undefined) continue;
      const val = isNaN(Number(valRaw)) ? valRaw : Number(valRaw);
      if (inConfig && rule.config) {
        rule.config[key] = val;
      } else if (!inConfig) {
        (rule as unknown as Record<string, unknown>)[key] = val;
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
