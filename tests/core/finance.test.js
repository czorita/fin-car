import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyPayment, reverseEngineerInterestRate, generateAmortizationSchedule } from '../../src/core/finance.js';
import { normalizeOffer, rankOffers } from '../../src/core/normalizer.js';
import { SAMPLE_OFFERS } from '../../src/core/presets.js';

describe('Cálculos Financieros y Normalización de Ofertas', () => {
  test('Test 1: Cálculo de Cuota Mensual Francesa', () => {
    const payment = calculateMonthlyPayment(20000, 7.95, 60, 0);
    assert.ok(
      Math.abs(payment - 405.05) < 0.02,
      `Error en cuota: esperada ~405.05 €, obtenida: ${payment.toFixed(2)} €`
    );
  });

  test('Test 2: Deducción Inversa de TIN', () => {
    const reverse = reverseEngineerInterestRate(20000, 405.05, 60, 0);
    assert.ok(
      Math.abs(reverse.tin - 7.95) < 0.02,
      `Error en deducción inversa: TIN esperado ~7.95%, obtenido: ${reverse.tin}%`
    );
    assert.ok(reverse.apr > 0, 'El TAE debe ser positivo');
    assert.ok(reverse.totalInterest > 0, 'Los intereses totales deben ser positivos');
  });

  test('Test 3: Normalización y Ranking de Ofertas de Ejemplo', () => {
    const normalized = SAMPLE_OFFERS.map(normalizeOffer);
    const ranked = rankOffers(normalized);

    assert.equal(ranked.length, SAMPLE_OFFERS.length, 'Todas las ofertas deben normalizarse');
    
    const best = ranked.find(o => o.highlights && o.highlights.includes('🏆 Menor Coste Total'));
    assert.ok(best, 'Debe identificarse la oferta ganadora por menor coste total');
  });

  test('Test 4: Generación de Cuadro de Amortización', () => {
    const sched = generateAmortizationSchedule(20000, 7.95, 12, 0);
    assert.equal(sched.length, 12, 'El cuadro debe tener 12 periodos');
    assert.ok(sched[0].payment > 0, 'La cuota mensual debe ser mayor a 0');
    assert.ok(sched[0].interestPayment > 0, 'El interés del primer periodo debe ser mayor a 0');
    assert.ok(sched[0].principalPayment > 0, 'La amortización de capital debe ser mayor a 0');
  });
});
