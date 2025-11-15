import express from 'express';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SEARCH_TERM_LENGTH } from '../config/constants';
import { cacheEvents } from '../metrics';
import { requireAuth, requireRole } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import { sendCacheable } from '../middleware/httpCache';
import { validate } from '../middleware/validate';
import type { Container } from '../container';

/**
 * Every query parameter is coerced and bounded here. `Number(req.query.page)` on
 * an unvalidated value yields NaN for "?page=abc", which TypeORM passes through to
 * OFFSET NaN and the request ends as a 500.
 */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  q: z.string().trim().min(1).max(MAX_SEARCH_TERM_LENGTH).optional(),
  minPriceCents: z.coerce.number().int().min(0).optional(),
  maxPriceCents: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
});

const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const productBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(200),
  priceCents: z.number().int().min(0),
  imageUrl: z.string().trim().min(1).max(2_000),
  shortDescription: z.string().trim().min(1).max(400),
});

export function productsRouter(container: Container): express.Router {
  const router = express.Router();

  router.get('/', validate(listQuerySchema, 'query'), (req, res, next): void => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    container.products
      .list(query)
      .then((page) => {
        cacheEvents.inc({ result: page.cacheHit ? 'hit' : 'miss' });
        const { cacheHit, queryMs, ...body } = page;
        sendCacheable(res, body, { cacheHit, queryMs: cacheHit ? undefined : queryMs });
      })
      .catch(next);
  });

  router.get('/:slug', validate(slugParamSchema, 'params'), (req, res, next): void => {
    const { slug } = req.params as unknown as z.infer<typeof slugParamSchema>;
    container.products
      .getBySlug(slug)
      .then((served) => {
        if (!served) throw new NotFoundError(`No product with slug "${slug}"`);
        cacheEvents.inc({ result: served.cacheHit ? 'hit' : 'miss' });
        sendCacheable(res, served.product, {
          cacheHit: served.cacheHit,
          queryMs: served.cacheHit ? undefined : served.queryMs,
        });
      })
      .catch(next);
  });

  // Catalogue writes are admin-only. Holding any valid token is not enough.
  router.post(
    '/',
    requireAuth(container.auth),
    requireRole('admin'),
    validate(productBodySchema),
    (req, res, next): void => {
      container.products
        .create(req.body as z.infer<typeof productBodySchema>)
        .then((product) => res.status(201).json(product))
        .catch(next);
    },
  );

  router.put(
    '/:id',
    requireAuth(container.auth),
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    validate(productBodySchema.partial()),
    (req, res, next): void => {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      container.products
        .update(id, req.body as Partial<z.infer<typeof productBodySchema>>)
        .then((product) => {
          if (!product) throw new NotFoundError('No product with that id');
          res.json(product);
        })
        .catch(next);
    },
  );

  router.delete(
    '/:id',
    requireAuth(container.auth),
    requireRole('admin'),
    validate(idParamSchema, 'params'),
    (req, res, next): void => {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      container.products
        .remove(id)
        .then((removed) => {
          if (!removed) throw new NotFoundError('No product with that id');
          res.status(204).end();
        })
        .catch(next);
    },
  );

  return router;
}
