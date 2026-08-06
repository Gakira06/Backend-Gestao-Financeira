import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import financeRoutes from './routes/financeRoutes.js';
import productivityRoutes from './routes/productivityRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (request, response) => {
  response.json({ status: 'API do Agenda e Financeiro rodando!' });
});

app.use(financeRoutes);
app.use(productivityRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3333;

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
