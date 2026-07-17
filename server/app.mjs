import express from 'express';

import { adminRoutes } from './routes/admin.routes.mjs';
import { authRoutes } from './routes/auth.routes.mjs';
import { feedRoutes } from './routes/feed.routes.mjs';
import { requestRoutes } from './routes/requests.routes.mjs';

export function createApp() {
  const app = express();
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.use(express.json({ limit: '64kb' }));

  app.use(authRoutes);
  app.use(feedRoutes);
  app.use(requestRoutes);
  app.use(adminRoutes);

  return app;
}
