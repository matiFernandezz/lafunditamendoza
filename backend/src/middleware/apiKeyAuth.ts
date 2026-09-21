import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

const apiKey = process.env.API_KEY;

if (!apiKey) {
  throw new Error('Falta la variable de entorno API_KEY (ver .env.example)');
}

function safeEqual(a: string, b: string): boolean {
  // Se comparan hashes de largo fijo en vez de los strings originales para que
  // timingSafeEqual no requiera igual longitud y no se filtre el largo real.
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const provided = req.header('x-api-key');

  if (!provided || !safeEqual(provided, apiKey!)) {
    return res.status(401).json({ error: 'No autorizado: falta o es invalido el header x-api-key' });
  }

  next();
}
