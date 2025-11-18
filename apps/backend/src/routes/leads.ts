import express from 'express';
import { z } from 'zod';
import {
  LEAD_RATE_LIMIT_MAX,
  LEAD_RATE_LIMIT_WINDOW_SECONDS,
  MAX_LEAD_MESSAGE_LENGTH,
  MAX_PAGE_SIZE,
} from '../config/constants';
import { requireAuth, requireRole } from '../middleware/auth';
import { rateLimit } from '../middleware/ratelimit';
import { validate } from '../middleware/validate';
import type { Container } from '../container';

/**
 * Mirrors the browser-side schema in apps/frontend/lib/leadSchema.ts. The two
 * used to disagree about whether `message` was optional, so a form the client
 * considered valid came back 400.
 */
const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(MAX_LEAD_MESSAGE_LENGTH),
  utmSource: z.string().trim().max(120).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

export function leadsRouter(container: Container): express.Router {
  const router = express.Router();

  router.post(
    '/',
    // Tighter than the global limit: this endpoint is unauthenticated, writes a
    // row and may call an external triage provider.
    rateLimit(container.limiter, {
      bucket: 'leads',
      max: LEAD_RATE_LIMIT_MAX,
      windowSeconds: LEAD_RATE_LIMIT_WINDOW_SECONDS,
    }),
    validate(leadSchema),
    (req, res, next): void => {
      container.leads
        .capture(req.body as z.infer<typeof leadSchema>)
        .then(({ lead, duplicate }) => {
          res.status(duplicate ? 200 : 201).json({
            id: lead.id,
            intent: lead.intent,
            priority: lead.priority,
          });
        })
        .catch(next);
    },
  );

  // The inbox is admin-only: it is a list of names, addresses and messages.
  router.get(
    '/',
    requireAuth(container.auth),
    requireRole('admin'),
    validate(listQuerySchema, 'query'),
    (req, res, next): void => {
      const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>;
      container.leads
        .list(limit, (page - 1) * limit)
        .then(({ items, total }) => res.json({ items, total, page, limit }))
        .catch(next);
    },
  );

  return router;
}
