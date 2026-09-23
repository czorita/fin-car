/**
 * Motor de cálculos financieros para préstamos y ofertas de automóviles.
 * Incluye sistema francés, préstamos con cuota final (balloon / multiopción),
 * cálculo de TAE real mediante TIR (Newton-Raphson con bisección de respaldo) y cuadro de amortización.
 */

import {
  DEFAULTS,
  IRR_MAX_ITERATIONS,
  IRR_PRECISION,
  IRR_MIN_DERIVATIVE,
  IRR_DEFAULT_GUESS,
  APR_IRR_GUESS,
  IRR_MIN_RATE,
  IRR_BISECTION_MAX_RATE,
  IRR_BISECTION_MAX_ITERATIONS,
  REVERSE_TIN_MAX_ITERATIONS,
  REVERSE_TIN_MAX_MONTHLY_RATE,
  REVERSE_TIN_PAYMENT_TOLERANCE
} from './constants.js';

/**
 * Devuelve la cuota a aplicar: la cuota forzada si es un número positivo o, en su defecto, la teórica.
 * @param {number|null|undefined} override
 * @param {number} theoretical
 * @returns {number}
 */
function pickMonthlyPayment(override, theoretical) {
  const value = Number(override);
  return override !== null && override !== undefined && Number.isFinite(value) && value > 0 ? value : theoretical;
}

/**
 * Calcula la cuota mensual para un préstamo estándar o con valor residual (cuota final).
 * 
 * @param {number} principal - Capital neto financiado
 * @param {number} annualTin - TIN anual en porcentaje (ej: 7.95 para 7.95%)
 * @param {number} months - Plazo en meses
 * @param {number} balloonPayment - Cuota final / Valor Futuro Garantizado (opcional, por defecto 0)
 * @returns {number} Cuota mensual
 */
export function calculateMonthlyPayment(principal, annualTin, months, balloonPayment = 0) {
  if (principal <= 0 || months <= 0) return 0;
  
  const r = (annualTin / 100) / 12;
  const n = months;
  const vf = balloonPayment || 0;

  // Caso especial: 0% de interés
  if (r === 0) {
    return (principal - vf) / n;
  }

  // Fórmula estándar con valor futuro residual:
  // P = M * [1 - (1+r)^-n] / r + VF / (1+r)^n
  // M = [P - VF / (1+r)^n] * [r / (1 - (1+r)^-n)]
  const discountFactor = Math.pow(1 + r, -n);
  const pvBalloon = vf * discountFactor;
  const annuityFactor = (1 - discountFactor) / r;

  const monthlyPayment = (principal - pvBalloon) / annuityFactor;
  return Math.max(0, monthlyPayment);
}

/**
 * Calcula la liquidación anticipada de un préstamo francés en el mes k con penalización.
 * Soporta tanto préstamos lineales estándar como financiación flexible con cuota final (balloon / VFG).
 * @param {number} principal - Capital financiado
 * @param {number} annualTin - TIN anual (%)
 * @param {number} contractMonths - Plazo original del contrato (ej: 84)
 * @param {number} cancelMonth - Mes en el que se liquida totalmente (ej: 24)
 * @param {number} [penaltyRate=DEFAULTS.earlyCancellationPenaltyRate] - Comisión de cancelación anticipada en % (ej: 1.0)
 * @param {number} [balloonPayment=0] - Cuota final / balloon residual al término del contrato original
 * @param {number|null} [monthlyPaymentOverride=null] - Cuota real a aplicar (ej. la indicada por el concesionario)
 *   en lugar de la teórica del TIN. Se usa en el bucle de amortización y en todos los totales.
 * @returns {{
 *   monthlyPayment: number,
 *   contractMonths: number,
 *   cancelMonth: number,
 *   penaltyRate: number,
 *   regularPaymentsTotal: number,
 *   settlementCapital: number,
 *   penaltyAmount: number,
 *   finalSettlementPayment: number,
 *   totalPaidLoan: number,
 *   totalInterestPaid: number,
 *   originalTotalInterest: number,
 *   futureInterestSaved: number
 * }}
 */
export function calculateEarlyCancellationSettlement(
  principal,
  annualTin,
  contractMonths,
  cancelMonth,
  penaltyRate = DEFAULTS.earlyCancellationPenaltyRate,
  balloonPayment = 0,
  monthlyPaymentOverride = null
) {
  if (principal <= 0 || contractMonths <= 0 || cancelMonth <= 0) {
    return {
      monthlyPayment: 0,
      contractMonths: 0,
      cancelMonth: 0,
      penaltyRate: 0,
      regularPaymentsTotal: 0,
      settlementCapital: 0,
      penaltyAmount: 0,
      finalSettlementPayment: 0,
      totalPaidLoan: 0,
      totalInterestPaid: 0,
      originalTotalInterest: 0,
      futureInterestSaved: 0
    };
  }

  const effectiveCancelMonth = Math.min(contractMonths, Math.max(1, cancelMonth));
  const r = (annualTin / 100) / 12;
  const vf = Number(balloonPayment) || 0;
  const monthlyPayment = pickMonthlyPayment(
    monthlyPaymentOverride,
    calculateMonthlyPayment(principal, annualTin, contractMonths, vf)
  );

  let balance = principal;
  let totalInterestPaid = 0;

  for (let m = 1; m <= effectiveCancelMonth; m++) {
    const interest = balance * r;
    totalInterestPaid += interest;
    const principalPaid = monthlyPayment - interest;
    balance -= principalPaid;
    if (balance < 0) balance = 0;
  }

  const settlementCapital = Number(balance.toFixed(2));
  const penaltyAmount = Number((settlementCapital * (penaltyRate / 100)).toFixed(2));
  const finalSettlementPayment = Number((settlementCapital + penaltyAmount).toFixed(2));
  const regularPaymentsTotal = Number((monthlyPayment * effectiveCancelMonth).toFixed(2));
  const totalPaidLoan = Number((regularPaymentsTotal + finalSettlementPayment).toFixed(2));

  // Intereses originales que se habrían pagado en todo el contrato (incluyendo el balloon al final si existe)
  const originalTotalPayments = (monthlyPayment * contractMonths) + vf;
  const originalTotalInterest = Math.max(0, originalTotalPayments - principal);

  // Ahorro en intereses futuros al cortar en el mes k (restando la penalización que hubo que pagar)
  const futureInterestSaved = Math.max(0, Number((originalTotalInterest - totalInterestPaid - penaltyAmount).toFixed(2)));

  return {
    monthlyPayment: Number(monthlyPayment.toFixed(2)),
    contractMonths,
    cancelMonth: effectiveCancelMonth,
    penaltyRate,
    regularPaymentsTotal,
    settlementCapital,
    penaltyAmount,
    finalSettlementPayment,
    totalPaidLoan,
    totalInterestPaid: Number(totalInterestPaid.toFixed(2)),
    originalTotalInterest: Number(originalTotalInterest.toFixed(2)),
    futureInterestSaved
  };
}

/**
 * Genera el cuadro de amortización mes a mes.
 * 
 * @param {number} principal - Capital financiado
 * @param {number} annualTin - TIN anual (%)
 * @param {number} months - Plazo en meses
 * @param {number} [balloonPayment=0] - Cuota final (VFG)
 * @param {object|null} [earlyCancellation=null] - Configuración de cancelación anticipada { cancelMonth, penaltyRate }
 * @param {number|null} [monthlyPaymentOverride=null] - Cuota real a aplicar en lugar de la teórica del TIN
 * @returns {Array<{month: number, payment: number, principalPayment: number, interestPayment: number, remainingBalance: number, isCancellation?: boolean, cancellationDetails?: object}>}
 */
export function generateAmortizationSchedule(principal, annualTin, months, balloonPayment = 0, earlyCancellation = null, monthlyPaymentOverride = null) {
  if (principal <= 0 || months <= 0) return [];
  
  const r = (annualTin / 100) / 12;
  const monthlyPayment = pickMonthlyPayment(
    monthlyPaymentOverride,
    calculateMonthlyPayment(principal, annualTin, months, balloonPayment)
  );
  const vf = balloonPayment || 0;
  
  const schedule = [];
  let balance = principal;

  const isEarlyCancel = Boolean(earlyCancellation && earlyCancellation.cancelMonth && earlyCancellation.cancelMonth < months);
  const limitMonths = isEarlyCancel ? Math.min(months, earlyCancellation.cancelMonth) : months;
  const penaltyRate = (earlyCancellation && earlyCancellation.penaltyRate !== undefined) ? Number(earlyCancellation.penaltyRate) : DEFAULTS.earlyCancellationPenaltyRate;

  for (let m = 1; m <= limitMonths; m++) {
    const interest = balance * r;
    let payment = monthlyPayment;
    let principalPaid = payment - interest;

    // Caso de cancelación anticipada en el mes de corte
    if (isEarlyCancel && m === limitMonths) {
      balance -= principalPaid;
      if (balance < 0) balance = 0;

      const settlementCapital = Number(balance.toFixed(2));
      const penaltyAmount = Number((settlementCapital * (penaltyRate / 100)).toFixed(2));
      
      // En este mes se paga la cuota normal + el saldo restante + la penalización
      payment = Number((monthlyPayment + settlementCapital + penaltyAmount).toFixed(2));
      principalPaid = Number((principalPaid + settlementCapital).toFixed(2));
      balance = 0;

      schedule.push({
        month: m,
        payment,
        principalPayment: principalPaid,
        interestPayment: Number(interest.toFixed(2)),
        remainingBalance: 0,
        isCancellation: true,
        cancellationDetails: {
          settlementCapital,
          penaltyAmount,
          penaltyRate
        }
      });
      break;
    }

    // Si es el último mes estándar y hay cuota final
    if (m === months) {
      if (vf > 0) {
        payment = monthlyPayment + vf;
        principalPaid = balance;
      } else {
        principalPaid = balance;
        payment = principalPaid + interest;
      }
      balance = 0;
    } else {
      balance -= principalPaid;
      if (balance < 0) balance = 0;
    }

    schedule.push({
      month: m,
      payment: Number(payment.toFixed(2)),
      principalPayment: Number(principalPaid.toFixed(2)),
      interestPayment: Number(interest.toFixed(2)),
      remainingBalance: Number(balance.toFixed(2))
    });
  }

  return schedule;
}

/**
 * Valor actual neto de una serie de flujos mensuales a una tasa periódica dada.
 * @param {number[]} cashflows
 * @param {number} rate
 * @returns {number}
 */
function netPresentValue(cashflows, rate) {
  let npv = 0;
  for (let t = 0; t < cashflows.length; t++) {
    npv += cashflows[t] / Math.pow(1 + rate, t);
  }
  return npv;
}

/**
 * Busca la TIR por Newton-Raphson a partir de una estimación inicial.
 * @param {number[]} cashflows
 * @param {number} guess
 * @returns {number|null} Tasa encontrada o null si no converge
 */
function irrByNewton(cashflows, guess) {
  let rate = guess;

  for (let i = 0; i < IRR_MAX_ITERATIONS; i++) {
    let npv = 0;
    let dNpv = 0;

    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      if (t > 0) {
        dNpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < IRR_PRECISION) {
      return rate;
    }

    if (!Number.isFinite(npv) || !Number.isFinite(dNpv) || Math.abs(dNpv) < IRR_MIN_DERIVATIVE) {
      return null;
    }

    const newRate = rate - npv / dNpv;
    // Una tasa <= -100% no tiene sentido financiero (y hace explotar el descuento)
    if (!Number.isFinite(newRate) || newRate <= -1) return null;
    rate = newRate;
  }

  return null;
}

/**
 * Busca la TIR por bisección en el intervalo [IRR_MIN_RATE, IRR_BISECTION_MAX_RATE].
 * Más lenta que Newton-Raphson pero robusta: converge siempre que el VAN cambie de signo en el intervalo.
 * @param {number[]} cashflows
 * @returns {number|null} Tasa encontrada o null si no hay cambio de signo
 */
function irrByBisection(cashflows) {
  let low = IRR_MIN_RATE;
  let high = IRR_BISECTION_MAX_RATE;
  let npvLow = netPresentValue(cashflows, low);
  const npvHigh = netPresentValue(cashflows, high);

  if (Number.isNaN(npvLow) || Number.isNaN(npvHigh)) return null;
  if (npvLow === 0) return low;
  if (npvHigh === 0) return high;
  if (Math.sign(npvLow) === Math.sign(npvHigh)) return null;

  for (let i = 0; i < IRR_BISECTION_MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const npvMid = netPresentValue(cashflows, mid);
    if (Number.isNaN(npvMid)) return null;

    if (Math.abs(npvMid) < IRR_PRECISION || (high - low) / 2 < Number.EPSILON) {
      return mid;
    }

    if (Math.sign(npvMid) === Math.sign(npvLow)) {
      low = mid;
      npvLow = npvMid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calcula la TIR (Tasa Interna de Retorno) periódica mensual.
 * Usa Newton-Raphson y, si no converge (mal punto de partida, derivada nula, divergencia),
 * recurre a bisección como respaldo.
 * cashflows[0] = flujo inicial (negativo: dinero recibido por el comprador o coste del coche)
 * cashflows[1..n] = pagos mensuales (positivos)
 * 
 * @param {number[]} cashflows 
 * @param {number} [guess=IRR_DEFAULT_GUESS] - Estimación inicial (ej: 0.01)
 * @returns {number|null} Tasa periódica mensual o null si no hay solución
 */
export function calculateIRR(cashflows, guess = IRR_DEFAULT_GUESS) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return null;

  const newtonRate = irrByNewton(cashflows, guess);
  if (newtonRate !== null && newtonRate >= IRR_MIN_RATE) {
    return newtonRate;
  }

  return irrByBisection(cashflows);
}

/**
 * Calcula la TAE real efectiva a partir de flujos de caja reales
 * (teniendo en cuenta comisiones iniciales, seguros vinculados y cuotas).
 * 
 * @param {number} netFinancedCapital - Capital líquido dispuesto
 * @param {number} monthlyPayment - Cuota mensual que se paga
 * @param {number} months - Plazo en meses
 * @param {number} balloonPayment - Cuota final (si existe)
 * @param {number} upfrontFees - Gastos iniciales adicionales (seguros obligatorios al contado, etc.)
 * @returns {number|null} TAE en porcentaje (ej: 9.85). 0 si no hay financiación que valorar
 *   y `null` si la TIR no tiene solución (TAE no calculable).
 */
export function calculateEffectiveApr(netFinancedCapital, monthlyPayment, months, balloonPayment = 0, upfrontFees = 0) {
  if (netFinancedCapital <= 0 || months <= 0 || monthlyPayment <= 0) return 0;

  const effectiveDisbursed = netFinancedCapital - upfrontFees;
  if (effectiveDisbursed <= 0) return 0;

  const cashflows = [-effectiveDisbursed];
  for (let m = 1; m <= months; m++) {
    let payment = monthlyPayment;
    if (m === months) {
      payment += balloonPayment;
    }
    cashflows.push(payment);
  }

  const monthlyIrr = calculateIRR(cashflows, APR_IRR_GUESS);
  if (monthlyIrr === null || monthlyIrr < IRR_MIN_RATE) {
    return null;
  }

  const apr = (Math.pow(1 + monthlyIrr, 12) - 1) * 100;
  // `|| 0` evita devolver -0 cuando la TIR es prácticamente nula (financiación al 0%)
  return Number(apr.toFixed(2)) || 0;
}

/**
 * Deducción inversa: A partir del capital a financiar, la cuota mensual y el número de meses,
 * halla el TIN anual y la TAE implícita (Ingeniería Inversa).
 * 
 * @param {number} principal - Capital financiado
 * @param {number} monthlyPayment - Cuota mensual
 * @param {number} months - Plazo en meses
 * @param {number} balloonPayment - Cuota final (opcional)
 * @returns {{ tin: number, apr: number, totalPaid: number, totalInterest: number }}
 */
export function reverseEngineerInterestRate(principal, monthlyPayment, months, balloonPayment = 0) {
  if (principal <= 0 || monthlyPayment <= 0 || months <= 0) {
    return { tin: 0, apr: 0, totalPaid: 0, totalInterest: 0 };
  }

  const totalPayments = (monthlyPayment * months) + balloonPayment;
  const totalInterest = Math.max(0, totalPayments - principal);

  if (totalPayments <= principal) {
    return {
      tin: 0,
      apr: 0,
      totalPaid: totalPayments,
      totalInterest: 0
    };
  }

  let low = 0;
  let high = REVERSE_TIN_MAX_MONTHLY_RATE;
  let monthlyRate = 0;

  for (let i = 0; i < REVERSE_TIN_MAX_ITERATIONS; i++) {
    monthlyRate = (low + high) / 2;
    const calcPayment = calculateMonthlyPayment(principal, monthlyRate * 12 * 100, months, balloonPayment);

    if (Math.abs(calcPayment - monthlyPayment) < REVERSE_TIN_PAYMENT_TOLERANCE) {
      break;
    }

    if (calcPayment < monthlyPayment) {
      low = monthlyRate;
    } else {
      high = monthlyRate;
    }
  }

  const tin = Number((monthlyRate * 12 * 100).toFixed(2));
  const apr = Number(((Math.pow(1 + monthlyRate, 12) - 1) * 100).toFixed(2));

  return {
    tin,
    apr,
    totalPaid: Number(totalPayments.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2))
  };
}
