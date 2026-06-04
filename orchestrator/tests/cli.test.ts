import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { runCli } from '../src/cli.js';

const RULES_PATH = join(import.meta.dirname, '..', 'fixtures', 'astro-orchestrator.md');

let stdout: string[] = [];
let stderr: string[] = [];
const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  stdout = [];
  stderr = [];
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  }) as typeof process.stderr.write;
});
afterEach(() => {
  process.stdout.write = origStdoutWrite;
  process.stderr.write = origStderrWrite;
});

describe('cli', () => {
  it('prints help on no args', async () => {
    const code = await runCli([]);
    expect(code).toBe(0);
    expect(stdout.join('')).toContain('Usage:');
  });

  it('lists rules on list command', async () => {
    process.env.ASTRO_ORCH_RULES = RULES_PATH;
    const code = await runCli(['list']);
    expect(code).toBe(0);
    expect(stdout.join('')).toMatch(/implementer|architect/);
  });

  it('returns exit code 1 for unknown command', async () => {
    const code = await runCli(['bogus']);
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('Unknown command: bogus');
  });

  it('returns exit code 1 when run missing task', async () => {
    const code = await runCli(['run']);
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('requires a task name');
  });

  it('returns exit code 1 when status missing id', async () => {
    const code = await runCli(['status']);
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('requires a task id');
  });
});
