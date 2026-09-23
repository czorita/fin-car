/**
 * Store mínimo de estado de la aplicación (patrón observable).
 * Sustituye a las variables globales mutables de main.js / ejemplos.js.
 */

/**
 * @template T
 * @typedef {object} Store
 * @property {() => T} getState
 * @property {(patch: Partial<T> | ((state: T) => Partial<T>), options?: { silent?: boolean }) => void} setState
 * @property {(listener: (state: T) => void) => () => void} subscribe
 */

/**
 * Crea un store con estado inmutable y suscriptores.
 * @template T
 * @param {T} initialState
 * @returns {Store<T>}
 */
export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(patch, { silent = false } = {}) {
      const changes = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...changes };
      if (!silent) {
        listeners.forEach(listener => listener(state));
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
