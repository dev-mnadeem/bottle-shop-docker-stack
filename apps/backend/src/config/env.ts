import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Secrets get a development default so that `pnpm dev` works on a fresh clone,
 * but the same default is rejected in production — a deploy that forgot to set
 * JWT_SECRET should fail at boot, not quietly sign tokens with a public string.
 */
const DEV_JWT_SECRET = 'dev_only_secret_do_not_use_in_production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default('postgres://eco_user:eco_pass@localhost:5432/eco_db'),
  JWT_SECRET: z.string().min(1).default(DEV_JWT_SECRET),
  /** Unset means "no Redis" — the app falls back to in-process stores. */
  REDIS_URL: z.string().optional(),
  /** Comma-separated origin allowlist. Required in production. */
  FRONTEND_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  /** `rules` (default, offline) or `llm`. See adapters/triage. */
  LEAD_TRIAGE_PROVIDER: z.enum(['rules', 'llm']).default('rules'),
  LEAD_TRIAGE_API_KEY: z.string().optional(),
  LEAD_TRIAGE_API_URL: z.string().default('https://api.openai.com/v1/chat/completions'),
  LEAD_TRIAGE_MODEL: z.string().default('gpt-4o-mini'),
  COMMIT_SHA: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
  throw new Error(`Invalid environment configuration:\n  ${issues}`);
}

export const env = parsed.data;

if (isProduction) {
  if (env.JWT_SECRET === DEV_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a real secret when NODE_ENV=production');
  }
  if (!env.FRONTEND_ORIGIN) {
    throw new Error('FRONTEND_ORIGIN must be set when NODE_ENV=production so CORS is not open');
  }
}

export const corsOrigins: string[] = (env.FRONTEND_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export type Env = typeof env;
