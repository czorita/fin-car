import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOffer, rankOffers } from '../../src/core/normalizer.js';
import { generateVerdict } from '../../src/core/verdicts.js';
import { OFFER_MODALITIES, createDefaultOffer } from '../../src/core/types.js';

describe('Normalizador y Veredictos (normalizer.js & verdicts.js)', () => {
  test('Test 1: Normalización de oferta al contado', () => {
    const cashOffer = createDefaultOffer({
      title: 'Compra Contado',
      modality: OFFER_MODALITIES.CASH,
      offerPrice: 20000,
      cashPriceReference: 20000,
      tradeInValue: 2000
    });

    const normalized = normalizeOffer(cashOffer);
    assert.equal(normalized.isCash, true);
    assert.equal(normalized.downPayment, 0, 'La entrada de una oferta al contado debe ser 0');
    assert.equal(normalized.monthlyPayment, 0);
    assert.equal(normalized.totalInterest, 0);
    assert.equal(normalized.totalOutOfPocketCost, 18000); // 20000 - 2000
    assert.equal(normalized.verdict.status, 'neutral');
    assert.equal(normalized.verdict.badge, 'Pago al contado');

    // Comprobar que incluso con downPayment residual, se normaliza a 0
    const cashWithResidualDown = normalizeOffer({ ...cashOffer, downPayment: 4000 });
    assert.equal(cashWithResidualDown.downPayment, 0, 'Incluso con residuo, debe ser 0 al contado');
  });

  test('Test 2: Veredicto de trampa de financiación (intereses superan con creces el descuento)', () => {
    const trapVerdict = generateVerdict({
      isCash: false,
      netDifferenceVsCashRef: 3500,
      advertisedDiscount: 2000,
      monthlyPayment: 420
    });

    assert.equal(trapVerdict.status, 'danger');
    assert.ok(trapVerdict.badge.includes('Trampa de financiación'));
    assert.ok(trapVerdict.message.includes('MÁS que al contado'));
  });

  test('Test 2b: Financiación sin descuento inicial indica que la financiación no tiene ventajas', () => {
    const verdict = generateVerdict({
      isCash: false,
      netDifferenceVsCashRef: 2400,
      advertisedDiscount: 0,
      monthlyPayment: 380
    });

    assert.equal(verdict.status, 'warning');
    assert.equal(verdict.badge, 'Sin ventajas');
    assert.ok(verdict.message.includes('La financiación no tiene ventajas'));
    assert.ok(!verdict.message.includes('ficticio'));
  });

  test('Test 3: Veredicto de ahorro neto real frente al contado', () => {
    const savingVerdict = generateVerdict({
      isCash: false,
      netDifferenceVsCashRef: -500,
      advertisedDiscount: 3000,
      monthlyPayment: 310
    });

    assert.equal(savingVerdict.status, 'success');
    assert.equal(savingVerdict.badge, 'Ahorro neto');
    assert.ok(savingVerdict.message.includes('Ahorras'));
  });

  test('Test 4: Veredicto de coste asumible', () => {
    const affordableVerdict = generateVerdict({
      isCash: false,
      netDifferenceVsCashRef: 800,
      advertisedDiscount: 2500,
      monthlyPayment: 320
    });

    assert.equal(affordableVerdict.status, 'info');
    assert.equal(affordableVerdict.badge, 'Coste asumible');
  });

  test('Test 5: Ranking de ofertas identifica al ganador y no premia cuotas engañosas', () => {
    const o1 = normalizeOffer(createDefaultOffer({
      id: 'o1',
      title: 'Barata',
      modality: OFFER_MODALITIES.CASH,
      offerPrice: 15000,
      cashPriceReference: 15000
    }));

    const o2 = normalizeOffer(createDefaultOffer({
      id: 'o2',
      title: 'Cara pero cuota baja',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 22000,
      downPayment: 5000,
      months: 84,
      tin: 7.5
    }));

    const ranked = rankOffers([o1, o2]);
    const winner = ranked.find(o => o.highlights.includes('🏆 Menor coste total'));

    assert.equal(winner.id, 'o1', 'La oferta más barata debe ser la ganadora');
    assert.ok(
      !ranked.some(o => o.highlights.some(h => h.includes('Cuota Mensual Más Baja'))),
      'No debe incluirse la insignia de cuota mensual más baja'
    );
  });

  test('Test 6: Normalización realiza todos los cálculos con la resta (vehiclePrice - financeDiscount)', () => {
    // Coche de 28.000 € con descuento por financiar de 3.000 € -> precio base para cálculos = 25.000 €
    // Entrada: 5.000 € -> Capital a financiar = 20.000 €
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      vehiclePrice: 28000,
      financeDiscount: 3000,
      downPayment: 5000,
      tradeInValue: 0,
      months: 60,
      tin: 8
    });

    const normalized = normalizeOffer(offer);
    assert.equal(normalized.vehiclePrice, 28000);
    assert.equal(normalized.financeDiscount, 3000);
    assert.equal(normalized.offerPrice, 25000, 'El precio base de cálculo debe ser 25.000 €');
    assert.equal(normalized.principalFinanced, 20000, 'El capital financiado debe ser 25.000 - 5.000 = 20.000 €');
    assert.equal(normalized.advertisedDiscount, 3000);

    // Comparado contra una oferta que introdujo directamente 25.000 € de precio sin descuento
    const offerDirectNet = createDefaultOffer({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 25000,
      downPayment: 5000,
      tradeInValue: 0,
      months: 60,
      tin: 8
    });
    const normalizedDirect = normalizeOffer(offerDirectNet);

    assert.equal(normalized.monthlyPayment, normalizedDirect.monthlyPayment, 'La cuota calculada debe ser idéntica');
    assert.equal(normalized.totalInterest, normalizedDirect.totalInterest, 'El total de intereses debe ser idéntico');
    assert.equal(normalized.totalOutOfPocketCost, normalizedDirect.totalOutOfPocketCost, 'El desembolso total debe ser idéntico');
  });

  test('Test 7: Normalización con servicios adicionales incluidos (TCO Equiparado)', () => {
    // Caso RAV4 financiado:
    // Precio contado ref: 41.500 €
    // Descuento financiar: 3.000 € -> 38.500 € base
    // Entrada: 6.000 € -> 32.500 € financiado
    // Servicios incluidos: Mantenimiento 1.200 € + Seguro 750 € = 1.950 € valor
    const offer = createDefaultOffer({
      vehicle: 'Toyota RAV4',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      vehiclePrice: 41500,
      financeDiscount: 3000,
      downPayment: 6000,
      months: 60,
      tin: 7.95,
      includedServices: [
        { id: 's1', name: 'Mantenimiento 4 años', marketValue: 1200 },
        { id: 's2', name: 'Seguro todo riesgo 1er año', marketValue: 750 }
      ]
    });

    const normalized = normalizeOffer(offer);
    assert.equal(normalized.includedServicesValue, 1950, 'El valor acumulado de servicios debe ser 1.950 €');
    assert.ok(normalized.totalOutOfPocketCost > 0);
    assert.equal(
      normalized.adjustedTcoCost,
      Number((normalized.totalOutOfPocketCost - 1950).toFixed(2)),
      'El coste TCO ajustado debe restar los servicios incluidos'
    );
    assert.equal(
      normalized.netEquatedDifferenceVsCashRef,
      Number((normalized.adjustedTcoCost - 41500).toFixed(2)),
      'La diferencia equiparada debe comparar el TCO ajustado contra el precio contado'
    );
  });

  test('Test 8: Veredicto de ahorro real equiparado cuando los servicios neutralizan los intereses', () => {
    // Si pagas 1.000 € más en el préstamo pero te regalan 1.500 € en servicios (mantenimiento y seguro):
    // netDifferenceVsCashRef = +1000, includedServicesValue = 1500 -> netEquatedDifferenceVsCashRef = -500
    const verdict = generateVerdict({
      isCash: false,
      netDifferenceVsCashRef: 1000,
      advertisedDiscount: 2000,
      monthlyPayment: 380,
      includedServicesValue: 1500,
      netEquatedDifferenceVsCashRef: -500
    });

    assert.equal(verdict.status, 'success');
    assert.ok(verdict.badge.includes('Ahorro real equiparado'));
    assert.ok(verdict.message.includes('Ahorras 500 € reales'));
  });

  test('Test 9: rankOffers identifica 💎 Mejor valor equiparado (TCO)', () => {
    // Oferta 1: Contado pelado sin servicios: 25.000 €
    const o1 = normalizeOffer(createDefaultOffer({
      id: 'o_cash',
      vehicle: 'Tucson',
      modality: OFFER_MODALITIES.CASH,
      vehiclePrice: 25000
    }));

    // Oferta 2: Financiada que cuesta 26.000 € en caja (1.000 € más que contado), pero incluye 1.800 € en servicios
    // TCO Ajustado de o2 = 26.000 - 1.800 = 24.200 € (¡más barato en TCO que el contado!)
    const o2 = normalizeOffer(createDefaultOffer({
      id: 'o_fin',
      vehicle: 'Tucson',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      vehiclePrice: 25000,
      financeDiscount: 1500,
      downPayment: 5000,
      months: 60,
      tin: 4.5,
      includedServices: [
        { id: 's1', name: 'Mantenimiento 5 años', marketValue: 1200 },
        { id: 's2', name: 'Extensión garantía', marketValue: 600 }
      ]
    }));

    const ranked = rankOffers([o1, o2]);
    const cashRanked = ranked.find(o => o.id === 'o_cash');
    const finRanked = ranked.find(o => o.id === 'o_fin');

    assert.ok(cashRanked.highlights.includes('🏆 Menor coste total'), 'El contado tiene menor desembolso financiero');
    assert.ok(finRanked.highlights.includes('💎 Mejor valor equiparado (TCO)'), 'La oferta financiada ofrece mejor TCO equiparado');
  });
});

