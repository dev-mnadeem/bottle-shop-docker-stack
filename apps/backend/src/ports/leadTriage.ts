/** What a triage provider decides about an inbound lead. */
export type LeadIntent = 'bulk_order' | 'wholesale' | 'support' | 'partnership' | 'general';
export type LeadPriority = 'high' | 'normal' | 'low';

export interface TriageResult {
  intent: LeadIntent;
  priority: LeadPriority;
  /** Which provider produced this, so the stored row is self-describing. */
  source: string;
}

export interface TriageInput {
  name: string;
  email: string;
  message: string;
}

/**
 * A port with two adapters: a deterministic rule engine that always works with no
 * network and no key, and an LLM adapter that is only selected when one is
 * configured. Routes depend on this type, never on a vendor SDK.
 */
export interface LeadTriageProvider {
  readonly name: string;
  triage(input: TriageInput): Promise<TriageResult>;
}

export const LEAD_INTENTS: readonly LeadIntent[] = [
  'bulk_order',
  'wholesale',
  'support',
  'partnership',
  'general',
];

export const LEAD_PRIORITIES: readonly LeadPriority[] = ['high', 'normal', 'low'];
