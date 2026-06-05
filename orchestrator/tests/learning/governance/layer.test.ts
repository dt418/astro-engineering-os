import { describe, it, expect, beforeEach } from 'vitest';
import { createGovernanceLayer } from '../../../src/learning/governance/layer.js';
import type { Recommendation } from '../../../src/learning/recommendations/engine.js';

function makeRec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 'r1',
    type: 'intent_mapping_suggestion',
    priority: 'medium',
    target: 'test-intent',
    description: 'Add skill to intent',
    rationale: 'Test',
    confidence: 0.85,
    patterns: [],
    actionableSteps: ['Update registry'],
    ...overrides,
  };
}

describe('GovernanceLayer', () => {
  let governance: ReturnType<typeof createGovernanceLayer>;

  beforeEach(() => {
    governance = createGovernanceLayer();
  });

  it('submits recommendation as ticket', async () => {
    const rec = makeRec();
    const ticket = await governance.submitRecommendation(rec);

    expect(ticket.id).toBeDefined();
    expect(ticket.status).toBe('pending');
    expect(ticket.recommendation).toEqual(rec);
  });

  it('approves recommendation', async () => {
    const rec = makeRec();
    const ticket = await governance.submitRecommendation(rec);
    await governance.approveRecommendation(ticket.id);

    const updated = await governance.getTicket(ticket.id);
    expect(updated!.status).toBe('approved');
    expect(updated!.reviewedAt).toBeDefined();
  });

  it('rejects recommendation with reason', async () => {
    const rec = makeRec();
    const ticket = await governance.submitRecommendation(rec);
    await governance.rejectRecommendation(ticket.id, 'Not applicable to our use case');

    const updated = await governance.getTicket(ticket.id);
    expect(updated!.status).toBe('rejected');
    expect(updated!.rejectionReason).toBe('Not applicable to our use case');
  });

  it('lists pending recommendations', async () => {
    const rec1 = makeRec({ id: 'r1', type: 'skill_addition' });
    const rec2 = makeRec({ id: 'r2', type: 'skill_removal' });

    const t1 = await governance.submitRecommendation(rec1);
    await governance.submitRecommendation(rec2);
    await governance.approveRecommendation(t1.id);

    const pending = await governance.getPendingRecommendations();

    expect(pending).toHaveLength(1);
    expect(pending[0]!.status).toBe('pending');
  });
});
