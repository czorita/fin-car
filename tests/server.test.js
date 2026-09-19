import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Servidor HTTP y Entrega de Archivos Estáticos', () => {
  let serverInstance;
  const TEST_PORT = 8999;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  function request(urlPath) {
    return new Promise((resolve, reject) => {
      http.get(`${BASE_URL}${urlPath}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      }).on('error', reject);
    });
  }

  before(async () => {
    process.env.PORT = String(TEST_PORT);

    // Asegurar existencia de dist y de archivos mínimos requeridos para tests estáticos
    const fs = await import('node:fs');
    const distDir = path.resolve(__dirname, '../dist');
    const distAssetsDir = path.resolve(distDir, 'assets');
    if (!fs.existsSync(distAssetsDir)) {
      fs.mkdirSync(distAssetsDir, { recursive: true });
    }
    const indexPath = path.resolve(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, '<!doctype html><html><head><title>Fin-Car</title></head><body><h1>Fin-Car</h1></body></html>');
    }
    const ejemplosPath = path.resolve(distDir, 'ejemplos.html');
    if (!fs.existsSync(ejemplosPath)) {
      fs.writeFileSync(ejemplosPath, '<!doctype html><html><head><title>Ejemplos</title></head><body><h1>Ejemplos</h1></body></html>');
    }
    const existingFiles = fs.readdirSync(distAssetsDir);
    if (!existingFiles.some(f => f.endsWith('.js'))) {
      fs.writeFileSync(path.resolve(distAssetsDir, 'main-bundle.js'), 'console.log("fin-car");');
    }
    if (!existingFiles.some(f => f.endsWith('.css'))) {
      fs.writeFileSync(path.resolve(distAssetsDir, 'style-bundle.css'), 'body { margin: 0; }');
    }

    // Importación dinámica para inicializar el servidor en el puerto de prueba
    const mod = await import('../server.js');
    serverInstance = mod.server;
    // Breve pausa para asegurar el binding del socket
    await new Promise(r => setTimeout(r, 400));
  });

  after(async () => {
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
  });

  test('GET / debe responder 200 con Content-Type text/html', async () => {
    const res = await request('/');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, /<!doctype html>/i);
  });

  test('GET /ejemplos debe responder 200 con Content-Type text/html', async () => {
    const res = await request('/ejemplos');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
  });

  test('GET /assets/*.js debe responder con MIME type application/javascript', async () => {
    // Tomar un archivo existente del directorio dist/assets
    const fs = await import('node:fs');
    const distAssetsDir = path.resolve(__dirname, '../dist/assets');
    const files = fs.readdirSync(distAssetsDir);
    const jsFile = files.find(f => f.endsWith('.js'));
    assert.ok(jsFile, 'Debe existir al menos un archivo JS en dist/assets');

    const res = await request(`/assets/${jsFile}`);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/javascript/);
  });

  test('GET /assets/*.css debe responder con MIME type text/css', async () => {
    const fs = await import('node:fs');
    const distAssetsDir = path.resolve(__dirname, '../dist/assets');
    const files = fs.readdirSync(distAssetsDir);
    const cssFile = files.find(f => f.endsWith('.css'));
    assert.ok(cssFile, 'Debe existir al menos un archivo CSS en dist/assets');

    const res = await request(`/assets/${cssFile}`);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/css/);
  });

  test('GET a recurso inexistente con extensión estática debe retornar 404', async () => {
    const res = await request('/assets/archivo-que-no-existe-12345.js');
    assert.equal(res.statusCode, 404);
  });

  test('GET /api/offers responde 200 con JSON', async () => {
    const res = await request('/api/offers');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);
  });

  test('Intento de Path Traversal debe ser bloqueado', async () => {
    const res = await request('/../package.json');
    assert.ok(res.statusCode === 403 || res.statusCode === 404);
  });
});
