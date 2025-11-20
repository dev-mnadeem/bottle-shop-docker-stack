'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ApiError, apiFetch } from '../lib/api';
import { leadSchema, type LeadValues } from '../lib/leadSchema';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';

/** Labels for the triage verdict the API returns with the receipt. */
const INTENT_COPY: Record<string, string> = {
  bulk_order: 'Routed to the bulk orders desk',
  wholesale: 'Routed to the wholesale team',
  support: 'Routed to product support',
  partnership: 'Routed to partnerships',
  general: 'Routed to the general inbox',
};

interface Receipt {
  id: string;
  intent: string;
  priority: string;
}

export function EnquiryForm() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadValues>({ resolver: zodResolver(leadSchema) });

  const onSubmit = async (values: LeadValues) => {
    try {
      const result = await apiFetch<Receipt>('/leads', {
        method: 'POST',
        body: JSON.stringify(values),
        // A form post must not be replayed on a transport hiccup.
        retries: 0,
      });
      setReceipt(result);
      toast.success('Thanks — we will be in touch.');
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error('Too many enquiries from this address. Try again in a minute.');
        return;
      }
      if (err instanceof ApiError && err.status === 400) {
        toast.error('Please check the form and try again.');
        return;
      }
      toast.error('We could not reach the server. Please try again.');
    }
  };

  const field = (name: keyof LeadValues) => ({
    ...register(name),
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  return (
    <section id="enquiry" className="border-t border-line bg-white scroll-mt-20">
      <div className="container grid gap-10 py-16 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Bulk, wholesale or something broken?
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-muted">
            One inbox for all of it. Enquiries are classified on arrival so a pallet quote and a
            leaking lid do not sit in the same queue.
          </p>
          {receipt && (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-brand/25 bg-brand-tint p-5"
            >
              <p className="font-medium text-brand-strong">
                {INTENT_COPY[receipt.intent] ?? INTENT_COPY.general}
              </p>
              <p className="mt-1 text-sm text-muted">
                Priority: {receipt.priority}. Reference {receipt.id.slice(0, 8)}.
              </p>
            </div>
          )}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Your name
            </label>
            <Input id="name" placeholder="Jane Doe" autoComplete="name" {...field('name')} />
            {errors.name && (
              <p id="name-error" className="mt-1.5 text-sm text-red-700">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="jane@company.com"
              autoComplete="email"
              {...field('email')}
            />
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-sm text-red-700">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
              What do you need?
            </label>
            <Textarea
              id="message"
              rows={5}
              placeholder="We are after 500 of the 1L steel bottles for a conference in March."
              {...field('message')}
            />
            {errors.message && (
              <p id="message-error" className="mt-1.5 text-sm text-red-700">
                {errors.message.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send enquiry'}
          </Button>
        </form>
      </div>
    </section>
  );
}
