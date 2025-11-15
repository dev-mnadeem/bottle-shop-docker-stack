import { randomUUID } from 'node:crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './config/env';

const isDev = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  // Never let a credential reach the log, however it arrives.
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password'],
    censor: '[redacted]',
  },
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  // An inbound x-request-id is preserved so one identifier follows a request
  // across Nginx, both backend replicas and the browser console.
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  autoLogging: {
    ignore: (req) => req.url === '/metrics' || req.url === '/health',
  },
});
