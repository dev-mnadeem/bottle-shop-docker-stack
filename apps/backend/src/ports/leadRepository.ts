import type { Lead } from '../entities/Lead';

export type NewLead = Pick<Lead, 'email' | 'name' | 'message'> &
  Partial<Pick<Lead, 'utmSource' | 'intent' | 'priority'>>;

export interface LeadRepository {
  findByEmail(email: string): Promise<Lead | null>;
  create(input: NewLead): Promise<Lead>;
  /** Most recent leads first. Used by the admin listing. */
  list(limit: number, offset: number): Promise<{ items: Lead[]; total: number }>;
}
