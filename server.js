/**
 * Servidor HTTP nativo Node.js optimizado para producción y Docker.
 * Gestiona:
 * - Servicio de archivos estáticos compilados con compresión Gzip, ETag (304) y caché inmutable.
 * - Cabeceras de seguridad HTTP (nosniff, SAMEORIGIN, strict-origin-when-cross-origin).
 * - API REST para lectura y guardado de ofertas en formato JSON en el volumen montado (/app/data).
 * - Cierre limpio y ordenado (Graceful Shutdown) ante señales SIGINT y SIGTERM.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { handleApiRequest, safeDecodePath } from './src/server/apiHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, 'dist');
const OFFERS_DIR = path.join(DATA_DIR, 'offers');
const EXAMPLES_DIR = path.join(DATA_DIR, 'examples');

// Asegurar la existencia de los directorios de persistencia
async function ensureDirs() {
  try {
    await fsp.mkdir(OFFERS_DIR, { recursive: true });
    await fsp.mkdir(EXAMPLES_DIR, { recursive: true });
  } catch (err) {
    console.error('Error al inicializar directorios de datos:', err);
  }
}
await ensureDirs();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

const COMPRESSIBLE_TYPES = new Set([
  'text/html; charset=utf-8',
  'application/javascript; charset=utf-8',
  'text/css; charset=utf-8',
  'application/json; charset=utf-8',
  'image/svg+xml',
  'text/plain; charset=utf-8'
]);

/**
 * Envía una respuesta HTTP aplicando compresión Gzip si el cliente lo soporta.
 */
function sendStreamResponse(req, res, statusCode, headers, filePath) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const contentType = headers['Content-Type'] || '';
  const canGzip = acceptEncoding.includes('gzip') && COMPRESSIBLE_TYPES.has(contentType);

  if (canGzip) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    delete headers['Content-Length'];

    res.writeHead(statusCode, headers);
    const rawStream = fs.createReadStream(filePath);
    const gzipStream = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });
    rawStream.pipe(gzipStream).pipe(res);
  } else {
    res.writeHead(statusCode, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('Error no controlado atendiendo la petición:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('500 Internal Server Error');
  }
});

/**
 * Atiende una petición HTTP: API REST y archivos estáticos de dist.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = safeDecodePath(parsedUrl.pathname);

  // Cabeceras de seguridad y CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ==========================================
  // API REST: Delegada a apiHandlers.js
  // ==========================================
  const handled = await handleApiRequest(req, res, { offersDir: OFFERS_DIR, examplesDir: EXAMPLES_DIR });
  if (handled) {
    return;
  }

  if (pathname === null) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // ==========================================
  // Servicio de Archivos Estáticos (dist)
  // ==========================================
  if (req.method === 'GET' || req.method === 'HEAD') {
    // Normalizar y eliminar barras iniciales para que sea una ruta relativa a DIST_DIR
    const cleanPath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const relativePath = cleanPath.replace(/^[/\\]+/, '');

    let targetRelative = relativePath === '' ? 'index.html' : relativePath;

    if (pathname === '/ejemplos' || pathname === '/ejemplos/') {
      targetRelative = 'ejemplos.html';
    }

    let filePath = path.resolve(DIST_DIR, targetRelative);

    // Evitar cualquier escape del directorio dist (Path Traversal)
    if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    try {
      let stat = await fsp.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stat = await fsp.stat(filePath);
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

      // Validación condicional ETag (304 Not Modified)
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, {
          'ETag': etag,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
        });
        res.end();
        return;
      }

      const headers = {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'ETag': etag,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
      };

      if (req.method === 'HEAD') {
        res.writeHead(200, headers);
        res.end();
        return;
      }

      sendStreamResponse(req, res, 200, headers, filePath);
      return;
    } catch {
      // Si el archivo solicitado tiene una extensión estática que no es .html y falló, devolver 404 directamente
      const ext = path.extname(filePath).toLowerCase();
      if (ext && ext !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      // Fallback SPA a index.html para rutas de navegación cliente
      const fallbackPath = path.resolve(DIST_DIR, 'index.html');
      try {
        const stat = await fsp.stat(fallbackPath);
        const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, { 'ETag': etag, 'Cache-Control': 'no-cache' });
          res.end();
          return;
        }

        const headers = {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': stat.size,
          'ETag': etag,
          'Cache-Control': 'no-cache'
        };

        if (req.method === 'HEAD') {
          res.writeHead(200, headers);
          res.end();
          return;
        }

        sendStreamResponse(req, res, 200, headers, fallbackPath);
        return;
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
    }
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
}

// Cierre ordenado (Graceful Shutdown)
function handleShutdown(signal) {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor HTTP...`);
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️ Forzando cierre del proceso tras tiempo límite.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fin-Car corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📁 Directorio de datos: ${DATA_DIR}`);
});

export { server };

