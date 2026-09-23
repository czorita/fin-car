/**
 * Servicio de almacenamiento local y sincronización con archivos JSON (Volumen Docker).
 * Responsabilidad única: persistencia y sincronización de ofertas.
 *
 * Estrategia de sincronización:
 * - Cada oferta guardada recibe `updatedAt` (ISO) para resolver conflictos.
 * - Si el servidor falla (error de red o status no OK), la oferta queda en la caché
 *   local con `pendingSync: true` y se reintenta en el siguiente `fetchUserOffers`.
 * - Los borrados que no llegan al servidor se anotan en una lista de borrados pendientes
 *   para reintentarlos y evitar que la oferta "resucite" al leer del servidor.
 * - `localStorage` y `fetch` se resuelven vía `globalThis` en tiempo de llamada
 *   (no al importar), lo que permite testear el módulo en Node sin DOM.
 */

import { SAMPLE_OFFERS } from '../core/presets.js';
import { STORAGE_KEY_OFFERS, generateId, ID_PREFIX_OFFER } from '../core/constants.js';
export { getSavedTheme, saveTheme } from '../ui/theme.js';

/**
 * Clave de localStorage con los ids de ofertas borradas localmente cuyo borrado
 * aún no se ha confirmado en el servidor.
 * Definida aquí (y no en constants.js) por ser un detalle interno del servicio.
 */
const STORAGE_KEY_PENDING_DELETES = 'fin_car_pending_deletes_v1';

const API_OFFERS = '/api/offers';

/**
 * Devuelve el localStorage disponible en el entorno o null.
 * @returns {Storage|null}
 */
function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Ejecuta una petición HTTP con el fetch global disponible en tiempo de llamada.
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
function apiFetch(url, init) {
  if (typeof globalThis.fetch !== 'function') {
    return Promise.reject(new Error('fetch no disponible en este entorno'));
  }
  return globalThis.fetch(url, init);
}

/**
 * Crea un error de sincronización con el servidor (status HTTP no satisfactorio).
 * @param {string} action - Descripción de la operación
 * @param {number} status - Status HTTP devuelto
 * @returns {Error & {status: number}}
 */
function createSyncError(action, status) {
  return Object.assign(new Error(`${action} devolvió status ${status}`), { status });
}

/**
 * Devuelve una copia de la oferta sin los campos de control local
 * (no deben enviarse ni guardarse en el servidor).
 * @param {import('../core/types.js').Offer} offer
 * @returns {import('../core/types.js').Offer}
 */
function toServerPayload(offer) {
  const payload = { ...offer };
  delete payload.pendingSync;
  return payload;
}

/**
 * Marca de tiempo (ms) de la última modificación de una oferta.
 * Usa `updatedAt` y, como respaldo, `createdAt`. Devuelve 0 si no hay ninguna válida.
 * @param {{ updatedAt?: string, createdAt?: string }} offer
 * @returns {number}
 */
function getOfferTimestamp(offer) {
  const time = Date.parse(offer?.updatedAt || offer?.createdAt || '');
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Lee la lista de ids con borrado pendiente de sincronizar.
 * @returns {Array<string>}
 */
function getPendingDeletes() {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY_PENDING_DELETES);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch (err) {
    console.error('Error al leer borrados pendientes de localStorage:', err);
    return [];
  }
}

/**
 * Guarda la lista de ids con borrado pendiente (elimina la clave si queda vacía).
 * @param {Array<string>} ids
 */
function savePendingDeletes(ids) {
  try {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      storage.removeItem(STORAGE_KEY_PENDING_DELETES);
    } else {
      storage.setItem(STORAGE_KEY_PENDING_DELETES, JSON.stringify(unique));
    }
  } catch (err) {
    console.error('Error al guardar borrados pendientes en localStorage:', err);
  }
}

/**
 * Añade o quita un id de la lista de borrados pendientes.
 * @param {string} id
 * @param {boolean} pending
 */
function setPendingDelete(id, pending) {
  const current = getPendingDeletes().filter(x => x !== id);
  if (pending) {
    current.push(id);
  }
  savePendingDeletes(current);
}

/**
 * Quita la marca `pendingSync` de una oferta en caché, solo si la versión en caché
 * sigue siendo la que se sincronizó (evita desmarcar una edición posterior).
 * @param {import('../core/types.js').Offer} syncedOffer
 */
function markOfferSynced(syncedOffer) {
  const current = getStoredOffers();
  const index = current.findIndex(o => o.id === syncedOffer.id);
  if (index >= 0 && current[index].updatedAt === syncedOffer.updatedAt) {
    current[index] = toServerPayload(current[index]);
    saveOffers(current);
  }
}

/**
 * Envía una oferta al servidor. Lanza si hay error de red o status no OK.
 * @param {import('../core/types.js').Offer} offer
 * @returns {Promise<void>}
 */
async function postOffer(offer) {
  const res = await apiFetch(API_OFFERS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toServerPayload(offer))
  });
  if (!res.ok) {
    throw createSyncError('Sincronización con servidor', res.status);
  }
}

/**
 * Borra una oferta en el servidor. Un 404 se considera éxito (ya no existe).
 * Lanza si hay error de red o cualquier otro status no OK.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteRemoteOffer(id) {
  const res = await apiFetch(`${API_OFFERS}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 404) {
    throw createSyncError('Borrado en servidor', res.status);
  }
}

/**
 * Reintenta las operaciones pendientes (guardados y borrados) contra el servidor.
 * Los fallos se registran y la operación sigue pendiente para el próximo intento.
 * @returns {Promise<void>}
 */
async function retryPendingOperations() {
  const pendingOffers = getStoredOffers().filter(o => o.pendingSync);
  for (const offer of pendingOffers) {
    try {
      await postOffer(offer);
      markOfferSynced(offer);
    } catch (err) {
      console.warn(`Reintento de sincronización fallido para ${offer.id}:`, err.message);
    }
  }

  for (const id of getPendingDeletes()) {
    try {
      await deleteRemoteOffer(id);
      setPendingDelete(id, false);
    } catch (err) {
      console.warn(`Reintento de borrado fallido para ${id}:`, err.message);
    }
  }
}

/**
 * Fusiona las ofertas del servidor con la caché local por `id`.
 * - Si existe en ambos lados gana la versión con `updatedAt` (o `createdAt`) más reciente;
 *   en empate gana la local si está pendiente de sincronizar y, si no, la del servidor.
 * - Las ofertas locales pendientes que el servidor no tiene se conservan (también las que
 *   se acaban de sincronizar en el reintento, ya que la lista del servidor es anterior).
 * - Las ofertas locales ya sincronizadas que el servidor no tiene se descartan
 *   (se borraron en el servidor).
 * - Los ids con borrado pendiente se excluyen.
 * @param {Array<import('../core/types.js').Offer>} serverOffers
 * @param {Array<import('../core/types.js').Offer>} localOffers
 * @param {Set<string>} deletedIds - Ids con borrado pendiente al leer del servidor
 * @param {Set<string>} pendingIds - Ids pendientes de sincronizar al leer del servidor
 * @returns {Array<import('../core/types.js').Offer>}
 */
function mergeOffers(serverOffers, localOffers, deletedIds, pendingIds) {
  const localById = new Map(localOffers.map(o => [o.id, o]));
  const merged = new Map();

  for (const remote of serverOffers) {
    if (!remote || !remote.id || deletedIds.has(remote.id)) {
      continue;
    }
    const local = localById.get(remote.id);
    if (!local) {
      merged.set(remote.id, toServerPayload(remote));
      continue;
    }
    const localTime = getOfferTimestamp(local);
    const remoteTime = getOfferTimestamp(remote);
    const localWins = localTime > remoteTime || (localTime === remoteTime && Boolean(local.pendingSync));
    merged.set(remote.id, localWins ? local : toServerPayload(remote));
  }

  for (const local of localOffers) {
    const isPending = local.pendingSync || pendingIds.has(local.id);
    if (isPending && !merged.has(local.id) && !deletedIds.has(local.id)) {
      merged.set(local.id, local);
    }
  }

  // Orden cronológico descendente, igual que el que devuelve el servidor
  return [...merged.values()].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

/**
 * Obtiene las ofertas guardadas por el usuario desde localStorage de forma síncrona.
 * Si no hay ninguna oferta guardada, devuelve un array vacío [].
 * @returns {Array<import('../core/types.js').Offer>}
 */
export function getStoredOffers() {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY_OFFERS);
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
    getStorage()?.setItem(STORAGE_KEY_OFFERS, JSON.stringify(offers));
  } catch (err) {
    console.error('Error al guardar en localStorage:', err);
  }
}

/**
 * Consulta la API del servidor (volumen Docker /app/data/offers) para obtener
 * los presupuestos estructurados guardados por el usuario.
 * Tras leer del servidor reintenta las operaciones pendientes y fusiona servidor
 * y caché local sin perder cambios no sincronizados.
 * Si la API no está disponible devuelve la caché local.
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 */
export async function fetchUserOffers() {
  let serverOffers = null;
  try {
    const res = await apiFetch(API_OFFERS);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverOffers = data;
      }
    } else {
      console.warn(`Lectura de ofertas del servidor devolvió status ${res.status}`);
    }
  } catch (err) {
    console.warn('API no disponible, usando almacenamiento local:', err.message);
  }

  if (!serverOffers) {
    return getStoredOffers();
  }

  // Pendientes en el momento de leer: aunque el reintento tenga éxito, la lista del
  // servidor ya leída no refleja esos guardados ni esos borrados.
  const deletedIds = new Set(getPendingDeletes());
  const pendingIds = new Set(getStoredOffers().filter(o => o.pendingSync).map(o => o.id));
  await retryPendingOperations();

  const merged = mergeOffers(serverOffers, getStoredOffers(), deletedIds, pendingIds);
  saveOffers(merged);
  return merged;
}

/**
 * Consulta la API del servidor para obtener las ofertas de ejemplo de /app/data/examples.
 * @returns {Promise<Array<Partial<import('../core/types.js').Offer>>>} Ofertas en formato de entrada (pueden faltar campos opcionales)
 */
export async function fetchExampleOffers() {
  try {
    const res = await apiFetch('/api/examples');
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
 * La oferta recibe `updatedAt` y queda con `pendingSync: true` en local hasta que
 * el servidor confirma el guardado.
 * @param {import('../core/types.js').Offer} offer
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 * @throws {Error} Si falla la red o el servidor responde con status no OK
 *   (la oferta queda guardada localmente y pendiente de sincronizar).
 */
export async function upsertOffer(offer) {
  const stamped = {
    ...toServerPayload(offer),
    updatedAt: new Date().toISOString()
  };

  const current = getStoredOffers();
  const index = current.findIndex(o => o.id === stamped.id);
  const pendingLocal = { ...stamped, pendingSync: true };
  if (index >= 0) {
    current[index] = pendingLocal;
  } else {
    current.unshift(pendingLocal);
  }
  saveOffers(current);
  // Volver a guardar una oferta anula un posible borrado pendiente del mismo id
  setPendingDelete(stamped.id, false);

  // Persistir en archivo JSON en el servidor/volumen
  try {
    await postOffer(stamped);
  } catch (err) {
    console.error('Error sincronizando oferta con volumen JSON:', err);
    throw err;
  }

  markOfferSynced(stamped);
  return getStoredOffers();
}

/**
 * Elimina una oferta por id de la caché local y del volumen JSON de Docker.
 * Si el servidor no confirma el borrado (un 404 cuenta como confirmado), el id
 * queda en la lista de borrados pendientes.
 * @param {string} id
 * @returns {Promise<Array<import('../core/types.js').Offer>>}
 * @throws {Error} Si falla la red o el servidor responde con status no OK (salvo 404).
 */
export async function deleteOffer(id) {
  const current = getStoredOffers();
  const filtered = current.filter(o => o.id !== id);
  saveOffers(filtered);
  setPendingDelete(id, true);

  // Eliminar archivo JSON del volumen
  try {
    await deleteRemoteOffer(id);
  } catch (err) {
    console.error('Error eliminando oferta del volumen JSON:', err);
    throw err;
  }

  setPendingDelete(id, false);
  return getStoredOffers();
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
