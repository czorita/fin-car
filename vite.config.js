import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { handleApiRequest } from './src/server/apiHandlers.js';

/**
 * Plugin de Vite para procesar directivas <!-- @include partials/file.html -->
 * Permite reutilizar modales, plantillas y meta-tags comunes entre index.html y ejemplos.html.
 */
function htmlPartialsPlugin() {
  return {
    name: 'html-partials-plugin',
    transformIndexHtml(html) {
      return html.replace(/<!--\s*@include:?\s*["']?([^"'>\s]+)["']?\s*-->/g, (_, partialPath) => {
        const fullPath = resolve(__dirname, partialPath);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf-8');
        }
        console.warn(`[html-partials] Parcial no encontrado: ${partialPath}`);
        return '';
      });
    }
  };
}

export default defineConfig({
  server: {
    port: 8080
  },
  preview: {
    port: 8080
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ejemplos: resolve(__dirname, 'ejemplos.html')
      },
      output: {
        manualChunks: {
          chartjs: ['chart.js'],
          confetti: ['canvas-confetti']
        }
      }
    }
  },
  plugins: [
    htmlPartialsPlugin(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        const DATA_DIR = resolve(__dirname, 'data');
        const OFFERS_DIR = resolve(DATA_DIR, 'offers');
        const EXAMPLES_DIR = resolve(DATA_DIR, 'examples');

        server.middlewares.use(async (req, res, next) => {
          const handled = await handleApiRequest(req, res, { offersDir: OFFERS_DIR, examplesDir: EXAMPLES_DIR });
          if (!handled) {
            next();
          }
        });
      }
    }
  ]
});
