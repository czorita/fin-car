import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultOffer, OFFER_MODALITIES, MODALITY_LABELS } from '../../src/core/types.js';
import { generateId, ID_PREFIX_OFFER, ID_PREFIX_PRODUCT, DEFAULTS } from '../../src/core/constants.js';

describe('Tipos y Estructuras de Datos (types.js)', () => {
  test('Test 1: Generación de identificadores únicos (generateId)', () => {
    const idOffer = generateId(ID_PREFIX_OFFER);
    assert.ok(idOffer.startsWith('offer_'), 'Debe empezar con el prefijo offer_');

    const idProd = generateId(ID_PREFIX_PRODUCT);
    assert.ok(idProd.startsWith('p_'), 'Debe empezar con el prefijo p_');

    const idDefault = generateId();
    assert.ok(idDefault.startsWith('offer_'), 'El prefijo por defecto debe ser offer_');

    const id2 = generateId();
    assert.notEqual(idDefault, id2, 'Los IDs generados deben ser distintos');
  });

  test('Test 2: createDefaultOffer con valores por defecto', () => {
    const offer = createDefaultOffer();
    assert.equal(offer.title, 'Nueva Oferta');
    assert.equal(offer.modality, OFFER_MODALITIES.STANDARD_FINANCE);
    assert.equal(offer.cashPriceReference, DEFAULTS.cashPriceReference);
    assert.equal(offer.offerPrice, DEFAULTS.offerPrice);
    assert.equal(offer.downPayment, DEFAULTS.downPayment);
    assert.equal(offer.months, DEFAULTS.months);
    assert.equal(offer.tin, DEFAULTS.tin);
    assert.equal(offer.openingFeePercentage, DEFAULTS.openingFeePercentage);
    assert.equal(offer.tradeInValue, 0);
    assert.equal(offer.registrationFee, 0);
    assert.equal(offer.balloonPayment, 0);
    assert.deepEqual(offer.linkedProducts, []);
  });

  test('Test 3: createDefaultOffer respeta el valor 0 en campos numéricos (no lo sustituye por default)', () => {
    const offer = createDefaultOffer({
      downPayment: 0,
      openingFeePercentage: 0,
      tradeInValue: 0,
      registrationFee: 0,
      balloonPayment: 0,
      tin: 0
    });

    assert.equal(offer.downPayment, 0, 'Entrada 0 debe mantenerse en 0');
    assert.equal(offer.openingFeePercentage, 0, 'Comisión 0% debe mantenerse en 0');
    assert.equal(offer.tin, 0, 'TIN 0% debe mantenerse en 0');
    assert.equal(offer.tradeInValue, 0, 'Tasación 0 debe mantenerse en 0');
    assert.equal(offer.registrationFee, 0, 'Matriculación 0 debe mantenerse en 0');
  });

  test('Test 4: Modalidades y etiquetas definidas correctamente', () => {
    assert.equal(MODALITY_LABELS[OFFER_MODALITIES.CASH], 'Pago al Contado');
    assert.equal(MODALITY_LABELS[OFFER_MODALITIES.STANDARD_FINANCE], 'Financiación Lineal Estándar');
    assert.equal(MODALITY_LABELS[OFFER_MODALITIES.FLEXIBLE_FINANCE], 'Financiación Flexible (Multiopción / Balloon)');
  });
});
