import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyPayment, reverseEngineerInterestRate, generateAmortizationSchedule, calculateEarlyCancellationSettlement, calculateIRR, calculateEffectiveApr } from '../../src/core/finance.js';
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

  test('Test 8: calculateEarlyCancellationSettlement con financiación flexible (balloon / VFG)', () => {
    // 20.000 € a 48 meses al 8.5% con balloon final de 10.000 €
    // Cancelación en mes 24 con penalización del 1%
    const res = calculateEarlyCancellationSettlement(20000, 8.5, 48, 24, 1.0, 10000);

    assert.equal(res.cancelMonth, 24);
    assert.equal(res.contractMonths, 48);
    // Cuota flexible con balloon de 10k debe ser menor que cuota lineal sin balloon (~300€ vs ~492€)
    assert.ok(res.monthlyPayment > 280 && res.monthlyPayment < 320, `Cuota flexible esperada ~300 €, obtenida ${res.monthlyPayment}`);
    // Capital de liquidación en mes 24 (debe incorporar el saldo vivo incluyendo el balloon a valor presente)
    assert.ok(res.settlementCapital > 13500 && res.settlementCapital < 16000, `Capital pendiente esperado ~14.7k €, obtenido ${res.settlementCapital}`);
    assert.equal(res.finalSettlementPayment, Number((res.settlementCapital + res.penaltyAmount).toFixed(2)));
    // Ahorro en intereses futuros al evitar los 24 meses restantes del balloon
    assert.ok(res.futureInterestSaved > 1500, `Ahorro esperado > 1500 €, obtenido ${res.futureInterestSaved}`);
  });
});

describe('Fase 2: TIR robusta y cuota forzada (finance.js)', () => {
  test('calculateEarlyCancellationSettlement usa monthlyPaymentOverride en amortización y totales', () => {
    const theoretical = calculateEarlyCancellationSettlement(20000, 8, 84, 24, 1, 0);
    const forced = calculateEarlyCancellationSettlement(20000, 8, 84, 24, 1, 0, 350);

    assert.ok(theoretical.monthlyPayment < 350);
    assert.equal(forced.monthlyPayment, 350);
    assert.equal(forced.regularPaymentsTotal, 8400);
    assert.ok(forced.settlementCapital < theoretical.settlementCapital, 'Pagando más cada mes queda menos capital pendiente');
    assert.equal(forced.totalPaidLoan, Number((8400 + forced.finalSettlementPayment).toFixed(2)));
    assert.ok(Math.abs(forced.originalTotalInterest - (350 * 84 - 20000)) < 0.01);

    // Sin override (o con valores no positivos) se mantiene la cuota teórica
    assert.deepEqual(calculateEarlyCancellationSettlement(20000, 8, 84, 24, 1, 0, null), theoretical);
    assert.deepEqual(calculateEarlyCancellationSettlement(20000, 8, 84, 24, 1, 0, 0), theoretical);
  });

  test('generateAmortizationSchedule con cuota forzada coincide con la liquidación', () => {
    const settlement = calculateEarlyCancellationSettlement(20000, 8, 84, 24, 1, 0, 350);
    const schedule = generateAmortizationSchedule(20000, 8, 84, 0, { cancelMonth: 24, penaltyRate: 1 }, 350);
    assert.equal(schedule[0].payment, 350);
    const last = schedule[schedule.length - 1];
    assert.equal(last.cancellationDetails.settlementCapital, settlement.settlementCapital);
    assert.equal(last.cancellationDetails.penaltyAmount, settlement.penaltyAmount);
  });

  test('calculateIRR: la bisección de respaldo encuentra la tasa cuando Newton-Raphson no converge', () => {
    const cashflows = [-10000, ...Array(12).fill(900)];
    const reference = calculateIRR(cashflows, 0.01);
    assert.ok(reference !== null);

    // Con un punto de partida de 500% mensual, Newton-Raphson diverge; la bisección lo rescata
    const rescued = calculateIRR(cashflows, 5);
    assert.ok(rescued !== null, 'Debe encontrar la tasa con la bisección');
    assert.ok(Math.abs(rescued - reference) < 1e-6, `Tasa ${rescued} vs ${reference}`);
  });

  test('calculateIRR devuelve null si no hay cambio de signo en los flujos', () => {
    assert.equal(calculateIRR([-100, -10, -10]), null);
    assert.equal(calculateIRR([100]), null);
  });

  test('calculateEffectiveApr: null si la TIR no tiene solución y 0 para financiación sin intereses', () => {
    assert.equal(calculateEffectiveApr(1e30, 1, 12), null);
    assert.ok(Object.is(calculateEffectiveApr(12000, 200, 60), 0), 'Al 0% la TAE es 0 (y no -0)');
    assert.equal(calculateEffectiveApr(0, 200, 60), 0, 'Sin capital financiado no hay TAE que valorar');
  });
});

