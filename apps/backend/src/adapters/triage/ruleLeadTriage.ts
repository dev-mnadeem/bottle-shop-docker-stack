import type {
  LeadIntent,
  LeadPriority,
  LeadTriageProvider,
  TriageInput,
  TriageResult,
} from '../../ports/leadTriage';

/** Phrases that put a lead in a bucket, most specific bucket first. */
const INTENT_RULES: { intent: LeadIntent; patterns: RegExp[] }[] = [
  {
    intent: 'bulk_order',
    patterns: [
      /\bbulk\b/i,
      /\bpallet(s)?\b/i,
      /\b\d{3,}\s*(units|bottles|pieces|pcs)\b/i,
      /\blarge order\b/i,
    ],
  },
  {
    intent: 'wholesale',
    patterns: [
      /\bwholesale\b/i,
      /\breseller?\b/i,
      /\bdistributor\b/i,
      /\btrade price\b/i,
      /\bstockist\b/i,
    ],
  },
  {
    intent: 'partnership',
    patterns: [/\bpartnership\b/i, /\bcollaborat(e|ion)\b/i, /\bco-?brand/i, /\baffiliate\b/i],
  },
  {
    intent: 'support',
    patterns: [
      /\bbroken\b/i,
      /\bleak(s|ing|ed)?\b/i,
      /\brefund\b/i,
      /\breturn\b/i,
      /\bdefect/i,
      /\bwarranty\b/i,
      /\bdamaged\b/i,
    ],
  },
];

/** Free mail domains: a lead from one of these is less likely to be a business. */
const CONSUMER_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'proton.me',
]);

const HIGH_PRIORITY_INTENTS = new Set<LeadIntent>(['bulk_order', 'wholesale']);
const URGENCY = /\b(urgent(ly)?|asap|immediately|right away|deadline)\b/i;

/** Below this length a message carries almost no signal, so it is deprioritised. */
const LOW_SIGNAL_MESSAGE_LENGTH = 25;

/**
 * The default triage adapter. It is deterministic, runs offline, needs no key and
 * is fully covered by tests — which is what lets the LLM adapter be optional
 * rather than load-bearing.
 */
export class RuleLeadTriage implements LeadTriageProvider {
  readonly name = 'rules';

  triage(input: TriageInput): Promise<TriageResult> {
    return Promise.resolve(this.triageSync(input));
  }

  triageSync(input: TriageInput): TriageResult {
    const haystack = `${input.name} ${input.message}`;
    const intent = this.classifyIntent(haystack);
    return {
      intent,
      priority: this.scorePriority(intent, input),
      source: this.name,
    };
  }

  private classifyIntent(haystack: string): LeadIntent {
    for (const rule of INTENT_RULES) {
      if (rule.patterns.some((p) => p.test(haystack))) return rule.intent;
    }
    return 'general';
  }

  private scorePriority(intent: LeadIntent, input: TriageInput): LeadPriority {
    const domain = input.email.split('@')[1]?.toLowerCase() ?? '';
    const businessDomain = domain.length > 0 && !CONSUMER_DOMAINS.has(domain);

    if (HIGH_PRIORITY_INTENTS.has(intent) && businessDomain) return 'high';
    if (intent === 'support' && URGENCY.test(input.message)) return 'high';
    if (intent === 'general' && input.message.trim().length < LOW_SIGNAL_MESSAGE_LENGTH) {
      return 'low';
    }
    return 'normal';
  }
}
