import { randomUUID } from 'node:crypto';

export interface AuditEntry {
  id: string;
  ticketId: string;
  action: 'submitted' | 'approved' | 'rejected';
  timestamp: Date;
  performedBy?: string;
  details?: string;
}

export class AuditTrail {
  private entries: AuditEntry[] = [];

  addEntry(
    ticketId: string,
    action: AuditEntry['action'],
    performedBy?: string,
    details?: string,
  ) {
    this.entries.push({
      id: randomUUID(),
      ticketId,
      action,
      timestamp: new Date(),
      performedBy,
      details,
    });
  }

  getEntries(ticketId?: string): AuditEntry[] {
    if (ticketId) {
      return this.entries.filter((e) => e.ticketId === ticketId);
    }
    return [...this.entries];
  }
}
