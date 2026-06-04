export type EntityStatus = 'active' | 'deprecated' | 'experimental' | 'legacy';

export interface BaseEntity {
  id: string;
  version: string;
  status: EntityStatus;
  purpose: string;
  tags: readonly string[];
}

export interface Skill extends BaseEntity {}
export interface Agent extends BaseEntity {}
export interface Workflow extends BaseEntity {}
export interface Reviewer extends BaseEntity {}

export function parseTags(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}
