import { describe, expect, it } from 'vitest';
import { LlmLeadTriage } from '../adapters/triage/llmLeadTriage';
import { RuleLeadTriage } from '../adapters/triage/ruleLeadTriage';

const rules = new RuleLeadTriage();

describe('RuleLeadTriage', () => {
  it('classifies an explicit bulk quantity as a bulk order', () => {
    const result = rules.triageSync({
      name: 'Procurement',
      email: 'buyer@northwind.co',
      message: 'Can you quote 800 units of the 500ml steel bottle?',
    });
    expect(result.intent).toBe('bulk_order');
    expect(result.priority).toBe('high');
  });

  it('classifies a reseller enquiry as wholesale', () => {
    expect(
      rules.triageSync({
        name: 'Shop',
        email: 'buyer@bottleshop.co.uk',
        message: 'Do you offer wholesale pricing to a stockist?',
      }).intent,
    ).toBe('wholesale');
  });

  it('classifies a defect report as support', () => {
    expect(
      rules.triageSync({
        name: 'Sam',
        email: 'sam@gmail.com',
        message: 'My bottle is leaking from the lid after two weeks.',
      }).intent,
    ).toBe('support');
  });

  it('raises an urgent support report to high priority', () => {
    expect(
      rules.triageSync({
        name: 'Sam',
        email: 'sam@gmail.com',
        message: 'The lid is broken and I need a replacement urgently.',
      }).priority,
    ).toBe('high');
  });

  it('classifies a collaboration request as partnership', () => {
    expect(
      rules.triageSync({
        name: 'Ada',
        email: 'ada@brand.com',
        message: 'We would like to collaborate on a co-branded bottle.',
      }).intent,
    ).toBe('partnership');
  });

  it('drops a short contentless message to low priority', () => {
    const result = rules.triageSync({ name: 'A', email: 'a@gmail.com', message: 'hello' });
    expect(result.intent).toBe('general');
    expect(result.priority).toBe('low');
  });

  it('does not treat a free mail address as a business bulk buyer', () => {
    expect(
      rules.triageSync({
        name: 'Sam',
        email: 'sam@gmail.com',
        message: 'I want a bulk order of 200 bottles for a wedding.',
      }).priority,
    ).toBe('normal');
  });

  it('is deterministic for the same input', () => {
    const input = { name: 'Ada', email: 'ada@acme.com', message: 'Do you sell wholesale?' };
    expect(rules.triageSync(input)).toEqual(rules.triageSync(input));
  });
});

describe('LlmLeadTriage', () => {
  const input = { name: 'Ada', email: 'ada@acme.com', message: 'Quote for 900 units please.' };
  const options = { apiKey: 'test-key', apiUrl: 'https://example.invalid/v1', model: 'test' };

  const withFetch = async (impl: typeof fetch, run: () => Promise<void>) => {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    try {
      await run();
    } finally {
      globalThis.fetch = original;
    }
  };

  const reply = (content: string): Response =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  it('uses a valid model verdict', async () => {
    await withFetch(
      () => Promise.resolve(reply(JSON.stringify({ intent: 'wholesale', priority: 'low' }))),
      async () => {
        const result = await new LlmLeadTriage(rules, options).triage(input);
        expect(result).toEqual({ intent: 'wholesale', priority: 'low', source: 'llm' });
      },
    );
  });

  it('falls back to the rules when the model returns a label outside the schema', async () => {
    await withFetch(
      () =>
        Promise.resolve(reply(JSON.stringify({ intent: 'buy_everything', priority: 'urgent' }))),
      async () => {
        const result = await new LlmLeadTriage(rules, options).triage(input);
        expect(result.source).toBe('rules-fallback');
        expect(result.intent).toBe('bulk_order');
      },
    );
  });

  it('falls back to the rules when the request fails', async () => {
    await withFetch(
      () => Promise.reject(new Error('network down')),
      async () => {
        const result = await new LlmLeadTriage(rules, options).triage(input);
        expect(result.source).toBe('rules-fallback');
      },
    );
  });

  it('falls back to the rules on a non-JSON body', async () => {
    await withFetch(
      () => Promise.resolve(reply('not json at all')),
      async () => {
        expect((await new LlmLeadTriage(rules, options).triage(input)).source).toBe(
          'rules-fallback',
        );
      },
    );
  });
});
