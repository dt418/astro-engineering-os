export interface ParsedEntity {
  id: string;
  fields: Record<string, string>;
}

export class MarkdownParseError extends Error {
  constructor(message: string, public readonly line: number) {
    super(`${message} (line ${line})`);
  }
}

const COMMENT_RE = /<!--[\s\S]*?-->/g;

export function parseEntities(md: string, entityType: string): ParsedEntity[] {
  const cleaned = md.replace(COMMENT_RE, '');
  const lines = cleaned.split('\n');
  const entities: ParsedEntity[] = [];
  const headerRe = new RegExp(`^##\\s+${entityType}:\\s+(.+)$`);
  const fieldRe = /^([a-z][a-z0-9_-]*):\s*(.*)$/;

  let current: ParsedEntity | null = null;
  let lastField: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const headerMatch = line.match(headerRe);
    if (headerMatch) {
      if (current) entities.push(current);
      current = { id: headerMatch[1]!.trim(), fields: {} };
      lastField = null;
      continue;
    }
    if (!current) continue;

    if (line.startsWith('  ')) {
      if (lastField) {
        current.fields[lastField] = (current.fields[lastField] ?? '') + '\n' + line.trim();
      }
      continue;
    }

    const fieldMatch = line.match(fieldRe);
    if (fieldMatch) {
      const key = fieldMatch[1]!;
      const value = fieldMatch[2] ?? '';
      current.fields[key] = value;
      lastField = key;
    } else if (line.trim() === '') {
      lastField = null;
    }
  }
  if (current) entities.push(current);
  return entities;
}
