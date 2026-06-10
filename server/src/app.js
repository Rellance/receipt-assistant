import express from 'express';
import { receiptsRouter } from './routes/receipts.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api/receipts', receiptsRouter);

  app.use((req, res) => res.status(404).json({ error: 'Reittiä ei löytynyt' }));
  app.use(errorHandler); // Всегда ПОСЛЕДНИМ

  return app;
}
