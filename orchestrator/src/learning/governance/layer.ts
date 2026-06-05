import type { Recommendation } from '../recommendations/engine.js';
import type { GovernanceTicket } from './tickets.js';
import { createTicket } from './tickets.js';
import { AuditTrail } from './audit.js';

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
}

export function createGovernanceLayer(): GovernanceLayer {
  const tickets = new Map<string, GovernanceTicket>();
  const audit = new AuditTrail();

  return {
    async submitRecommendation(rec) {
      const ticket = createTicket(rec);
      tickets.set(ticket.id, ticket);
      audit.addEntry(ticket.id, 'submitted');
      return ticket;
    },

    async approveRecommendation(ticketId, reviewedBy) {
      const ticket = tickets.get(ticketId);
      if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);

      ticket.status = 'approved';
      ticket.reviewedAt = new Date();
      ticket.reviewedBy = reviewedBy;
      audit.addEntry(ticketId, 'approved', reviewedBy);
    },

    async rejectRecommendation(ticketId, reason, reviewedBy) {
      const ticket = tickets.get(ticketId);
      if (!ticket) throw new Error(`Ticket not found: ${ticketId}`);

      ticket.status = 'rejected';
      ticket.reviewedAt = new Date();
      ticket.reviewedBy = reviewedBy;
      ticket.rejectionReason = reason;
      audit.addEntry(ticketId, 'rejected', reviewedBy, reason);
    },

    async getTicket(ticketId) {
      return tickets.get(ticketId) ?? null;
    },

    async getPendingRecommendations() {
      return [...tickets.values()].filter((t) => t.status === 'pending');
    },
  };
}
