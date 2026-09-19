/**
 * Servicio de almacenamiento local y exportación/importación de presupuestos.
 */

import { SAMPLE_OFFERS } from '../core/presets.js';

const STORAGE_KEY = 'car_compare_offers_v1';
const THEME_KEY = 'car_compare_theme_v1';

/**
 * Obtiene todas las ofertas guardadas o inicializa con los ejemplos predeterminados.
 * @returns {Array<import('../core/types.js').Offer>}
 */
export function getStoredOffers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveOffers(SAMPLE_OFFERS);
      return SAMPLE_OFFERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_OFFERS;
  } catch (err) {
    console.error('Error al leer ofertas de localStorage:', err);
    return SAMPLE_OFFERS;
  }
}

/**
 * Guarda las ofertas en localStorage.
 * @param {Array<import('../core/types.js').Offer>} offers 
 */
export function saveOffers(offers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  } catch (err) {
    console.error('Error al guardar en localStorage:', err);
  }
}

/**
 * Añade o actualiza una oferta.
 * @param {import('../core/types.js').Offer} offer 
 */
export function upsertOffer(offer) {
  const current = getStoredOffers();
  const index = current.findIndex(o => o.id === offer.id);
  if (index >= 0) {
    current[index] = offer;
  } else {
    current.push(offer);
  }
  saveOffers(current);
  return current;
}

/**
 * Elimina una oferta por id.
 * @param {string} id 
 */
export function deleteOffer(id) {
  const current = getStoredOffers();
  const filtered = current.filter(o => o.id !== id);
  saveOffers(filtered);
  return filtered;
}

/**
 * Restaura los ejemplos iniciales.
 */
export function resetToSamples() {
  saveOffers(SAMPLE_OFFERS);
  return SAMPLE_OFFERS;
}

/**
 * Exporta las ofertas actuales en un archivo JSON descargable.
 */
export function exportOffersAsJson() {
  const offers = getStoredOffers();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(offers, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("download", `comparativa-ofertas-coches-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Importa ofertas desde un archivo JSON.
 * @param {File} file 
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 */
export function importOffersFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (Array.isArray(json) && json.length > 0) {
          saveOffers(json);
          resolve(json);
        } else {
          reject(new Error('El archivo no contiene un listado válido de ofertas.'));
        }
      } catch (err) {
        reject(new Error('Error al parsear el archivo JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}

/**
 * Guarda y recupera el tema (dark/light)
 */
export function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
