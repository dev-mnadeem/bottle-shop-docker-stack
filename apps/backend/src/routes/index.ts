import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { metricsRouter } from '../metrics';
import { authRouter } from './auth';
import { healthRouter } from './health';
import { leadsRouter } from './leads';
import { productsRouter } from './products';
import type { Container } from '../container';
import type { Application } from 'express';

export function registerRoutes(app: Application, container: Container): void {
  app.use(healthRouter(container));
  app.use(metricsRouter());

  app.use('/api/auth', authRouter(container));
  app.use('/api/products', productsRouter(container));
  app.use('/api/leads', leadsRouter(container));

  // openapi.yaml sits beside dist/ in the image and beside src/ in dev, so the
  // path is resolved from the compiled file's own location either way.
  const openapiPath = path.join(__dirname, '..', '..', 'openapi.yaml');
  const spec: unknown = YAML.load(openapiPath);
  app.get('/openapi.json', (_req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec as Record<string, unknown>));
}
