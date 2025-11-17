import type { Lead } from '../entities/Lead';
import type { LeadRepository, NewLead } from '../ports/leadRepository';
import type { LeadTriageProvider } from '../ports/leadTriage';

export interface LeadSubmission {
  name: string;
  email: string;
  message: string;
  utmSource?: string;
}

export interface LeadOutcome {
  lead: Lead;
  /** True when this email had already been captured and nothing new was written. */
  duplicate: boolean;
}

export class LeadService {
  constructor(
    private readonly repo: LeadRepository,
    private readonly triage: LeadTriageProvider,
  ) {}

  /**
   * Capture is idempotent on email. The lead form is public and unauthenticated,
   * so a double-click, a retry or a bot re-post must not create a second row or
   * spend a second triage call.
   */
  async capture(submission: LeadSubmission): Promise<LeadOutcome> {
    const email = submission.email.trim().toLowerCase();
    const existing = await this.repo.findByEmail(email);
    if (existing) return { lead: existing, duplicate: true };

    const verdict = await this.triage.triage({
      name: submission.name,
      email,
      message: submission.message,
    });

    const row: NewLead = {
      email,
      name: submission.name.trim(),
      message: submission.message.trim(),
      utmSource: submission.utmSource ?? null,
      intent: verdict.intent,
      priority: verdict.priority,
    };

    return { lead: await this.repo.create(row), duplicate: false };
  }

  list(limit: number, offset: number): Promise<{ items: Lead[]; total: number }> {
    return this.repo.list(limit, offset);
  }
}
