import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, typeInto } from '../helpers/dom.js';

let createDerivedPair;
let els;
let pair;
let changes;

/** Par de prueba: B = A * 2 y A = B / 2 */
function buildPair() {
  document.body.innerHTML = `
    <input id="a"><button id="unlock-a"></button><span id="help-a"></span>
    <input id="b"><button id="unlock-b"></button><span id="help-b"></span>`;
  const $ = id => document.getElementById(id);
  els = { a: $('a'), b: $('b'), unlockA: $('unlock-a'), unlockB: $('unlock-b'), helpA: $('help-a'), helpB: $('help-b') };
  changes = 0;
  pair = createDerivedPair({
    first: {
      mode: 'a', input: els.a, unlockBtn: els.unlockA, helper: els.helpA, activeHelperText: 'Manda A',
      derive: () => (els.a.value ? { value: String(Number(els.a.value) * 2), helperText: 'B calculado' } : null)
    },
    second: {
      mode: 'b', input: els.b, unlockBtn: els.unlockB, helper: els.helpB, activeHelperText: 'Manda B',
      derive: () => (els.b.value ? { value: String(Number(els.b.value) / 2), helperText: 'A calculado' } : null)
    },
    onChange: () => changes++
  });
}

describe('Par de campos enlazados (offerModal/derivedPair.js)', () => {
  before(async () => {
    setupDom();
    ({ createDerivedPair } = await import('../../src/components/offerModal/derivedPair.js'));
  });

  beforeEach(buildPair);

  test('Escribir en A calcula y bloquea B, y muestra el botón para desbloquear B', () => {
    typeInto(els.a, '10');
    assert.equal(pair.getMode(), 'a');
    assert.equal(els.b.value, '20');
    assert.equal(els.b.disabled, true);
    assert.ok(els.b.classList.contains('input-derived'));
    assert.equal(els.a.disabled, false);
    assert.equal(els.unlockB.style.display, 'inline-block');
    assert.equal(els.unlockA.style.display, 'none');
    assert.equal(els.helpA.textContent, 'Manda A');
    assert.equal(els.helpB.textContent, 'B calculado');
    assert.equal(changes, 1);
  });

  test('Vaciar el campo que manda libera ambos campos sin cambiar de modo', () => {
    typeInto(els.a, '10');
    typeInto(els.a, '');
    assert.equal(pair.getMode(), null);
    assert.equal(els.a.disabled, false);
    assert.equal(els.b.disabled, false);
    assert.equal(els.helpA.textContent, '');
  });

  test('Desbloquear el campo derivado vacía el par y le da el foco', () => {
    typeInto(els.a, '10');
    els.unlockB.click();
    assert.equal(els.a.value, '');
    assert.equal(els.b.value, '');
    assert.equal(els.b.disabled, false);
    assert.equal(pair.getMode(), null);
    assert.equal(document.activeElement, els.b);
  });

  test('sync() sin modo deduce quién manda según qué campo tiene valor', () => {
    els.b.value = '8';
    pair.sync();
    assert.equal(pair.getMode(), 'b');
    assert.equal(els.a.value, '4');
    assert.equal(els.a.disabled, true);
  });

  test('setValues fija los valores y el modo', () => {
    pair.setValues('3', '', 'a');
    assert.equal(els.b.value, '6');
    assert.equal(pair.getMode(), 'a');
  });
});
