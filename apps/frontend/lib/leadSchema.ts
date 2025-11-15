import { z } from 'zod';

/**
 * The single definition of a valid lead on the browser side. It mirrors the Zod
 * schema in apps/backend/src/routes/leads.ts — when the two drifted, the form
 * accepted an empty message and the API answered 400.
 */
export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Please give us a name we can use'),
  email: z.string().trim().email('That does not look like an email address'),
  message: z
    .string()
    .trim()
    .min(1, 'Tell us what you need')
    .max(2000, 'Please keep it under 2000 characters'),
});

export type LeadValues = z.infer<typeof leadSchema>;
