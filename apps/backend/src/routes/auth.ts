import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { Container } from '../container';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
});

export function authRouter(container: Container): express.Router {
  const router = express.Router();

  router.post('/register', validate(credentialsSchema), (req, res, next): void => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>;
    container.auth
      .register(email, password)
      .then((user) => res.status(201).json({ id: user.id, email: user.email, role: user.role }))
      .catch(next);
  });

  router.post('/login', validate(credentialsSchema), (req, res, next): void => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>;
    container.auth
      .login(email, password)
      .then((result) => res.json(result))
      .catch(next);
  });

  router.post('/logout', requireAuth(container.auth), (req, res, next): void => {
    container.auth
      .revoke(req.auth!)
      .then(() => res.status(204).end())
      .catch(next);
  });

  router.get('/me', requireAuth(container.auth), (req, res) => {
    const { userId, email, role } = req.auth!;
    res.json({ id: userId, email, role });
  });

  return router;
}
