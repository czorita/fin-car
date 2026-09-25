import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupDom, readPartial, typeInto } from '../helpers/dom.js';

const EXAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/examples');

let initOfferModal;
let normalizeOffer;
let createDefaultOffer;
let modal;
let saved;
const $ = id => document.getElementById(id);

const click = selector => document.querySelector(selector).click();
const choosePayment = type => click(`#payment-type [data-pay="${type}"]`);
const chooseScenario = scenario => click(`#financing-scenario [data-scenario="${scenario}"]`);
const chooseMonths = months => click(`#loan-months-pills .months-pill-btn[data-months="${months}"]`);
const isShown = id => $(id).style.display !== 'none';

function toggleCancelEarly(checked = true) {
  $('cancel-early-toggle').checked = checked;
  $('cancel-early-toggle').dispatchEvent(new window.Event('change', { bubbles: true }));
}

function submit() {
  $('form-offer').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('Modal de oferta (OfferModal.js) sobre el HTML real del formulario', () => {
  before(async () => {
    setupDom();
    ({ initOfferModal } = await import('../../src/components/OfferModal.js'));
    ({ normalizeOffer } = await import('../../src/core/normalizer.js'));
    ({ createDefaultOffer } = await import('../../src/core/types.js'));
  });

  beforeEach(() => {
    document.body.innerHTML =
      readPartial('modal-offer') + readPartial('tmpl-linked-product') + readPartial('tmpl-included-service');
    saved = [];
    modal = initOfferModal({ onSave: offer => saved.push(offer), getKnownVehicles: () => ['Toyota RAV4'] });
  });

  test('Nueva oferta: paso 1, financiación con "Entrada + cuotas" y cuota mensual por defecto', () => {
    modal.open(null, 'Toyota RAV4');
    assert.equal($('modal-offer-title').textContent, 'Nueva oferta');
    assert.equal($('offer-vehicle').value, 'Toyota RAV4');
    assert.equal(document.querySelector('.wizard-step[data-step="1"]').hidden, false);
    assert.equal(document.querySelector('.wizard-step[data-step="2"]').hidden, true);
    assert.ok(document.querySelector('#payment-type [data-pay="finance"]').classList.contains('active'));
    assert.equal($('down-payment').value, '4000', 'Entrada por defecto al financiar');
    assert.ok(isShown('group-down-payment') && !isShown('group-financed-amount'));
    assert.ok(isShown('group-manual-monthly') && !isShown('group-loan-tin'));
    assert.equal($('vehicles-datalist').children.length, 1);
    assert.equal($('modal-offer').open, true);
  });

  test('Navegación: Siguiente/Atrás y la barra de progreso cambian de paso', () => {
    modal.open(null, 'Coche');
    $('btn-wizard-next').click();
    assert.equal(document.querySelector('.wizard-step[data-step="2"]').hidden, false);
    click('#wizard-progress [data-go-step="3"]');
    assert.equal(document.querySelector('.wizard-step[data-step="3"]').hidden, false);
    assert.equal($('btn-wizard-next').style.display, 'none', 'En el último paso no hay "Siguiente"');
    $('btn-wizard-prev').click();
    assert.equal(document.querySelector('.wizard-step[data-step="2"]').hidden, false);
  });

  test('Entrada + TIN → cuota: calcula la cuota, el capital financiado y guarda la oferta', () => {
    modal.open(null, 'Coche Prueba');
    typeInto($('offer-price'), '30000');
    typeInto($('finance-discount'), '2000');
    typeInto($('down-payment'), '5000');
    chooseMonths(48);
    $('toggle-rate-mode').click();
    assert.ok(isShown('group-loan-tin') && !isShown('group-manual-monthly'));
    typeInto($('loan-tin'), '6,5');

    assert.equal($('financed-amount').value, '25000');
    assert.equal($('manual-monthly').value, '592,87');
    assert.equal($('loan-months-badge').textContent, '4 años');
    assert.match($('cash-ref-summary-text').textContent, /32\.000 €/);
    assert.match($('scenario-derived-text').textContent, /Financias 25\.000 €/);

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

  test('Entrada + cuota + cuota final: compra flexible y TIN deducido de la cuota', () => {
    modal.open(null, 'Coche Flexible');
    typeInto($('offer-price'), '28000');
    typeInto($('down-payment'), '4000');
    chooseMonths(48);
    typeInto($('balloon-payment'), '12000');
    typeInto($('manual-monthly'), '290');

    assert.equal($('financed-amount').value, '24000');
    assert.notEqual($('loan-tin').value, '', 'El TIN se deduce de la cuota');
    assert.match($('finance-calc-feedback-text').textContent, /TIN .* %/);

    submit();
    const offer = saved[0];
    assert.equal(offer.modality, 'flexible_finance');
    assert.equal(offer.balloonPayment, 12000);
    assert.equal(offer.manualMonthlyPayment, 290);
    assert.equal(offer.downPayment, 4000);
    assert.ok(offer.tin > 0);
  });

  test('Importe a financiar + cuota + cuota final: la entrada se deduce del precio', () => {
    modal.open(null, 'Coche Financiado');
    typeInto($('offer-price'), '28000');
    chooseScenario('financed');
    assert.ok(isShown('group-financed-amount') && !isShown('group-down-payment'));
    typeInto($('financed-amount'), '20000');
    chooseMonths(36);
    typeInto($('manual-monthly'), '350');
    typeInto($('balloon-payment'), '9000');

    assert.equal($('down-payment').value, '8000');
    assert.match($('scenario-derived-text').textContent, /Entrada 8\.?000 €/);

    submit();
    const offer = saved[0];
    assert.equal(offer.modality, 'flexible_finance');
    assert.equal(offer.financedAmount, 20000);
    assert.equal(offer.downPayment, 8000);
    assert.equal(offer.balloonPayment, 9000);
    assert.equal(offer.manualMonthlyPayment, 350);
  });

  test('Cambiar de escenario conserva los datos: el valor calculado pasa a ser el introducido', () => {
    modal.open(null, 'Coche');
    typeInto($('offer-price'), '25000');
    typeInto($('down-payment'), '5000');
    assert.equal($('financed-amount').value, '20000');
    chooseScenario('financed');
    assert.equal($('financed-amount').value, '20000');
    assert.equal($('down-payment').value, '5000');
  });

  test('Añadir un producto financiado recalcula el capital financiado derivado', () => {
    modal.open(null, 'Coche Prueba');
    typeInto($('offer-price'), '30000');
    typeInto($('down-payment'), '5000');
    assert.equal($('financed-amount').value, '25000');
    $('btn-add-product').click();
    assert.equal($('financed-amount').value, '25350');
  });

  test('Contado: oculta la financiación, el plazo deja de ser obligatorio y el formulario es válido', () => {
    modal.open(null, 'Coche Contado');
    choosePayment('cash');
    typeInto($('offer-price'), '26000');

    assert.equal($('finance-fields-container').style.display, 'none');
    assert.equal($('offer-price-label').textContent, 'Precio al contado *');
    assert.equal($('loan-months').required, false);
    assert.equal($('form-offer').checkValidity(), true);

    submit();
    assert.equal(saved[0].modality, 'cash');
    assert.equal(saved[0].downPayment, 0);
    assert.equal(saved[0].offerPrice, 26000);
  });

  test('Cancelación anticipada sin cuota final: deduce el TIN y actualiza el resumen del finiquito', () => {
    modal.open(null, 'Coche Prueba');
    toggleCancelEarly();
    assert.equal($('loan-months').value, '84');
    typeInto($('offer-price'), '25000');
    chooseScenario('financed');
    typeInto($('financed-amount'), '20000');
    typeInto($('manual-monthly'), '330');

    assert.equal($('down-payment').value, '5000');
    assert.equal($('loan-tin').value, '9,8');
    assert.equal($('early-cancellation-container').style.display, 'block');
    assert.equal($('cancel-summary-month').textContent, '24');
    assert.notEqual($('cancel-summary-capital').textContent, '-- €');

    submit();
    assert.equal(saved[0].modality, 'early_cancellation');
    assert.equal(saved[0].manualMonthlyPayment, 330);
    assert.equal(saved[0].earlyCancellationMonth, 24);
  });

  test('Cancelación anticipada con cuota final: compra flexible con cancelación', () => {
    modal.open(null, 'Coche');
    typeInto($('offer-price'), '30000');
    chooseMonths(48);
    typeInto($('balloon-payment'), '14000');
    typeInto($('manual-monthly'), '300');
    toggleCancelEarly();

    submit();
    assert.equal(saved[0].modality, 'flexible_finance');
    assert.equal(saved[0].cancelEarly, true);
    assert.equal(saved[0].earlyCancellationMonth, 24);
  });

  test('Resumen en vivo: muestra el coste total real y la cuota', () => {
    modal.open(null, 'Coche');
    assert.equal($('live-summary-list').hidden, true);
    typeInto($('offer-price'), '20000');
    typeInto($('down-payment'), '0');
    chooseMonths(60);
    typeInto($('manual-monthly'), '400');
    assert.equal($('live-summary-list').hidden, false);
    assert.equal($('live-total').textContent, '24.000 €');
    assert.equal($('live-monthly').textContent, '400 €');
  });

  test('Editar: abre en el paso de pago, rellena el formulario y conserva sus datos al guardar', () => {
    modal.open({
      id: 'offer_1',
      vehicle: 'Hyundai i30',
      modality: 'flexible_finance',
      offerPrice: 28000,
      financeDiscount: 1000,
      downPayment: 4000,
      months: 48,
      tin: 7.9,
      balloonPayment: 12000,
      dealer: 'Concesionario X',
      linkedProducts: [{ id: 'p1', name: 'Seguro', cost: 300, financed: true }],
      includedServices: [{ id: 's1', name: 'Mantenimiento', marketValue: 900 }]
    });

    assert.equal($('modal-offer-title').textContent, 'Editar oferta');
    assert.equal(document.querySelector('.wizard-step[data-step="2"]').hidden, false);
    assert.equal($('offer-price').value, '28000');
    assert.equal($('balloon-payment').value, '12000');
    assert.ok(isShown('group-loan-tin'), 'Una oferta guardada con TIN se edita con TIN');
    assert.equal(document.querySelectorAll('#linked-products-list .linked-product-row').length, 1);
    assert.equal($('included-services-total-badge').textContent, '🎁 900 € en servicios');

    submit();
    const offer = saved[0];
    assert.equal(offer.id, 'offer_1');
    assert.equal(offer.modality, 'flexible_finance');
    assert.equal(offer.dealer, 'Concesionario X');
    assert.equal(offer.balloonPayment, 12000);
    assert.equal(offer.tin, 7.9);
    assert.equal(offer.linkedProducts[0].cost, 300);
    assert.equal(offer.includedServices[0].marketValue, 900);
  });

  test('Editar cancelación anticipada: el interruptor aparece activado y la modalidad se conserva', () => {
    modal.open({
      id: 'offer_2',
      vehicle: 'Toyota Corolla',
      modality: 'early_cancellation',
      offerPrice: 25000,
      financedAmount: 20000,
      months: 84,
      manualMonthlyPayment: 330,
      earlyCancellationMonth: 36,
      earlyCancellationPenaltyRate: 0.5
    });

    assert.equal($('cancel-early-toggle').checked, true);
    assert.ok(isShown('group-financed-amount'), 'Guardada con importe financiado: se edita igual');
    assert.equal($('early-cancel-month').value, '36');

    submit();
    assert.equal(saved[0].modality, 'early_cancellation');
    assert.equal(saved[0].earlyCancellationMonth, 36);
    assert.equal(saved[0].earlyCancellationPenaltyRate, 0.5);
    assert.equal(saved[0].financedAmount, 20000);
  });

  test('Abrir desde "Calcular el interés desde la cuota": paso 2 en modo cuota', () => {
    modal.open(null, null, { rateMode: 'monthly', step: 2 });
    assert.equal(document.querySelector('.wizard-step[data-step="2"]').hidden, false);
    assert.ok(isShown('group-manual-monthly'));
  });

  test('Regresión: abrir y guardar cada ejemplo sin cambios conserva su modalidad y su coste real', () => {
    const files = fs.readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.json'));
    assert.ok(files.length > 0);
    for (const file of files) {
      const example = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf-8'));
      saved = [];
      modal.open(example);
      submit();
      const before = normalizeOffer(createDefaultOffer(example));
      const after = normalizeOffer(createDefaultOffer(saved[0]));
      assert.equal(after.modality, before.modality, `${file}: modalidad`);
      assert.equal(after.totalOutOfPocketCost, before.totalOutOfPocketCost, `${file}: coste total real`);
      assert.equal(after.monthlyPayment, before.monthlyPayment, `${file}: cuota`);
    }
  });
});
