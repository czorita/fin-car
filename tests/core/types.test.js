import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultOffer, OFFER_MODALITIES, MODALITY_LABELS, MODALITY_SHORT_NAMES, getOfferDisplayTitle, getOfferFinanceSubtitle } from '../../src/core/types.js';
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
    assert.equal(offer.title, 'Nueva oferta');
    assert.equal(offer.modality, OFFER_MODALITIES.STANDARD_FINANCE);
    assert.equal(offer.cashPriceReference, DEFAULTS.cashPriceReference);
    assert.equal(offer.offerPrice, DEFAULTS.offerPrice);
    assert.equal(offer.downPayment, DEFAULTS.downPayment);
    assert.equal(offer.months, DEFAULTS.months);
    assert.equal(offer.tin, DEFAULTS.tin);
    assert.equal(offer.tradeInValue, 0);
    assert.equal(offer.balloonPayment, 0);
    assert.deepEqual(offer.linkedProducts, []);
  });

  test('Test 3: createDefaultOffer respeta el valor 0 en campos numéricos (no lo sustituye por default)', () => {
    const offer = createDefaultOffer({
      downPayment: 0,
      tradeInValue: 0,
      balloonPayment: 0,
      tin: 0
    });

    assert.equal(offer.downPayment, 0, 'Entrada 0 debe mantenerse en 0');
    assert.equal(offer.tin, 0, 'TIN 0% debe mantenerse en 0');
    assert.equal(offer.tradeInValue, 0, 'Tasación 0 debe mantenerse en 0');
  });

  test('Test 4: Modalidades y etiquetas definidas correctamente', () => {
    assert.equal(MODALITY_LABELS[OFFER_MODALITIES.CASH], 'Pago al contado');
    assert.equal(MODALITY_LABELS[OFFER_MODALITIES.STANDARD_FINANCE], 'Financiación lineal estándar');
    assert.equal(MODALITY_LABELS[OFFER_MODALITIES.FLEXIBLE_FINANCE], 'Financiación flexible (multiopción / balloon)');
  });

  test('Test 5: Soporte de vehículo explícito y extracción retrocompatible', () => {
    const offerWithExplicit = createDefaultOffer({ vehicle: 'Toyota RAV4', title: 'Financiación 48m' });
    assert.equal(offerWithExplicit.vehicle, 'Toyota RAV4');

    const offerLegacyHyphen = createDefaultOffer({ title: 'Toyota Corolla 140H Style - Al Contado' });
    assert.equal(offerLegacyHyphen.vehicle, 'Toyota Corolla 140H Style');

    const offerLegacySuffix = createDefaultOffer({ title: 'Tucson fin' });
    assert.equal(offerLegacySuffix.vehicle, 'Tucson');

    const offerLegacySuffixCancel = createDefaultOffer({ title: 'RAV4 fin cancelando' });
    assert.equal(offerLegacySuffixCancel.vehicle, 'RAV4');
  });

  test('Test 6: getOfferDisplayTitle genera el título con Modelo + Tipo de Financiación', () => {
    assert.equal(
      getOfferDisplayTitle({ vehicle: 'Hyundai Tucson', modality: OFFER_MODALITIES.CASH }),
      'Hyundai Tucson - Al contado'
    );
    assert.equal(
      getOfferDisplayTitle({ vehicle: 'Hyundai Tucson', modality: OFFER_MODALITIES.STANDARD_FINANCE, months: 60 }),
      'Hyundai Tucson - Financiación lineal (60m)'
    );
    assert.equal(
      getOfferDisplayTitle({ vehicle: 'Hyundai Tucson', modality: OFFER_MODALITIES.FLEXIBLE_FINANCE, months: 48 }),
      'Hyundai Tucson - Compra flexible (48m)'
    );

    // Subtítulo / Tipo de financiación a la derecha del guion para tarjetas en "Mismo vehículo"
    assert.equal(
      getOfferFinanceSubtitle({ vehicle: 'Toyota RAV4', modality: OFFER_MODALITIES.CASH }),
      'Al contado'
    );
    assert.equal(
      getOfferFinanceSubtitle({ vehicle: 'Toyota RAV4', modality: OFFER_MODALITIES.STANDARD_FINANCE, months: 60 }),
      'Financiación lineal (60m)'
    );
    assert.equal(
      getOfferFinanceSubtitle({ vehicle: 'Toyota RAV4', modality: OFFER_MODALITIES.FLEXIBLE_FINANCE, months: 48 }),
      'Compra flexible (48m)'
    );
  });

  test('Test 7: En financiación, offerPrice es la resta entre vehiclePrice y financeDiscount', () => {
    // Financiación lineal con precio y descuento explícitos
    const financedOffer = createDefaultOffer({
      vehicle: 'Kia Sportage',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      vehiclePrice: 30000,
      financeDiscount: 3500
    });
    assert.equal(financedOffer.vehiclePrice, 30000);
    assert.equal(financedOffer.financeDiscount, 3500);
    assert.equal(financedOffer.offerPrice, 26500, 'offerPrice debe ser la resta: 30000 - 3500 = 26500');

    // Al contado, el descuento es 0 y offerPrice es igual a vehiclePrice
    const cashOffer = createDefaultOffer({
      vehicle: 'Kia Sportage',
      modality: OFFER_MODALITIES.CASH,
      vehiclePrice: 30000,
      financeDiscount: 3500 // Debe ignorarse en contado
    });
    assert.equal(cashOffer.vehiclePrice, 30000);
    assert.equal(cashOffer.financeDiscount, 0);
    assert.equal(cashOffer.offerPrice, 30000);
  });

  test('Test 8: Soporte para includedServices (servicios bonificados) en createDefaultOffer', () => {
    // Por defecto es array vacío
    const def = createDefaultOffer({ vehicle: 'Toyota RAV4' });
    assert.ok(Array.isArray(def.includedServices), 'Debe inicializar includedServices como array');
    assert.equal(def.includedServices.length, 0);

    // Con servicios definidos
    const withServices = createDefaultOffer({
      vehicle: 'Toyota RAV4',
      includedServices: [
        { id: 'srv_1', name: 'Mantenimiento 4 años', marketValue: 1200 },
        { id: 'srv_2', name: 'Seguro 1er año', marketValue: 750 }
      ]
    });
    assert.equal(withServices.includedServices.length, 2);
    assert.equal(withServices.includedServices[0].marketValue, 1200);
    assert.equal(withServices.includedServices[1].marketValue, 750);
  });

  test('Test 9: Modalidad EARLY_CANCELLATION definida y subtítulo claro', () => {
    assert.equal(OFFER_MODALITIES.EARLY_CANCELLATION, 'early_cancellation');
    assert.ok(MODALITY_LABELS[OFFER_MODALITIES.EARLY_CANCELLATION]);
    assert.ok(MODALITY_SHORT_NAMES[OFFER_MODALITIES.EARLY_CANCELLATION]);

    const sub = getOfferFinanceSubtitle({
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      contractMonths: 84,
      earlyCancellationMonth: 24
    });
    assert.equal(sub, 'Cancelación mes 24 (de 84m)');
  });

  test('Test 10: createDefaultOffer soporta campos de cancelación anticipada', () => {
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      contractMonths: 96,
      earlyCancellationMonth: 18,
      earlyCancellationPenaltyRate: 0.5
    });

    assert.equal(offer.modality, OFFER_MODALITIES.EARLY_CANCELLATION);
    assert.equal(offer.contractMonths, 96);
    assert.equal(offer.earlyCancellationMonth, 18);
    assert.equal(offer.earlyCancellationPenaltyRate, 0.5);
  });
});

