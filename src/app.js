import cors from 'cors';
import express from 'express';
import financeRoutes from './routes/financeRoutes.js';
import productivityRoutes from './routes/productivityRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (request, response) => {
  return response.json({ status: 'ok' });
});

app.use(financeRoutes);
app.use(productivityRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
