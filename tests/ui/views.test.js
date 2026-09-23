import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, readPartial } from '../helpers/dom.js';

let renderSameVehicleView;
let renderCrossVehicleView;
let initTrapGuideModal;
let normalizeOffer;
let SAMPLE_OFFERS;
const $ = id => document.getElementById(id);

describe('Vistas de las pestañas y guía de trampas (ui/views, TrapGuideModal)', () => {
  before(async () => {
    setupDom();
    ({ renderSameVehicleView } = await import('../../src/ui/views/sameVehicleView.js'));
    ({ renderCrossVehicleView } = await import('../../src/ui/views/crossVehicleView.js'));
    ({ initTrapGuideModal } = await import('../../src/components/TrapGuideModal.js'));
    ({ normalizeOffer } = await import('../../src/core/normalizer.js'));
    ({ SAMPLE_OFFERS } = await import('../../src/core/presets.js'));
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="slot"></div><div id="count"></div><button id="add"></button>
      <div id="cross-selector">
        <button class="segmented-btn" data-modality="cash"></button>
        <button class="segmented-btn" data-modality="standard_finance"></button>
      </div>
      <div id="cross-slot"></div><div id="cross-count"></div>
      ${readPartial('tmpl-offer-card')}${readPartial('modal-trap-guide')}`;
  });

  const sameDom = () => ({ displaySlot: $('slot'), countLabel: $('count'), btnAddForVehicle: $('add') });

  test('Pestaña 1: una tarjeta por oferta del vehículo y la de menor coste marcada como ganadora', () => {
    const normalized = SAMPLE_OFFERS.map(normalizeOffer);
    const vehicle = normalized[0].vehicle;
    const ranked = renderSameVehicleView({ dom: sameDom(), normalizedList: normalized, activeVehicle: vehicle, view: 'cards' });

    const cards = document.querySelectorAll('#slot .offer-card');
    assert.equal(cards.length, ranked.length);
    assert.ok(ranked.every(o => o.vehicle === vehicle));
    const winners = document.querySelectorAll('#slot .offer-card.is-winner');
    assert.equal(winners.length, 1, 'La oferta de menor coste total se resalta');
    const cheapest = Math.min(...ranked.map(o => o.totalOutOfPocketCost));
    assert.equal(winners[0].dataset.id, ranked.find(o => o.totalOutOfPocketCost === cheapest).id);
    assert.match($('count').textContent, new RegExp(`Mostrando ${ranked.length} ofertas para ${vehicle}`));
    assert.equal($('add').style.display, 'inline-flex');
  });

  test('Pestaña 1 sin ofertas: estado vacío, contador a 0 y botón de añadir oculto', () => {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty';
    renderSameVehicleView({
      dom: sameDom(), normalizedList: [], activeVehicle: null, view: 'cards',
      callbacks: { renderEmptyState: () => emptyState }
    });
    assert.ok($('slot').querySelector('.empty'));
    assert.equal($('count').textContent, 'Mostrando 0 ofertas');
    assert.equal($('add').style.display, 'none');
  });

  test('Pestaña 2: marca la modalidad activa y muestra el aviso si no hay ofertas en ella', () => {
    const normalized = SAMPLE_OFFERS.map(normalizeOffer).filter(o => o.modality !== 'cash');
    const dom = { modalitySelector: $('cross-selector'), displaySlot: $('cross-slot'), countLabel: $('cross-count') };
    renderCrossVehicleView({ dom, normalizedList: normalized, modality: 'cash', view: 'cards' });

    assert.ok(document.querySelector('[data-modality="cash"]').classList.contains('active'));
    assert.ok(!document.querySelector('[data-modality="standard_finance"]').classList.contains('active'));
    assert.match($('cross-slot').querySelector('.cross-empty-title').textContent, /Sin ofertas de Pago al contado/);
    assert.match($('cross-count').textContent, /Comparando 0 vehículos/);
  });

  test('Guía de trampas: lista las ofertas con trampa como texto (sin interpretar HTML)', () => {
    const trap = initTrapGuideModal();
    trap.update([
      { title: '<img src=x onerror=alert(1)>', isCash: false, verdict: { status: 'danger' }, advertisedDiscount: 2600, netDifferenceVsCashRef: 2195.39 },
      { title: 'Sin trampa', isCash: false, verdict: { status: 'success' } }
    ]);

    const items = document.querySelectorAll('#trap-guide-offers-list li');
    assert.equal(items.length, 1);
    assert.equal(items[0].querySelector('img'), null);
    assert.match(items[0].textContent, /^<img src=x onerror=alert\(1\)>: Descuento anunciado de 2600 €/);
    assert.equal($('trap-guide-offers-alert').style.display, 'block');

    trap.update([]);
    assert.equal(document.querySelectorAll('#trap-guide-offers-list li').length, 0);
    assert.equal($('trap-guide-offers-alert').style.display, 'none');
  });
});
