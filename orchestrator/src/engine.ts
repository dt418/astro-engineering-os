import { randomUUID } from 'node:crypto';
import type { RoutingRule } from './types.js';

const RULE_HEADER = /^##\s+rule:\s+/m;
const BULLET = /^-?\s*(\w+):\s*(.*)$/;
const REGEX_ESCAPE = /[.+^${}()|[\]\\]/g;

export function parseRules(markdown: string): RoutingRule[] {
  const rules: RoutingRule[] = [];
  const blocks = markdown.split(RULE_HEADER).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const headerLine = lines[0];
    if (headerLine === undefined) continue;
    const pattern = headerLine.trim();
    const rule: RoutingRule = {
      id: randomUUID(),
      pattern,
      agent: '',
      priority: 0,
    };

    let inConfig = false;
    for (const rawLine of lines.slice(1)) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const entryMatch = trimmed.match(BULLET);
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

      const val = coerceValue(valRaw);

      if (inConfig) {
        if (rule.config) {
          rule.config[key] = val;
        }
      } else if (key === 'agent') {
        rule.agent = String(val);
      } else if (key === 'priority') {
        const n = typeof val === 'number' ? val : Number(val);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error(`Invalid priority for rule ${rule.id}: ${valRaw}`);
        }
        rule.priority = n;
      }
    }
    rules.push(rule);
  }

  return rules;
}

function coerceValue(valRaw: string): string | number | boolean {
  if (valRaw === 'true') return true;
  if (valRaw === 'false') return false;
  if (valRaw !== '' && !isNaN(Number(valRaw))) return Number(valRaw);
  return valRaw;
}

export function matchRule(
  rules: RoutingRule[],
  task: string,
): RoutingRule | null {
  for (const rule of rules) {
    if (!rule.compiledRegex) {
      const escaped = rule.pattern.replace(REGEX_ESCAPE, '\\$&');
      const regexBody = escaped.replace(/\*/g, '.*');
      rule.compiledRegex = new RegExp('^' + regexBody + '$');
    }
    if (rule.compiledRegex.test(task)) return rule;
  }
  return null;
}
