import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCli } from '../src/cli.js';

let log: string[] = [];
const origLog = console.log;

beforeEach(() => {
  log = [];
  console.log = (...args: unknown[]) => log.push(args.join(' '));
});
afterEach(() => {
  console.log = origLog;
});

describe('cli', () => {
  it('prints help on no args', async () => {
    await runCli([]);
    const out = log.join('\n');
    expect(out).toContain('Usage:');
  });

  it('lists rules on list command', async () => {
    await runCli(['list']);
    const out = log.join('\n');
    expect(out).toMatch(/rule|implementer|architect/);
  });

  it('errors on unknown command', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    await expect(runCli(['bogus'])).rejects.toThrow('exit');
    exit.mockRestore();
  });
});
