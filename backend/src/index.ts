import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import purchasesRouter from './routes/purchases';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'La Fundita API funcionando 🚀' });
});

app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchases', purchasesRouter);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});