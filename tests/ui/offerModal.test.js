import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, readPartial, typeInto } from '../helpers/dom.js';

let initOfferModal;
let modal;
let saved;
const $ = id => document.getElementById(id);

function clickModality(val) {
  document.querySelector(`#modality-selector .segmented-btn[data-val="${val}"]`).click();
}

function submit() {
  $('form-offer').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('Modal de oferta (OfferModal.js) sobre el HTML real del formulario', () => {
  before(async () => {
    setupDom();
    ({ initOfferModal } = await import('../../src/components/OfferModal.js'));
  });

  beforeEach(() => {
    document.body.innerHTML = readPartial('modal-offer') + readPartial('tmpl-linked-product') + readPartial('tmpl-included-service');
    saved = [];
    modal = initOfferModal({ onSave: offer => saved.push(offer), getKnownVehicles: () => ['Toyota RAV4'] });
  });

  test('Nueva oferta: vehículo propuesto, financiación estándar y datalist de vehículos', () => {
    modal.open(null, 'Toyota RAV4');
    assert.equal($('modal-offer-title').textContent, 'Nueva oferta de concesionario');
    assert.equal($('offer-vehicle').value, 'Toyota RAV4');
    assert.ok(document.querySelector('#modality-selector .segmented-btn[data-val="standard_finance"]').classList.contains('active'));
    assert.equal($('down-payment').value, '4000', 'Entrada por defecto al financiar');
    assert.equal($('vehicles-datalist').children.length, 1);
    assert.equal($('modal-offer').open, true);
  });

  test('TIN → cuota: calcula la cuota, el capital financiado y guarda la oferta', () => {
    modal.open(null, 'Coche Prueba');
    typeInto($('offer-price'), '30000');
    typeInto($('finance-discount'), '2000');
    typeInto($('down-payment'), '5000');
    document.querySelector('#loan-months-pills .months-pill-btn[data-months="48"]').click();
    typeInto($('loan-tin'), '6,5');

    assert.equal($('financed-amount').value, '25000');
    assert.equal($('manual-monthly').value, '592,87');
    assert.equal($('manual-monthly').disabled, true);
    assert.equal($('loan-months-badge').textContent, '4 años');
    assert.match($('cash-ref-summary-text').textContent, /32\.000 €/);

    submit();
    assert.equal(saved.length, 1);
    const offer = saved[0];
    assert.equal(offer.modality, 'standard_finance');
    assert.equal(offer.offerPrice, 30000);
    assert.equal(offer.cashPriceReference, 32000);
    assert.equal(offer.months, 48);
    assert.equal(offer.tin, 6.5);
    assert.equal(offer.manualMonthlyPayment, null);
    assert.equal($('modal-offer').open, false);
  });

  test('Añadir un producto financiado recalcula el capital financiado derivado', () => {
    modal.open(null, 'Coche Prueba');
    typeInto($('offer-price'), '30000');
    typeInto($('down-payment'), '5000');
    assert.equal($('financed-amount').value, '25000');
    $('btn-add-product').click();
    assert.equal($('financed-amount').value, '25350');
  });

  test('Contado: el plazo oculto deja de ser obligatorio y el formulario es válido', () => {
    modal.open(null, 'Coche Contado');
    clickModality('cash');
    typeInto($('offer-price'), '26000');

    assert.equal($('finance-fields-container').style.display, 'none');
    assert.equal($('loan-months').required, false);
    assert.equal($('form-offer').checkValidity(), true, 'Antes el campo #loan-months vacío y oculto bloqueaba el envío');

    submit();
    assert.equal(saved[0].modality, 'cash');
    assert.equal(saved[0].downPayment, 0);
    assert.equal(saved[0].offerPrice, 26000);
  });

  test('Cancelación anticipada con cuota: deduce el TIN y actualiza el resumen del finiquito', () => {
    modal.open(null, 'Coche Prueba');
    clickModality('early_cancellation');
    assert.equal($('loan-months').value, '84');
    typeInto($('offer-price'), '25000');
    typeInto($('down-payment'), '');
    typeInto($('financed-amount'), '20000');
    typeInto($('manual-monthly'), '330');

    assert.equal($('down-payment').value, '5000');
    assert.equal($('loan-tin').value, '9,8');
    assert.equal($('early-cancellation-container').style.display, 'block');
    assert.equal($('cancel-summary-month').textContent, '24');
    assert.notEqual($('cancel-summary-capital').textContent, '-- €');

    submit();
    assert.equal(saved[0].manualMonthlyPayment, 330);
    assert.equal(saved[0].earlyCancellationMonth, 24);
  });

  test('Editar: rellena el formulario desde la oferta y conserva sus datos al guardar', () => {
    modal.open({
      id: 'offer_1', vehicle: 'Hyundai i30', modality: 'flexible_finance', offerPrice: 28000, financeDiscount: 1000,
      downPayment: 4000, months: 48, tin: 7.9, balloonPayment: 12000, dealer: 'Concesionario X',
      linkedProducts: [{ id: 'p1', name: 'Seguro', cost: 300, financed: true }],
      includedServices: [{ id: 's1', name: 'Mantenimiento', marketValue: 900 }]
    });

    assert.equal($('modal-offer-title').textContent, 'Editar oferta');
    assert.equal($('offer-price').value, '28000');
    assert.equal($('balloon-payment').value, '12000');
    assert.equal($('flexible-balloon-container').style.display, 'block');
    assert.equal(document.querySelectorAll('#linked-products-list .linked-product-row').length, 1);
    assert.equal($('included-services-total-badge').textContent, '🎁 900 € en servicios');

    submit();
    const offer = saved[0];
    assert.equal(offer.id, 'offer_1');
    assert.equal(offer.dealer, 'Concesionario X');
    assert.equal(offer.balloonPayment, 12000);
    assert.equal(offer.linkedProducts[0].cost, 300);
    assert.equal(offer.includedServices[0].marketValue, 900);
  });
});
