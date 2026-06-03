/**
 * Shared directory and path utilities. Used by generators that need to
 * ensure a clean tree or resolve paths relative to the project root.
 */
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export interface EnsureDirectoryOptions {
  /** Project root. Defaults to process.cwd(). */
  readonly root?: string;
  /** When true, remove the directory first if it exists. */
  readonly reset?: boolean;
  /** When true, do nothing if the directory already exists. */
  readonly skipIfExists?: boolean;
}

export async function ensureDirectory(
  relativePath: string,
  options: EnsureDirectoryOptions = {},
): Promise<string> {
  const root = options.root ?? process.cwd();
  const absolutePath = isAbsolute(relativePath) ? relativePath : resolve(root, relativePath);
  if (options.reset && existsSync(absolutePath)) {
    await rm(absolutePath, { recursive: true, force: true });
  }
  if (options.skipIfExists && existsSync(absolutePath)) {
    return absolutePath;
  }
  await mkdir(absolutePath, { recursive: true });
  return absolutePath;
}

export function projectPath(...parts: ReadonlyArray<string>): string {
  const root = process.cwd();
  return resolve(root, ...parts);
}

export function displayPath(absolutePath: string, root: string = process.cwd()): string {
  return relative(root, absolutePath) || '.';
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export interface PathMapping {
  readonly from: string;
  readonly to: string;
}

export function applyMappings(path: string, mappings: ReadonlyArray<PathMapping>): string {
  return mappings.reduce(
    (acc, mapping) => acc.replace(new RegExp(`:${mapping.from}`, 'g'), mapping.to),
    path,
  );
}

export function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

export function isGeneratedPath(relativePath: string): boolean {
  return /(^|\/)generated\//.test(relativePath) || /\.generated\./.test(relativePath);
}
