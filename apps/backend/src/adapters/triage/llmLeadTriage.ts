import { LEAD_INTENTS, LEAD_PRIORITIES } from '../../ports/leadTriage';
import type { RuleLeadTriage } from './ruleLeadTriage';
import type { LeadTriageProvider, TriageInput, TriageResult } from '../../ports/leadTriage';

const REQUEST_TIMEOUT_MS = 4_000;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Optional adapter for an OpenAI-compatible chat endpoint. It is only selected
 * when LEAD_TRIAGE_API_KEY is set, and any failure — timeout, bad key, a reply
 * that is not one of the allowed labels — falls through to the rule engine. A
 * lead is never lost because a model was unreachable.
 */
export class LlmLeadTriage implements LeadTriageProvider {
  readonly name = 'llm';

  constructor(
    private readonly fallback: RuleLeadTriage,
    private readonly options: { apiKey: string; apiUrl: string; model: string },
  ) {}

  async triage(input: TriageInput): Promise<TriageResult> {
    try {
      const parsed = await this.ask(input);
      if (parsed) return parsed;
    } catch {
      // fall through
    }
    return { ...this.fallback.triageSync(input), source: 'rules-fallback' };
  }

  private async ask(input: TriageInput): Promise<TriageResult | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(this.options.apiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Classify an inbound sales lead for a reusable drinkware brand. Reply with JSON ' +
                `{"intent": one of ${LEAD_INTENTS.join('|')}, "priority": one of ${LEAD_PRIORITIES.join('|')}}. No prose.`,
            },
            {
              role: 'user',
              content: `From: ${input.name} <${input.email}>\nMessage: ${input.message}`,
            },
          ],
        }),
      });
      if (!res.ok) return null;

      const body = (await res.json()) as ChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed: unknown = JSON.parse(content);
      return this.validate(parsed);
    } finally {
      clearTimeout(timer);
    }
  }

  /** The model is untrusted input: only the exact labels the schema allows pass. */
  private validate(parsed: unknown): TriageResult | null {
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { intent, priority } = parsed as Record<string, unknown>;
    if (!LEAD_INTENTS.includes(intent as never)) return null;
    if (!LEAD_PRIORITIES.includes(priority as never)) return null;
    return {
      intent: intent as TriageResult['intent'],
      priority: priority as TriageResult['priority'],
      source: this.name,
    };
  }
}
