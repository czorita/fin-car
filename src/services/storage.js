/**
 * Servicio de almacenamiento local y sincronización con archivos JSON (Volumen Docker).
 * Responsabilidad única: persistencia y sincronización de ofertas.
 */

import { SAMPLE_OFFERS } from '../core/presets.js';
import { STORAGE_KEY_OFFERS, generateId, ID_PREFIX_OFFER } from '../core/constants.js';
export { getSavedTheme, saveTheme } from '../ui/theme.js';

/**
 * Obtiene las ofertas guardadas por el usuario desde localStorage de forma síncrona.
 * Si no hay ninguna oferta guardada, devuelve un array vacío [].
 * @returns {Array<import('../core/types.js').Offer>}
 */
export function getStoredOffers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFERS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error al leer ofertas de localStorage:', err);
    return [];
  }
}

/**
 * Guarda las ofertas en localStorage (caché local rápida).
 * @param {Array<import('../core/types.js').Offer>} offers 
 */
export function saveOffers(offers) {
  try {
    localStorage.setItem(STORAGE_KEY_OFFERS, JSON.stringify(offers));
  } catch (err) {
    console.error('Error al guardar en localStorage:', err);
  }
}

/**
 * Consulta la API del servidor (volumen Docker /app/data/offers) para obtener
 * los presupuestos estructurados guardados por el usuario.
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 */
export async function fetchUserOffers() {
  try {
    const res = await fetch('/api/offers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveOffers(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API no disponible, usando almacenamiento local:', err.message);
  }
  return getStoredOffers();
}

/**
 * Consulta la API del servidor para obtener las ofertas de ejemplo de /app/data/examples.
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 */
export async function fetchExampleOffers() {
  try {
    const res = await fetch('/api/examples');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('API de ejemplos no disponible, usando predeterminados:', err.message);
  }
  return SAMPLE_OFFERS;
}

/**
 * Añade o actualiza una oferta en la caché local y en el volumen JSON de Docker.
 * @param {import('../core/types.js').Offer} offer 
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 */
export async function upsertOffer(offer) {
  const current = getStoredOffers();
  const index = current.findIndex(o => o.id === offer.id);
  if (index >= 0) {
    current[index] = offer;
  } else {
    current.unshift(offer);
  }
  saveOffers(current);

  // Persistir en archivo JSON en el servidor/volumen
  try {
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer)
    });
    if (!res.ok) {
      console.warn(`Sincronización con servidor devolvió status ${res.status}`);
    }
  } catch (err) {
    console.error('Error sincronizando oferta con volumen JSON:', err);
    throw err;
  }

  return current;
}

/**
 * Elimina una oferta por id de la caché local y del volumen JSON de Docker.
 * @param {string} id 
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 */
export async function deleteOffer(id) {
  const current = getStoredOffers();
  const filtered = current.filter(o => o.id !== id);
  saveOffers(filtered);

  // Eliminar archivo JSON del volumen
  try {
    const res = await fetch(`/api/offers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok && res.status !== 404) {
      console.warn(`Borrado en servidor devolvió status ${res.status}`);
    }
  } catch (err) {
    console.error('Error eliminando oferta del volumen JSON:', err);
    throw err;
  }

  return filtered;
}

/**
 * Copia una oferta de ejemplo a los presupuestos personales del usuario.
 * @param {import('../core/types.js').Offer} exampleOffer
 * @returns {Promise<import('../core/types.js').Offer>}
 */
export async function copyExampleToUser(exampleOffer) {
  const copy = {
    ...exampleOffer,
    id: generateId(ID_PREFIX_OFFER),
    title: `${exampleOffer.title} (Mi Presupuesto)`,
    isExample: false,
    createdAt: new Date().toISOString()
  };
  await upsertOffer(copy);
  return copy;
}
