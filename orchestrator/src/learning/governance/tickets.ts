import { randomUUID } from 'node:crypto';
import type { Recommendation } from '../recommendations/engine.js';

export type TicketStatus = 'pending' | 'approved' | 'rejected';

export interface GovernanceTicket {
  id: string;
  recommendation: Recommendation;
  status: TicketStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export function createTicket(rec: Recommendation): GovernanceTicket {
  return {
    id: randomUUID(),
    recommendation: rec,
    status: 'pending',
    submittedAt: new Date(),
  };
}
