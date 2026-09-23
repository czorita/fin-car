import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoredOffers,
  saveOffers,
  fetchUserOffers,
  upsertOffer,
  deleteOffer,
  copyExampleToUser
} from '../../src/services/storage.js';
import { STORAGE_KEY_OFFERS } from '../../src/core/constants.js';

const PENDING_DELETES_KEY = 'fin_car_pending_deletes_v1';

/**
 * Crea un localStorage en memoria compatible con la API usada por el servicio.
 * @returns {Storage & {data: Map<string, string>}}
 */
function createMemoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    clear: () => data.clear()
  };
}

/**
 * Crea un fetch simulado que registra las llamadas y responde con el handler dado.
 * El handler recibe (url, init) y devuelve {status, body} o lanza para simular red caída.
 * @param {(url: string, init: object) => {status: number, body?: any}} handler
 */
function createMockFetch(handler) {
  const calls = [];
  const mock = async (url, init = {}) => {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    const { status, body: resBody } = handler(url, { ...init, method });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => resBody
    };
  };
  mock.calls = calls;
  return mock;
}

const networkDown = () => {
  throw new TypeError('Failed to fetch');
};

let originalFetch;
let originalStorageDescriptor;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalStorageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalStorageDescriptor);
  } else {
    delete globalThis.localStorage;
  }
});

/**
 * Silencia console.* durante una función asíncrona (los fallos simulados generan logs).
 * @param {() => Promise<any>} fn
 */
async function quietly(fn) {
  const saved = { warn: console.warn, error: console.error };
  console.warn = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.warn = saved.warn;
    console.error = saved.error;
  }
}

function getPendingDeletes() {
  const raw = globalThis.localStorage.getItem(PENDING_DELETES_KEY);
  return raw ? JSON.parse(raw) : [];
}

const baseOffer = (id, extra = {}) => ({
  id,
  title: `Oferta ${id}`,
  vehicle: 'Coche',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra
});

describe('Servicio de almacenamiento (storage.js)', () => {
  describe('Caché local', () => {
    test('getStoredOffers devuelve [] sin datos o con JSON corrupto', async () => {
      assert.deepEqual(getStoredOffers(), []);
      globalThis.localStorage.setItem(STORAGE_KEY_OFFERS, '{no-json');
      const result = await quietly(async () => getStoredOffers());
      assert.deepEqual(result, []);
    });

    test('saveOffers y getStoredOffers hacen ida y vuelta', () => {
      saveOffers([baseOffer('a')]);
      assert.deepEqual(getStoredOffers(), [baseOffer('a')]);
    });
  });

  describe('upsertOffer', () => {
    test('servidor OK: guarda con updatedAt, sin pendingSync, y el payload no incluye pendingSync', async () => {
      globalThis.fetch = createMockFetch(() => ({ status: 200, body: { success: true } }));

      const result = await upsertOffer(baseOffer('a', { pendingSync: true }));

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a');
      assert.ok(!('pendingSync' in result[0]), 'No debe quedar marcada como pendiente');
      assert.ok(!Number.isNaN(Date.parse(result[0].updatedAt)), 'Debe tener updatedAt ISO');

      const [call] = globalThis.fetch.calls;
      assert.equal(call.method, 'POST');
      assert.equal(call.url, '/api/offers');
      assert.ok(!('pendingSync' in call.body), 'El payload no debe contener pendingSync');
      assert.equal(call.body.updatedAt, result[0].updatedAt);
    });

    test('servidor 500: lanza un error con status y la oferta queda pendingSync en local', async () => {
      globalThis.fetch = createMockFetch(() => ({ status: 500, body: { error: 'boom' } }));

      await quietly(() =>
        assert.rejects(upsertOffer(baseOffer('a')), err => err.status === 500 && /500/.test(err.message))
      );

      const stored = getStoredOffers();
      assert.equal(stored.length, 1);
      assert.equal(stored[0].pendingSync, true);
      assert.ok(stored[0].updatedAt);
      assert.ok(!('pendingSync' in globalThis.fetch.calls[0].body));
    });

    test('red caída: lanza y la oferta queda pendingSync en local', async () => {
      globalThis.fetch = createMockFetch(networkDown);

      await quietly(() => assert.rejects(upsertOffer(baseOffer('a')), TypeError));

      const stored = getStoredOffers();
      assert.equal(stored.length, 1);
      assert.equal(stored[0].pendingSync, true);
    });

    test('actualiza una oferta existente sin duplicarla', async () => {
      saveOffers([baseOffer('a'), baseOffer('b')]);
      globalThis.fetch = createMockFetch(() => ({ status: 200 }));

      const result = await upsertOffer(baseOffer('a', { title: 'Editada' }));

      assert.equal(result.length, 2);
      assert.equal(result.find(o => o.id === 'a').title, 'Editada');
    });

    test('copyExampleToUser propaga el error de sincronización y deja la copia pendiente', async () => {
      globalThis.fetch = createMockFetch(() => ({ status: 503 }));

      await quietly(() => assert.rejects(copyExampleToUser(baseOffer('ex', { isExample: true }))));

      const [copy] = getStoredOffers();
      assert.notEqual(copy.id, 'ex');
      assert.equal(copy.isExample, false);
      assert.equal(copy.pendingSync, true);
    });
  });

  describe('deleteOffer', () => {
    test('servidor 404 se considera éxito y no deja borrado pendiente', async () => {
      saveOffers([baseOffer('a'), baseOffer('b')]);
      globalThis.fetch = createMockFetch(() => ({ status: 404 }));

      const result = await deleteOffer('a');

      assert.deepEqual(result.map(o => o.id), ['b']);
      assert.deepEqual(getPendingDeletes(), []);
      assert.equal(globalThis.fetch.calls[0].method, 'DELETE');
      assert.equal(globalThis.fetch.calls[0].url, '/api/offers/a');
    });

    test('servidor 500: lanza, se borra en local y queda como borrado pendiente', async () => {
      saveOffers([baseOffer('a'), baseOffer('b')]);
      globalThis.fetch = createMockFetch(() => ({ status: 500 }));

      await quietly(() => assert.rejects(deleteOffer('a'), err => err.status === 500));

      assert.deepEqual(getStoredOffers().map(o => o.id), ['b']);
      assert.deepEqual(getPendingDeletes(), ['a']);
    });

    test('red caída: lanza y queda como borrado pendiente', async () => {
      saveOffers([baseOffer('a')]);
      globalThis.fetch = createMockFetch(networkDown);

      await quietly(() => assert.rejects(deleteOffer('a')));

      assert.deepEqual(getStoredOffers(), []);
      assert.deepEqual(getPendingDeletes(), ['a']);
    });
  });

  describe('fetchUserOffers', () => {
    test('si la API falla (red caída) devuelve la caché local', async () => {
      saveOffers([baseOffer('a', { pendingSync: true })]);
      globalThis.fetch = createMockFetch(networkDown);

      const result = await quietly(() => fetchUserOffers());

      assert.deepEqual(result, [baseOffer('a', { pendingSync: true })]);
    });

    test('si la API responde 500 devuelve la caché local sin modificarla', async () => {
      saveOffers([baseOffer('a')]);
      globalThis.fetch = createMockFetch(() => ({ status: 500 }));

      const result = await quietly(() => fetchUserOffers());

      assert.deepEqual(result, [baseOffer('a')]);
      assert.equal(globalThis.fetch.calls.length, 1, 'No debe reintentar nada si no pudo leer');
    });

    test('reintenta los pendientes (POST sin pendingSync y DELETE) y los desmarca al tener éxito', async () => {
      saveOffers([baseOffer('local', { updatedAt: '2026-02-01T00:00:00.000Z', pendingSync: true })]);
      globalThis.localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(['gone']));
      globalThis.fetch = createMockFetch((url, init) => {
        if (init.method === 'GET') {
          return { status: 200, body: [baseOffer('gone'), baseOffer('remote')] };
        }
        return { status: 200 };
      });

      const result = await fetchUserOffers();

      const methods = globalThis.fetch.calls.map(c => `${c.method} ${c.url}`);
      assert.deepEqual(methods, ['GET /api/offers', 'POST /api/offers', 'DELETE /api/offers/gone']);
      assert.ok(!('pendingSync' in globalThis.fetch.calls[1].body), 'El reintento no envía pendingSync');

      assert.deepEqual(result.map(o => o.id).sort(), ['local', 'remote']);
      assert.ok(result.every(o => !o.pendingSync), 'Todo queda sincronizado');
      assert.deepEqual(getPendingDeletes(), []);
      assert.deepEqual(getStoredOffers(), result, 'La caché queda con el resultado fusionado');
    });

    test('conserva pendientes locales y borrados pendientes si el reintento vuelve a fallar', async () => {
      saveOffers([baseOffer('local', { pendingSync: true })]);
      globalThis.localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(['gone']));
      globalThis.fetch = createMockFetch((url, init) => {
        if (init.method === 'GET') {
          return { status: 200, body: [baseOffer('gone'), baseOffer('remote')] };
        }
        return { status: 500 };
      });

      const result = await quietly(() => fetchUserOffers());

      assert.deepEqual(result.map(o => o.id).sort(), ['local', 'remote']);
      assert.equal(result.find(o => o.id === 'local').pendingSync, true);
      assert.ok(!result.some(o => o.id === 'gone'), 'El borrado pendiente no reaparece');
      assert.deepEqual(getPendingDeletes(), ['gone']);
    });

    test('fusiona por id quedándose con el updatedAt más reciente (createdAt como respaldo)', async () => {
      saveOffers([
        baseOffer('a', { title: 'Local vieja', updatedAt: '2026-01-05T00:00:00.000Z' }),
        baseOffer('b', { title: 'Local nueva', updatedAt: '2026-03-01T00:00:00.000Z', pendingSync: true }),
        baseOffer('c', { title: 'Local sin updatedAt', createdAt: '2026-01-01T00:00:00.000Z' })
      ]);
      globalThis.fetch = createMockFetch((url, init) => {
        if (init.method === 'GET') {
          return {
            status: 200,
            body: [
              baseOffer('a', { title: 'Servidor nueva', updatedAt: '2026-02-01T00:00:00.000Z' }),
              baseOffer('b', { title: 'Servidor vieja', updatedAt: '2026-02-01T00:00:00.000Z' }),
              baseOffer('c', { title: 'Servidor editada', updatedAt: '2026-01-02T00:00:00.000Z' })
            ]
          };
        }
        return { status: 500 };
      });

      const result = await quietly(() => fetchUserOffers());
      const byId = Object.fromEntries(result.map(o => [o.id, o]));

      assert.equal(byId.a.title, 'Servidor nueva');
      assert.equal(byId.b.title, 'Local nueva');
      assert.equal(byId.b.pendingSync, true, 'Sigue pendiente porque el reintento falló');
      assert.equal(byId.c.title, 'Servidor editada');
    });

    test('descarta ofertas locales ya sincronizadas que el servidor no tiene', async () => {
      saveOffers([baseOffer('borrada-en-otro-dispositivo'), baseOffer('remote')]);
      globalThis.fetch = createMockFetch(() => ({ status: 200, body: [baseOffer('remote')] }));

      const result = await fetchUserOffers();

      assert.deepEqual(result.map(o => o.id), ['remote']);
    });

    test('no guarda pendingSync procedente del servidor', async () => {
      globalThis.fetch = createMockFetch(() => ({
        status: 200,
        body: [baseOffer('remote', { pendingSync: true })]
      }));

      const result = await fetchUserOffers();

      assert.ok(!('pendingSync' in result[0]));
    });
  });
});
