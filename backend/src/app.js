import express from 'express';
import cors from 'cors';
import { crudRouter } from './routes/crud.js';
import { scheduleRouter } from './routes/schedule.js';
import { AppError } from './utils/errors.js';

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', crudRouter);
app.use('/api/schedule', scheduleRouter);

app.use((err, _, res, __) => {
  if (err instanceof AppError) return res.status(err.status).json({ code: err.code, message: err.message });
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
});
