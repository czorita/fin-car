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
    const o1 = normalizeOffer(
      createDefaultOffer({
        id: 'o1',
        title: 'Menor coste',
        modality: OFFER_MODALITIES.CASH,
        offerPrice: 15000,
        cashPriceReference: 15000
      })
    );

    const o2 = normalizeOffer(
      createDefaultOffer({
        id: 'o2',
        title: 'Cara pero cuota baja',
        modality: OFFER_MODALITIES.STANDARD_FINANCE,
        offerPrice: 22000,
        downPayment: 5000,
        months: 84,
        tin: 7.5
      })
    );

    const ranked = rankOffers([o1, o2]);
    const winner = ranked.find(o => o.highlights.includes('🏆 Menor coste total'));

    assert.equal(winner.id, 'o1', 'La oferta con menor coste debe ser la ganadora');
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
    assert.equal(
      normalized.totalOutOfPocketCost,
      normalizedDirect.totalOutOfPocketCost,
      'El desembolso total debe ser idéntico'
    );
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
    const o1 = normalizeOffer(
      createDefaultOffer({
        id: 'o_cash',
        vehicle: 'Tucson',
        modality: OFFER_MODALITIES.CASH,
        vehiclePrice: 25000
      })
    );

    // Oferta 2: Financiada que cuesta 26.000 € en caja (1.000 € más que contado), pero incluye 1.800 € en servicios
    // TCO Ajustado de o2 = 26.000 - 1.800 = 24.200 € (¡menor coste en TCO que el contado!)
    const o2 = normalizeOffer(
      createDefaultOffer({
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
      })
    );

    const ranked = rankOffers([o1, o2]);
    const cashRanked = ranked.find(o => o.id === 'o_cash');
    const finRanked = ranked.find(o => o.id === 'o_fin');

    assert.ok(cashRanked.highlights.includes('🏆 Menor coste total'), 'El contado tiene menor desembolso financiero');
    assert.ok(
      finRanked.highlights.includes('💎 Mejor valor equiparado (TCO)'),
      'La oferta financiada ofrece mejor TCO equiparado'
    );
  });

  test('Test 10: Normalización de oferta con modalidad EARLY_CANCELLATION', () => {
    // Coche de 30.000 € con 3.000 € de descuento por financiar a 84 meses
    // Cancelación en mes 24 con 1.0% de comisión
    // Entrada: 5.000 € -> Capital a financiar: 22.000 €
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      vehiclePrice: 30000,
      financeDiscount: 3000,
      downPayment: 5000,
      months: 84,
      contractMonths: 84,
      earlyCancellationMonth: 24,
      earlyCancellationPenaltyRate: 1.0,
      tin: 8.5
    });

    const norm = normalizeOffer(offer);

    assert.equal(norm.isEarlyCancellation, true);
    assert.equal(norm.contractMonths, 84);
    assert.equal(norm.earlyCancellationMonth, 24);
    assert.equal(norm.totalMonths, 24, 'Total meses de cuotas debe ser el mes de cancelación (24)');
    assert.ok(
      norm.settlementCapital > 16000 && norm.settlementCapital < 18500,
      `Capital pendiente esperado ~17k €, obtenido ${norm.settlementCapital}`
    );
    assert.ok(
      Math.abs(norm.cancellationPenalty - norm.settlementCapital * 0.01) < 0.05,
      'Comisión debe ser el 1% del capital pendiente'
    );
    assert.equal(norm.finalSettlementPayment, Number((norm.settlementCapital + norm.cancellationPenalty).toFixed(2)));
    assert.ok(norm.futureInterestSaved > 2000, 'Debe reflejar el ahorro sustancial en intereses evitados');
    assert.equal(norm.costBreakdown.earlyCancellationPenalty, norm.cancellationPenalty);
    assert.equal(norm.amortizationSchedule.length, 24, 'El cuadro de amortización debe cortarse en el mes 24');
    assert.equal(norm.amortizationSchedule[23].isCancellation, true);
    assert.equal(norm.amortizationSchedule[23].remainingBalance, 0);
  });

  test('Test 11: Veredicto de cancelación anticipada rentable', () => {
    // Descuento de 4.000 € por financiar a 84 meses con TIN moderado (5%)
    // Intereses en 24 meses + penalización ~ 2.000 € -> ¡Ahorro neto de ~2.000 € vs contado!
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      vehiclePrice: 30000,
      financeDiscount: 4000,
      downPayment: 5000,
      months: 84,
      earlyCancellationMonth: 24,
      earlyCancellationPenaltyRate: 1.0,
      tin: 5.0
    });

    const norm = normalizeOffer(offer);
    assert.equal(norm.verdict.status, 'success');
    assert.ok(norm.verdict.badge.includes('Ahorro neto cancelando'));
    assert.ok(norm.netDifferenceVsCashRef < 0, 'El desembolso debe ser inferior al precio al contado');
  });

  test('Test 12: Veredicto de permanencia trampa cuando los intereses superan el descuento', () => {
    // Descuento pequeño (1.000 €) con TIN alto (10.5%) y cancelación a 24 meses
    // Intereses de 24 meses devoran completamente el descuento
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      vehiclePrice: 30000,
      financeDiscount: 1000,
      downPayment: 3000,
      months: 84,
      earlyCancellationMonth: 24,
      earlyCancellationPenaltyRate: 1.0,
      tin: 10.5
    });

    const norm = normalizeOffer(offer);
    assert.equal(norm.verdict.status, 'danger');
    assert.ok(norm.verdict.badge.includes('Ni cancelando compensa'));
    assert.ok(norm.netDifferenceVsCashRef > 0, 'Debe haber un sobrecoste neto frente al contado');
  });

  test('Test 13: Normalización con cuota ofertada manual (sin TIN) en financiación estándar', () => {
    // 20.000 € precio base, 2.000 € descuento, 3.000 € entrada -> 15.000 € a financiar en 60 meses
    // Cuota fijada por comercial: 320 €/mes
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      vehiclePrice: 20000,
      financeDiscount: 2000,
      downPayment: 3000,
      months: 60,
      tin: null,
      manualMonthlyPayment: 320
    });

    const norm = normalizeOffer(offer);

    assert.equal(norm.monthlyPayment, 320, 'La cuota mensual debe ser exactamente la cuota ofertada');
    assert.equal(norm.manualMonthlyPayment, 320);
    assert.ok(norm.tin > 0, `El TIN debe deducirse y ser > 0, obtenido: ${norm.tin}`);
    assert.ok(Math.abs(norm.tin - 10.07) < 0.2, `TIN esperado ~10.07%, obtenido: ${norm.tin}`);
    assert.ok(
      norm.totalInterest > 3500 && norm.totalInterest < 4500,
      `Intereses esperados ~4200€, obtenido: ${norm.totalInterest}`
    );
    assert.equal(norm.totalFinancedPayments, 320 * 60);
    assert.equal(norm.totalOutOfPocketCost, 3000 + 320 * 60);
  });

  test('Test 14: Normalización con cuota ofertada manual en cancelación anticipada (EARLY_CANCELLATION)', () => {
    // 25.000 € precio base, 3.000 € descuento, 4.000 € entrada -> 18.000 € financiados a 84 meses
    // Cuota fijada por comercial: 285 €/mes
    // Cancelación pactada en mes 24 con penalización del 1%
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      vehiclePrice: 25000,
      financeDiscount: 3000,
      downPayment: 4000,
      months: 84,
      contractMonths: 84,
      earlyCancellationMonth: 24,
      earlyCancellationPenaltyRate: 1.0,
      tin: null,
      manualMonthlyPayment: 285
    });

    const norm = normalizeOffer(offer);

    assert.equal(norm.isEarlyCancellation, true);
    assert.equal(norm.monthlyPayment, 285, 'La cuota mensual regular debe ser 285 €');
    assert.ok(norm.tin > 0, `El TIN deducido debe ser > 0, obtenido: ${norm.tin}`);
    // TIN para 18000 a 84m con cuota 285 es ~8.49%
    assert.ok(Math.abs(norm.tin - 8.49) < 0.1, `TIN esperado ~8.49%, obtenido: ${norm.tin}`);
    assert.ok(
      norm.settlementCapital > 13000 && norm.settlementCapital < 15000,
      `Capital pendiente en mes 24 esperado ~13.9k, obtenido: ${norm.settlementCapital}`
    );
    assert.ok(
      norm.cancellationPenalty > 130 && norm.cancellationPenalty < 155,
      `Penalización 1% esperada ~140€, obtenida: ${norm.cancellationPenalty}`
    );
    assert.ok(
      norm.totalInterest > 2000,
      `Intereses pagados en 24 meses deben ser > 2000€ (no 0€), obtenido: ${norm.totalInterest}`
    );
    assert.equal(norm.totalMonths, 24);
  });

  test('Test 15: Normalización con cuota ofertada manual y cuota final (FLEXIBLE_FINANCE)', () => {
    // 22.000 € financiados en 48 meses con cuota 250 € y balón residual de 12.000 €
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.FLEXIBLE_FINANCE,
      vehiclePrice: 24000,
      financeDiscount: 2000,
      downPayment: 0,
      months: 48,
      balloonPayment: 12000,
      tin: null,
      manualMonthlyPayment: 250
    });

    const norm = normalizeOffer(offer);

    assert.equal(norm.isFlexibleFinance, true);
    assert.equal(norm.monthlyPayment, 250);
    assert.ok(norm.tin > 0, `El TIN deducido con balloon debe ser > 0, obtenido: ${norm.tin}`);
    assert.ok(Math.abs(norm.tin - 2.91) < 0.1, `TIN esperado ~2.91%, obtenido: ${norm.tin}`);
    assert.equal(norm.balloonPayment, 12000);
    assert.ok(norm.totalInterest > 0, `Los intereses totales deben ser > 0, obtenido: ${norm.totalInterest}`);
  });

  test('Test 16: Normalización con precio final financiado (offerPrice) no descuenta dos veces', () => {
    // Si el usuario introduce precio final 25.000 € y descuento por financiar 3.000 €:
    // El precio contado de referencia debe ser 28.000 € y el capital base de cálculo 25.000 €
    const offer = {
      id: 'test_offer_price',
      vehicle: 'Seat León',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 25000,
      financeDiscount: 3000,
      downPayment: 5000,
      tradeInValue: 0,
      months: 60,
      tin: 8.0
    };

    const norm = normalizeOffer(offer);

    assert.equal(norm.offerPrice, 25000, 'El precio base debe ser 25.000 €');
    assert.equal(norm.cashPriceReference, 28000, 'La referencia al contado debe ser 28.000 €');
    assert.equal(
      norm.principalFinanced,
      20000,
      'El capital financiado debe ser 25.000 - 5.000 = 20.000 € (no 17.000 €)'
    );
  });

  test('Test 17: Normalización a partir de cantidad a financiar (financedAmount)', () => {
    // Precio final 25.000 €, tasación 2.000 €, producto financiado 500 €
    // Cantidad a financiar objetivo: 18.000 €
    const offer = {
      id: 'test_financed_amt',
      vehicle: 'Hyundai Tucson',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 25000,
      financeDiscount: 2500,
      financedAmount: 18000,
      tradeInValue: 2000,
      linkedProducts: [{ id: 'p1', name: 'Seguro', cost: 500, financed: true }],
      months: 60,
      tin: 8.5
    };

    const norm = normalizeOffer(offer);

    assert.equal(norm.principalFinanced, 18000, 'El capital financiado debe coincidir con la cantidad a financiar');
    // Entrada requerida: 25.000 - 2.000 + 500 - 18.000 = 5.500 €
    assert.equal(norm.downPayment, 5500, 'La entrada calculada debe ser 5.500 €');
  });

  test('Test 18: Normalización de oferta flexible combinada con cancelación anticipada', () => {
    // Coche precio final 28.500 € (con 3.500 € descuento incluido, ref 32.000 €)
    // Entrada 5.000 € -> 23.500 € a financiar
    // Contrato 48m, balloon final de 14.000 €, TIN 8%
    // Cancelación pactada en mes 24 (1% comisión)
    const offer = {
      id: 'test_flex_early',
      vehicle: 'Toyota RAV4',
      modality: OFFER_MODALITIES.FLEXIBLE_FINANCE,
      offerPrice: 28500,
      financeDiscount: 3500,
      downPayment: 5000,
      tradeInValue: 0,
      months: 48,
      contractMonths: 48,
      earlyCancellationMonth: 24,
      earlyCancellationPenaltyRate: 1.0,
      cancelEarly: true,
      balloonPayment: 14000,
      tin: 8.0
    };

    const norm = normalizeOffer(offer);

    assert.equal(norm.isFlexible, true);
    assert.equal(norm.isEarlyCancellation, true);
    assert.equal(norm.cancelEarly, true);
    assert.equal(norm.totalMonths, 24, 'Total cuotas regulares debe ser 24 meses');
    assert.equal(norm.contractMonths, 48, 'Plazo original del contrato era 48 meses');
    assert.equal(norm.earlyCancellationMonth, 24);
    assert.equal(norm.balloonPayment, 14000, 'Debe preservar el balloon pactado');
    assert.ok(
      norm.settlementCapital > 17500 && norm.settlementCapital < 20000,
      `Capital de liquidación esperado ~18.8k €, obtenido ${norm.settlementCapital}`
    );
    assert.ok(Math.abs(norm.cancellationPenalty - norm.settlementCapital * 0.01) < 0.05);
    assert.equal(norm.finalSettlementPayment, Number((norm.settlementCapital + norm.cancellationPenalty).toFixed(2)));
    assert.ok(
      norm.futureInterestSaved > 2000,
      `Ahorro esperado de intereses > 2000 €, obtenido ${norm.futureInterestSaved}`
    );
    assert.equal(norm.amortizationSchedule.length, 24);
    assert.equal(norm.amortizationSchedule[23].isCancellation, true);
    assert.equal(norm.amortizationSchedule[23].remainingBalance, 0);
  });
});

describe('Fase 2: coherencia del motor financiero (normalizer.js)', () => {
  const productCases = [
    ['indefinido', { id: 'p1', name: 'Seguro', cost: 600 }],
    ['true', { id: 'p1', name: 'Seguro', cost: 600, financed: true }],
    ['false', { id: 'p1', name: 'Seguro', cost: 600, financed: false }]
  ];

  for (const [label, product] of productCases) {
    test(`Paridad createDefaultOffer ↔ normalizeOffer con producto financed ${label}`, () => {
      const isFinanced = product.financed !== false;
      const base = {
        modality: OFFER_MODALITIES.STANDARD_FINANCE,
        offerPrice: 20000,
        cashPriceReference: 22000,
        tradeInValue: 1000,
        tin: 7,
        months: 48,
        linkedProducts: [product]
      };

      // a) Partiendo de la entrada
      const fromDown = createDefaultOffer({ ...base, downPayment: 3000 });
      const normDown = normalizeOffer(fromDown);
      const expectedPrincipal = 20000 - 3000 - 1000 + (isFinanced ? 600 : 0);
      assert.equal(fromDown.financedAmount, expectedPrincipal);
      assert.equal(normDown.principalFinanced, expectedPrincipal);
      assert.equal(normDown.downPayment, fromDown.downPayment);
      assert.equal(normDown.upfrontPayment, 3000 + (isFinanced ? 0 : 600));

      // b) Partiendo del capital a financiar
      const fromFinanced = createDefaultOffer({ ...base, financedAmount: 15000 });
      const expectedDown = 20000 - 1000 + (isFinanced ? 600 : 0) - 15000;
      assert.equal(fromFinanced.downPayment, expectedDown);
      const normFromOffer = normalizeOffer(fromFinanced);
      assert.equal(normFromOffer.downPayment, expectedDown);
      assert.equal(normFromOffer.principalFinanced, 15000);
      // El normalizador deduce lo mismo aunque solo reciba el capital a financiar
      const normOnlyFinanced = normalizeOffer({ ...fromFinanced, downPayment: undefined });
      assert.equal(normOnlyFinanced.downPayment, expectedDown);
      assert.equal(normOnlyFinanced.principalFinanced, 15000);
    });
  }

  test('createDefaultOffer respeta cashPriceReference si es el único precio informado', () => {
    const offer = createDefaultOffer({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      cashPriceReference: 30000,
      financeDiscount: 2000
    });
    const normalized = normalizeOffer(offer);
    assert.equal(offer.offerPrice, 28000);
    assert.equal(offer.cashPriceReference, 30000);
    assert.equal(normalized.offerPrice, offer.offerPrice);
    assert.equal(normalized.cashPriceReference, offer.cashPriceReference);
  });

  test('Cancelación anticipada con cuota manual y TIN: totales coherentes con la cuota manual', () => {
    const offer = {
      id: 'ec_manual',
      modality: OFFER_MODALITIES.EARLY_CANCELLATION,
      offerPrice: 25000,
      cashPriceReference: 27000,
      downPayment: 5000,
      tin: 8,
      manualMonthlyPayment: 350, // la cuota teórica al 8% en 84 meses sería ~311,72 €
      months: 84,
      contractMonths: 84,
      earlyCancellationMonth: 24,
      earlyCancellationPenaltyRate: 1,
      linkedProducts: []
    };
    const n = normalizeOffer(offer);

    assert.equal(n.monthlyPayment, 350);
    assert.equal(n.nominalTin, 8, 'El TIN informado se conserva');
    assert.equal(n.totalFinancedPayments, 350 * 24, 'Las cuotas pagadas salen de la cuota manual');

    // Capital pendiente e intereses recalculados a mano con la cuota manual
    const r = 0.08 / 12;
    let balance = 20000;
    let interest = 0;
    for (let m = 1; m <= 24; m++) {
      const i = balance * r;
      interest += i;
      balance -= 350 - i;
    }
    assert.ok(
      Math.abs(n.settlementCapital - balance) < 0.01,
      `Capital pendiente ${n.settlementCapital} vs ${balance.toFixed(2)}`
    );
    assert.ok(Math.abs(n.totalInterest - interest) < 0.01);
    assert.equal(n.totalOutOfPocketCost, Number((5000 + 350 * 24 + n.finalSettlementPayment).toFixed(2)));
    // Identidad contable: lo pagado al banco = capital + intereses + comisión
    assert.ok(
      Math.abs(n.totalFinancedPayments + n.finalSettlementPayment - (20000 + n.totalInterest + n.cancellationPenalty)) <
        0.05
    );

    // El cuadro de amortización cuadra con la misma cuota
    const schedule = n.amortizationSchedule;
    assert.equal(schedule.length, 24);
    assert.equal(schedule[0].payment, 350);
    const last = schedule[schedule.length - 1];
    assert.equal(last.isCancellation, true);
    assert.equal(last.cancellationDetails.settlementCapital, n.settlementCapital);
  });

  test('TAE no calculable (TIR sin solución) → effectiveApr === null, sin aproximaciones', () => {
    const n = normalizeOffer({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 1e30,
      cashPriceReference: 1e30,
      downPayment: 0,
      manualMonthlyPayment: 1,
      months: 12,
      linkedProducts: []
    });
    assert.equal(n.effectiveApr, null);
  });

  test('Financiación al 0% sin productos → TAE 0 (no null)', () => {
    const n = normalizeOffer({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 12000,
      cashPriceReference: 12000,
      downPayment: 0,
      tin: 0,
      months: 60,
      linkedProducts: []
    });
    assert.equal(n.monthlyPayment, 200);
    assert.equal(n.effectiveApr, 0);
    assert.equal(n.nominalTin, 0);
  });
});
