/**
 * Entorno DOM simulado (happy-dom) para los tests de interfaz.
 * Cada fichero de test se ejecuta en su propio proceso con `node --test`,
 * así que registrar globales aquí no afecta a otros ficheros.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Globales del navegador que usa el código de src/ */
const BROWSER_GLOBALS = [
  'document', 'DOMParser', 'HTMLElement', 'HTMLInputElement', 'Node', 'Event', 'localStorage', 'getComputedStyle'
];

/**
 * Crea una ventana de happy-dom y registra sus globales.
 * @param {string} [bodyHtml=''] HTML inicial del body
 * @returns {import('happy-dom').Window}
 */
export function setupDom(bodyHtml = '') {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = /** @type {any} */ (window);
  for (const name of BROWSER_GLOBALS) {
    globalThis[name] = window[name];
  }
  window.document.body.innerHTML = bodyHtml;
  return window;
}

/**
 * Lee un parcial HTML del proyecto (partials/*.html).
 * @param {string} name Nombre del fichero sin extensión
 * @returns {string}
 */
export function readPartial(name) {
  return fs.readFileSync(path.join(ROOT, 'partials', `${name}.html`), 'utf-8');
}

/**
 * Simula que el usuario escribe en un campo (valor + evento input).
 * @param {HTMLInputElement} input
 * @param {string} value
 */
export function typeInto(input, value) {
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}
