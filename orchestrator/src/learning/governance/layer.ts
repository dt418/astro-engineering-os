import type { Recommendation } from '../recommendations/engine.js';
import type { GovernanceTicket, TicketStatus } from './tickets.js';
import { createTicket } from './tickets.js';
import { AuditTrail, type AuditEntry, type AuditTrailOptions } from './audit.js';

export interface GovernanceLayer {
  submitRecommendation(rec: Recommendation): Promise<GovernanceTicket>;
  approveRecommendation(ticketId: string, reviewedBy?: string): Promise<void>;
  rejectRecommendation(
    ticketId: string,
    reason: string,
    reviewedBy?: string,
  ): Promise<void>;
  getTicket(ticketId: string): Promise<GovernanceTicket | null>;
  getPendingRecommendations(): Promise<GovernanceTicket[]>;
  listTicketsByStatus(status: TicketStatus): Promise<GovernanceTicket[]>;
  getAuditEntries(ticketId?: string): Promise<AuditEntry[]>;
  getAuditTrail(): AuditTrail;
}

export interface GovernanceLayerOptions {
  audit?: AuditTrailOptions;
}

export function createGovernanceLayer(options: GovernanceLayerOptions = {}): GovernanceLayer {
  const tickets = new Map<string, GovernanceTicket>();
  const byStatus: Map<TicketStatus, Set<string>> = new Map([
    ['pending', new Set()],
    ['approved', new Set()],
    ['rejected', new Set()],
  ]);
  const audit = new AuditTrail(options.audit ?? {});

  const setStatus = (ticketId: string, prev: TicketStatus, next: TicketStatus) => {
    byStatus.get(prev)?.delete(ticketId);
    byStatus.get(next)?.add(ticketId);
  };

  return {
    async submitRecommendation(rec) {
      const ticket = createTicket(rec);
      tickets.set(ticket.id, ticket);
      byStatus.get(ticket.status)?.add(ticket.id);
      await audit.addEntry(ticket.id, 'submitted');
      return ticket;
    },

    async approveRecommendation(ticketId, reviewedBy) {
      const ticket = tickets.get(ticketId);
      if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);

      setStatus(ticketId, ticket.status, 'approved');
      ticket.status = 'approved';
      ticket.reviewedAt = new Date();
      ticket.reviewedBy = reviewedBy;
      await audit.addEntry(ticketId, 'approved', reviewedBy);
    },

    async rejectRecommendation(ticketId, reason, reviewedBy) {
      const ticket = tickets.get(ticketId);
      if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);

      setStatus(ticketId, ticket.status, 'rejected');
      ticket.status = 'rejected';
      ticket.reviewedAt = new Date();
      ticket.reviewedBy = reviewedBy;
      ticket.rejectionReason = reason;
      await audit.addEntry(ticketId, 'rejected', reviewedBy, reason);
    },

    async getTicket(ticketId) {
      return tickets.get(ticketId) ?? null;
    },

    async getPendingRecommendations() {
      return [...(byStatus.get('pending') ?? [])]
        .map((id) => tickets.get(id))
        .filter((t): t is GovernanceTicket => Boolean(t));
    },

    async listTicketsByStatus(status) {
      return [...(byStatus.get(status) ?? [])]
        .map((id) => tickets.get(id))
        .filter((t): t is GovernanceTicket => Boolean(t));
    },

    async getAuditEntries(ticketId) {
      return audit.getEntries(ticketId);
    },

    getAuditTrail() {
      return audit;
    },
  };
}
