import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, readPartial } from '../helpers/dom.js';

let renderSameVehicleView;
let renderCrossVehicleView;
let renderVehicleCarousel;
let initTrapGuideModal;
let normalizeOffer;
let SAMPLE_OFFERS;
const $ = id => document.getElementById(id);

describe('Vistas de las pestañas y guía de trampas (ui/views, TrapGuideModal)', () => {
  before(async () => {
    setupDom();
    ({ renderSameVehicleView } = await import('../../src/ui/views/sameVehicleView.js'));
    ({ renderCrossVehicleView } = await import('../../src/ui/views/crossVehicleView.js'));
    ({ renderVehicleCarousel } = await import('../../src/ui/views/vehicleCarousel.js'));
    ({ initTrapGuideModal } = await import('../../src/components/TrapGuideModal.js'));
    ({ normalizeOffer } = await import('../../src/core/normalizer.js'));
    ({ SAMPLE_OFFERS } = await import('../../src/core/presets.js'));
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chips"></div>
      <div id="slot"></div>
      <select id="cross-selector">
        <option value="cash"></option>
        <option value="standard_finance"></option>
      </select>
      <div id="cross-slot"></div><div id="cross-count"></div>
      ${readPartial('tmpl-offer-card')}${readPartial('modal-trap-guide')}`;
  });

  const sameDom = () => ({ displaySlot: $('slot') });

  test('Pestaña 1: una tarjeta por oferta del vehículo, sin marcar ninguna como "mejor"', () => {
    const normalized = SAMPLE_OFFERS.map(normalizeOffer);
    const vehicle = normalized[0].vehicle;
    const ranked = renderSameVehicleView({
      dom: sameDom(),
      normalizedList: normalized,
      activeVehicle: vehicle,
      view: 'cards'
    });

    const cards = document.querySelectorAll('#slot .offer-card');
    assert.equal(cards.length, ranked.length);
    assert.ok(ranked.every(o => o.vehicle === vehicle));
    // La decisión no es solo el precio: ninguna tarjeta se destaca como ganadora ni lleva insignias de ranking
    assert.equal(document.querySelectorAll('#slot .offer-card.is-winner, #slot .badge-winner').length, 0);
    assert.doesNotMatch($('slot').textContent, /Menor coste|Mejor|Menos intereses/);
  });

  test('Pestaña 1 sin ofertas: estado vacío', () => {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty';
    renderSameVehicleView({
      dom: sameDom(),
      normalizedList: [],
      activeVehicle: null,
      view: 'cards',
      callbacks: { renderEmptyState: () => emptyState }
    });
    assert.ok($('slot').querySelector('.empty'));
  });

  test('Pestaña 2: sincroniza el selector de modalidad y muestra el aviso si no hay ofertas en ella', () => {
    const normalized = SAMPLE_OFFERS.map(normalizeOffer).filter(o => o.modality !== 'cash');
    const dom = { modalitySelector: $('cross-selector'), displaySlot: $('cross-slot'), countLabel: $('cross-count') };
    renderCrossVehicleView({ dom, normalizedList: normalized, modality: 'cash', view: 'cards' });

    assert.equal($('cross-selector').value, 'cash');
    assert.match($('cross-slot').querySelector('.cross-empty-title').textContent, /Sin ofertas de Pago al contado/);
    assert.match($('cross-count').textContent, /Comparando 0 vehículos/);
  });

  test('Fila de coches: un chip por coche, chip "Todos los coches" y selección', () => {
    const selected = [];
    let allClicks = 0;
    const vehicles = [
      { name: 'Hyundai i30', count: 2 },
      { name: 'Toyota Corolla', count: 3 }
    ];
    renderVehicleCarousel($('chips'), vehicles, 'Toyota Corolla', {
      onSelect: name => selected.push(name),
      onSelectAll: () => allClicks++
    });

    const chips = document.querySelectorAll('#chips .vehicle-chip');
    assert.equal(chips.length, 3);
    assert.equal(chips[1].getAttribute('aria-pressed'), 'true');
    assert.match(chips[2].textContent, /Todos los coches/);
    chips[0].click();
    chips[2].click();
    assert.deepEqual(selected, ['Hyundai i30']);
    assert.equal(allClicks, 1);

    renderVehicleCarousel($('chips'), vehicles, 'Toyota Corolla', {
      isAllActive: true,
      onSelect() {},
      onSelectAll() {}
    });
    const active = document.querySelectorAll('#chips .vehicle-chip.active');
    assert.equal(active.length, 1);
    assert.ok(active[0].classList.contains('vehicle-chip--all'));

    renderVehicleCarousel($('chips'), [vehicles[0]], 'Hyundai i30', { onSelect() {}, onSelectAll() {} });
    assert.equal(
      document.querySelectorAll('#chips .vehicle-chip--all').length,
      0,
      'Con un solo coche no hay comparativa'
    );
  });

  test('Guía de trampas: lista las ofertas con trampa como texto (sin interpretar HTML)', () => {
    const trap = initTrapGuideModal();
    trap.update([
      {
        title: '<img src=x onerror=alert(1)>',
        isCash: false,
        verdict: { status: 'danger' },
        advertisedDiscount: 2600,
        netDifferenceVsCashRef: 2195.39
      },
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
