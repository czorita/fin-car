/**
 * Handlers compartidos para la API REST de persistencia de ofertas.
 * Utilizados tanto por server.js (producción/Docker) como por vite.config.js (desarrollo local).
 * Incluye:
 * - Sanitización estricta de rutas (prevención de Path Traversal)
 * - Rate limiter básico en memoria
 * - Límites de tamaño de payload con req.destroy()
 */

import fsp from 'node:fs/promises';
import path from 'node:path';

// Rate limiter en memoria simple por IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 120; // 120 peticiones por minuto por IP

/**
 * Limpia entradas antiguas del rate limiter periódicamente para evitar memory leaks.
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

/**
 * Comprueba si una IP ha excedido el límite de peticiones.
 * @param {string} ip
 * @returns {boolean} true si está permitido, false si excede el límite
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.startTime = now;
    rateLimitMap.set(ip, record);
    return true;
  }

  record.count += 1;
  rateLimitMap.set(ip, record);
  return record.count <= RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Lee todos los documentos JSON de una carpeta dada
 * @param {string} dirPath
 * @returns {Promise<Array<object>>}
 */
export async function readJsonFilesFromDir(dirPath) {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
    const files = await fsp.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const items = await Promise.all(
      jsonFiles.map(async file => {
        try {
          const content = await fsp.readFile(path.join(dirPath, file), 'utf-8');
          return JSON.parse(content);
        } catch (err) {
          console.error(`Error leyendo ${file}:`, err.message);
          return null;
        }
      })
    );

    return items
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (err) {
    console.error(`Error listando directorio ${dirPath}:`, err);
    return [];
  }
}

/**
 * Lee el cuerpo de una petición en formato JSON con límite seguro de tamaño y destrucción del socket.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<object>}
 */
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        if (typeof req.destroy === 'function') {
          req.destroy();
        }
        reject(new Error('Payload demasiado grande'));
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON inválido en el cuerpo de la petición'));
      }
    });

    req.on('error', reject);
  });
}

/**
 * Procesa peticiones a la API REST (/api/offers y /api/examples).
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {object} options
 * @param {string} options.offersDir
 * @param {string} options.examplesDir
 * @returns {Promise<boolean>} true si la petición fue gestionada por la API, false de lo contrario
 */
export async function handleApiRequest(req, res, { offersDir, examplesDir }) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  // Rate Limiter
  const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Demasiadas peticiones (Rate limit excedido)' }));
    return true;
  }

  // GET /api/offers
  if (req.method === 'GET' && pathname === '/api/offers') {
    const offers = await readJsonFilesFromDir(offersDir);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(offers));
    return true;
  }

  // GET /api/examples
  if (req.method === 'GET' && pathname === '/api/examples') {
    const examples = await readJsonFilesFromDir(examplesDir);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(examples));
    return true;
  }

  // POST /api/offers
  if (req.method === 'POST' && pathname === '/api/offers') {
    try {
      const offer = await readJsonBody(req);
      if (!offer || typeof offer !== 'object') {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Estructura de oferta inválida' }));
        return true;
      }

      if (!offer.id) {
        offer.id = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
      if (!offer.createdAt) {
        offer.createdAt = new Date().toISOString();
      }

      // Sanitización contra path traversal
      const safeId = path.basename(String(offer.id)).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(offersDir, `${safeId}.json`);
      await fsp.writeFile(filePath, JSON.stringify(offer, null, 2), 'utf-8');

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, offer }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }

  // DELETE /api/offers/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/offers/')) {
    const rawId = pathname.replace('/api/offers/', '').trim();
    const safeId = path.basename(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (!safeId || safeId.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'ID inválido' }));
      return true;
    }

    try {
      const filePath = path.join(offersDir, `${safeId}.json`);
      await fsp.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, id: safeId }));
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Oferta no encontrada' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return true;
  }

  return false;
}
