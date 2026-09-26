import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import purchasesRouter from './routes/purchases';
import suppliersRouter from './routes/suppliers';
import categoriesRouter from './routes/categories';
import iphoneModelsRouter from './routes/iphoneModels';
import productVariantsRouter from './routes/productVariants';
import { apiKeyAuth } from './middleware/apiKeyAuth';

const app = express();
// Sin FRONTEND_URL (ej. en desarrollo) permite cualquier origen; en producción
// se setea a la URL de Vercel en Railway, sin tocar código.
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'La Fundita API funcionando 🚀' });
});

app.use('/api', apiKeyAuth);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/iphone-models', iphoneModelsRouter);
app.use('/api/product-variants', productVariantsRouter);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});