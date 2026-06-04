import { describe, it, expect, beforeEach } from 'vitest';
import { WorkerPool } from '../../src/runtime/worker-pool.js';

describe('WorkerPool', () => {
  it('executes single task', async () => {
    const pool = new WorkerPool<number, number>({ maxWorkers: 2 });
    const results = await pool.run([1], async x => x * 2);
    expect(results).toEqual([2]);
  });

  it('executes multiple tasks', async () => {
    const pool = new WorkerPool<number, number>({ maxWorkers: 2 });
    const results = await pool.run([1, 2, 3], async x => x * 2);
    expect(results).toEqual(expect.arrayContaining([2, 4, 6]));
  });

  it('respects maxWorkers limit', async () => {
    const pool = new WorkerPool<number, number>({ maxWorkers: 1 });
    expect(pool.availableSlots).toBe(1);
    expect(pool.activeWorkers).toBe(0);
  });

  it('handles async handlers', async () => {
    const pool = new WorkerPool<number, number>({ maxWorkers: 2 });
    const results = await pool.run([1, 2], async x => {
      await new Promise(r => setTimeout(r, 10));
      return x * 2;
    });
    expect(results).toHaveLength(2);
  });

  it('handles errors in handler', async () => {
    const pool = new WorkerPool<number, number>({ maxWorkers: 2 });
    await expect(
      pool.run([1], async () => { throw new Error('fail'); }),
    ).rejects.toThrow('fail');
  });

  it('returns correct count for empty input', async () => {
    const pool = new WorkerPool<number, number>({ maxWorkers: 2 });
    const results = await pool.run([], async x => x);
    expect(results).toHaveLength(0);
  });
});