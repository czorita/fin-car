import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyPayment, reverseEngineerInterestRate, generateAmortizationSchedule, calculateEarlyCancellationSettlement } from '../../src/core/finance.js';
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
    
    const best = ranked.find(o => o.highlights && o.highlights.includes('🏆 Menor coste total'));
    assert.ok(best, 'Debe identificarse la oferta ganadora por menor coste total');
  });

  test('Test 4: Generación de Cuadro de Amortización', () => {
    const sched = generateAmortizationSchedule(20000, 7.95, 12, 0);
    assert.equal(sched.length, 12, 'El cuadro debe tener 12 periodos');
    assert.ok(sched[0].payment > 0, 'La cuota mensual debe ser mayor a 0');
    assert.ok(sched[0].interestPayment > 0, 'El interés del primer periodo debe ser mayor a 0');
    assert.ok(sched[0].principalPayment > 0, 'La amortización de capital debe ser mayor a 0');
  });

  test('Test 5: Soporte para plazos arbitrarios en meses (ej. 42 meses)', () => {
    // 42 meses
    const payment42 = calculateMonthlyPayment(18000, 6.5, 42, 0);
    assert.ok(payment42 > 0, 'La cuota para 42 meses debe calcularse correctamente');
    
    // Cuadro de amortización con 42 meses
    const sched42 = generateAmortizationSchedule(18000, 6.5, 42, 0);
    assert.equal(sched42.length, 42, 'El cuadro debe tener exactamente 42 filas');
    assert.equal(sched42[41].month, 42, 'El último periodo debe ser el mes 42');
    assert.ok(sched42[41].remainingBalance < 0.05, 'El saldo final debe quedar saldado a 0');

    // Deducción inversa con 42 meses
    const rev42 = reverseEngineerInterestRate(18000, payment42, 42, 0);
    assert.ok(Math.abs(rev42.tin - 6.5) < 0.05, `TIN deducido (~6.5%) obtenido: ${rev42.tin}%`);
  });

  test('Test 6: calculateEarlyCancellationSettlement (préstamo 84m cancelado al mes 24 con 1%)', () => {
    const principal = 20000;
    const tin = 8.5;
    const contractMonths = 84;
    const cancelMonth = 24;
    const penaltyRate = 1.0;

    const res = calculateEarlyCancellationSettlement(principal, tin, contractMonths, cancelMonth, penaltyRate);

    assert.equal(res.cancelMonth, 24);
    assert.equal(res.contractMonths, 84);
    assert.ok(res.monthlyPayment > 300 && res.monthlyPayment < 330, `Cuota esperada ~317 €, obtenida ${res.monthlyPayment}`);
    assert.ok(res.settlementCapital > 14000 && res.settlementCapital < 16000, `Capital pendiente esperado ~15.5k €, obtenido ${res.settlementCapital}`);
    assert.ok(Math.abs(res.penaltyAmount - (res.settlementCapital * 0.01)) < 0.05, 'La penalización debe ser el 1% del capital pendiente');
    assert.ok(res.futureInterestSaved > 2000, `El ahorro en intereses futuros debe ser sustancial (>2000 €), obtenido ${res.futureInterestSaved}`);
    assert.equal(res.finalSettlementPayment, Number((res.settlementCapital + res.penaltyAmount).toFixed(2)));
  });

  test('Test 7: Cuadro de amortización con cancelación anticipada', () => {
    const sched = generateAmortizationSchedule(20000, 8.5, 84, 0, { cancelMonth: 24, penaltyRate: 1.0 });

    assert.equal(sched.length, 24, 'Debe cortar en el mes 24');
    const lastRow = sched[23];
    assert.equal(lastRow.month, 24);
    assert.equal(lastRow.isCancellation, true);
    assert.equal(lastRow.remainingBalance, 0, 'El saldo al final del mes 24 debe ser 0');
    assert.ok(lastRow.cancellationDetails.penaltyAmount > 0);
  });
});
