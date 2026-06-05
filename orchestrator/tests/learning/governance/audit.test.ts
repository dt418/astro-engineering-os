import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuditTrail } from '../../../src/learning/governance/audit.js';

describe('AuditTrail', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'audit-trail-'));
  });

  it('persists entries to JSONL file', async () => {
    const path = join(tempDir, 'audit.jsonl');
    const trail = new AuditTrail({ persistPath: path });

    await trail.addEntry('t1', 'submitted');
    await trail.addEntry('t1', 'approved', 'admin');
    await trail.addEntry('t2', 'submitted');

    const reloaded = new AuditTrail({ persistPath: path });
    await reloaded.loadFromDisk();

    const entries = reloaded.getEntries('t1');
    expect(entries).toHaveLength(2);
    expect(entries[0]!.action).toBe('submitted');
    expect(entries[1]!.action).toBe('approved');
    expect(entries[1]!.performedBy).toBe('admin');
  });

  it('returns empty when no file exists', async () => {
    const path = join(tempDir, 'missing.jsonl');
    const trail = new AuditTrail({ persistPath: path });

    await trail.loadFromDisk();

    expect(trail.getEntries()).toEqual([]);
  });

  it('caps in-memory entries at maxEntries (ring buffer)', async () => {
    const trail = new AuditTrail({ maxEntries: 3 });

    await trail.addEntry('t1', 'submitted'); // 1st
    await trail.addEntry('t1', 'approved'); // 2nd
    await trail.addEntry('t1', 'rejected', 'admin', 'third'); // 3rd (kept)
    await trail.addEntry('t1', 'submitted'); // 4th (kept)
    await trail.addEntry('t1', 'approved', 'admin', 'fifth'); // 5th (kept)

    const all = trail.getEntries();
    expect(all).toHaveLength(3);
    // First two should be evicted; oldest survivor is the 3rd entry
    expect(all[0]!.details).toBe('third');
    expect(all[1]!.details).toBeUndefined();
    expect(all[2]!.details).toBe('fifth');
  });

  it('returns all entries when no ticketId filter', async () => {
    const trail = new AuditTrail();

    await trail.addEntry('t1', 'submitted');
    await trail.addEntry('t2', 'submitted');
    await trail.addEntry('t3', 'submitted');

    expect(trail.getEntries()).toHaveLength(3);
  });

  it('filters entries by ticketId', async () => {
    const trail = new AuditTrail();

    await trail.addEntry('t1', 'submitted');
    await trail.addEntry('t2', 'submitted');
    await trail.addEntry('t1', 'approved');

    expect(trail.getEntries('t1')).toHaveLength(2);
    expect(trail.getEntries('t2')).toHaveLength(1);
  });

  it('cleanup tempDir', async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
});
