/**
 * Shared file-writing utility. Idempotent: writes a file only when its content
 * has changed, preserving mtime for unchanged files. Used by every generator.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

export interface WriteFileOptions {
  /** Path relative to the project root. */
  readonly path: string;
  /** File contents. */
  readonly content: string;
  /** Project root. Defaults to process.cwd(). */
  readonly root?: string;
  /** When true, fail if the file exists with different content. */
  readonly strict?: boolean;
}

export interface WriteFileResult {
  readonly path: string;
  readonly status: 'created' | 'updated' | 'unchanged';
  readonly bytes: number;
}

export async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\n+$/g, '\n');
}

export function isGeneratedMarker(content: string): boolean {
  const head = content.split('\n', 5).join('\n');
  return /@generated|<!--\s*@generated/i.test(head);
}

/**
 * Writes a file idempotently. Returns the status so callers can log
 * accurate summaries.
 */
export async function writeFileIfChanged(options: WriteFileOptions): Promise<WriteFileResult> {
  const root = options.root ?? process.cwd();
  const absolutePath = resolve(root, options.path);
  const next = normalizeContent(options.content);
  const existing = await readFileIfExists(absolutePath);

  if (existing !== null) {
    const current = normalizeContent(existing);
    if (current === next) {
      return { path: relative(root, absolutePath), status: 'unchanged', bytes: next.length };
    }
    if (options.strict) {
      throw new Error(
        `Refusing to overwrite ${relative(root, absolutePath)}: file exists with different content. ` +
          'Pass strict: false to overwrite.',
      );
    }
  }

  await ensureDirectory(absolutePath);
  await writeFile(absolutePath, next, 'utf8');
  return {
    path: relative(root, absolutePath),
    status: existing === null ? 'created' : 'updated',
    bytes: next.length,
  };
}

/**
 * Writes many files in sequence, returning a summary. Failures are
 * collected and reported; one bad file does not abort the whole run.
 */
export async function writeFiles(
  files: ReadonlyArray<WriteFileOptions>,
  options: { readonly root?: string; readonly strict?: boolean } = {},
): Promise<{
  readonly results: ReadonlyArray<WriteFileResult>;
  readonly summary: { readonly created: number; readonly updated: number; readonly unchanged: number };
}> {
  const results: WriteFileResult[] = [];
  for (const file of files) {
    const result = await writeFileIfChanged({
      ...file,
      ...(options.root !== undefined ? { root: options.root } : {}),
      ...(options.strict !== undefined ? { strict: options.strict } : {}),
    });
    results.push(result);
  }
  const summary = {
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    unchanged: results.filter((r) => r.status === 'unchanged').length,
  };
  return { results, summary };
}
