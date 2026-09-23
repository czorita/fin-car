import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../src/ui/store.js';

describe('Store de estado (store.js)', () => {
  test('setState fusiona el parche y notifica a los suscriptores', () => {
    const store = createStore({ offers: [], selectedVehicle: null });
    const seen = [];
    store.subscribe(state => seen.push(state.selectedVehicle));

    store.setState({ selectedVehicle: 'RAV4' });
    assert.deepEqual(store.getState(), { offers: [], selectedVehicle: 'RAV4' });
    assert.deepEqual(seen, ['RAV4']);
  });

  test('setState acepta una función del estado anterior', () => {
    const store = createStore({ count: 1 });
    store.setState(state => ({ count: state.count + 1 }));
    assert.equal(store.getState().count, 2);
  });

  test('silent actualiza el estado sin notificar', () => {
    const store = createStore({ value: 0 });
    let calls = 0;
    store.subscribe(() => calls++);
    store.setState({ value: 5 }, { silent: true });
    assert.equal(store.getState().value, 5);
    assert.equal(calls, 0);
  });

  test('El estado es inmutable entre versiones y subscribe devuelve la baja', () => {
    const initial = { items: [1] };
    const store = createStore(initial);
    const before = store.getState();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);

    store.setState({ items: [1, 2] });
    unsubscribe();
    store.setState({ items: [] });

    assert.notEqual(store.getState(), before);
    assert.deepEqual(before.items, [1], 'El estado anterior no se muta');
    assert.equal(initial.items.length, 1);
    assert.equal(calls, 1);
  });
});
