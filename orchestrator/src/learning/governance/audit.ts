import { randomUUID } from 'node:crypto';
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const AUDIT_RING_BUFFER_MAX = 100_000;

export interface AuditEntry {
  id: string;
  ticketId: string;
  action: 'submitted' | 'approved' | 'rejected';
  timestamp: Date;
  performedBy?: string;
  details?: string;
}

export interface AuditTrailOptions {
  /** When set, append-only JSONL file path. Survives restarts. */
  persistPath?: string;
  /** Soft cap on in-memory entries (ring buffer). Default 100k. */
  maxEntries?: number;
}

export class AuditTrail {
  private entries: AuditEntry[] = [];
  private readonly maxEntries: number;
  private readonly persistPath?: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: AuditTrailOptions = {}) {
    this.maxEntries = options.maxEntries ?? AUDIT_RING_BUFFER_MAX;
    this.persistPath = options.persistPath;
  }

  async addEntry(
    ticketId: string,
    action: AuditEntry['action'],
    performedBy?: string,
    details?: string,
  ): Promise<void> {
    const entry: AuditEntry = {
      id: randomUUID(),
      ticketId,
      action,
      timestamp: new Date(),
      performedBy,
      details,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    if (this.persistPath) {
      this.writeQueue = this.writeQueue
        .then(() => this.persistEntry(entry))
        .catch((err) => {
          console.error('AuditTrail: failed to persist entry', err);
        });
      await this.writeQueue;
    }
  }

  private async persistEntry(entry: AuditEntry): Promise<void> {
    if (!this.persistPath) return;
    await mkdir(dirname(this.persistPath), { recursive: true });
    await appendFile(this.persistPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  getEntries(ticketId?: string): AuditEntry[] {
    if (ticketId) {
      return this.entries.filter((e) => e.ticketId === ticketId);
    }
    return [...this.entries];
  }

  async loadFromDisk(): Promise<void> {
    if (!this.persistPath) return;
    try {
      const data = await readFile(this.persistPath, 'utf8');
      const lines = data.split('\n').filter((l) => l.length > 0);
      const parsed: AuditEntry[] = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          if (entry.timestamp) entry.timestamp = new Date(entry.timestamp);
          parsed.push(entry);
        } catch {
          // skip malformed line
        }
      }
      this.entries = parsed.slice(-this.maxEntries);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
  }
}
