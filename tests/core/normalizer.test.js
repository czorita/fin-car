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
      registrationFee: 400,
      tradeInValue: 2000
    });

    const normalized = normalizeOffer(cashOffer);
    assert.equal(normalized.isCash, true);
    assert.equal(normalized.downPayment, 0, 'La entrada de una oferta al contado debe ser 0');
    assert.equal(normalized.monthlyPayment, 0);
    assert.equal(normalized.totalInterest, 0);
    assert.equal(normalized.totalOutOfPocketCost, 18400); // 20000 - 2000 + 400
    assert.equal(normalized.verdict.status, 'neutral');
    assert.equal(normalized.verdict.badge, 'Pago al Contado');

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
    assert.ok(trapVerdict.badge.includes('Trampa de Financiación'));
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
    assert.equal(verdict.badge, 'Sin Ventajas');
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
    assert.equal(savingVerdict.badge, 'Ahorro Neto');
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
    assert.equal(affordableVerdict.badge, 'Coste Asumible');
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
    const winner = ranked.find(o => o.highlights.includes('🏆 Menor Coste Total'));

    assert.equal(winner.id, 'o1', 'La oferta más barata debe ser la ganadora');
    assert.ok(
      !ranked.some(o => o.highlights.some(h => h.includes('Cuota Mensual Más Baja'))),
      'No debe incluirse la insignia de cuota mensual más baja'
    );
  });
});
