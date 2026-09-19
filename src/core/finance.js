/**
 * Motor de cálculos financieros para préstamos y ofertas de automóviles.
 * Incluye sistema francés, préstamos con cuota final (balloon / multiopción),
 * cálculo de TAE real mediante TIR (Newton-Raphson) y cuadro de amortización.
 */

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
 * Genera el cuadro de amortización mes a mes.
 * 
 * @param {number} principal - Capital financiado
 * @param {number} annualTin - TIN anual (%)
 * @param {number} months - Plazo en meses
 * @param {number} balloonPayment - Cuota final (VFG)
 * @returns {Array<{month: number, payment: number, principalPayment: number, interestPayment: number, remainingBalance: number}>}
 */
export function generateAmortizationSchedule(principal, annualTin, months, balloonPayment = 0) {
  if (principal <= 0 || months <= 0) return [];
  
  const r = (annualTin / 100) / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualTin, months, balloonPayment);
  const vf = balloonPayment || 0;
  
  const schedule = [];
  let balance = principal;

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    let payment = monthlyPayment;
    let principalPaid = payment - interest;

    // Si es el último mes y hay cuota final
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
 * Calcula la TIR (Tasa Interna de Retorno) periódica mensual usando Newton-Raphson.
 * cashflows[0] = flujo inicial (negativo: dinero recibido por el comprador o coste del coche)
 * cashflows[1..n] = pagos mensuales (positivos)
 * 
 * @param {number[]} cashflows 
 * @param {number} guess - Estimación inicial (ej: 0.01)
 * @returns {number|null} Tasa periódica mensual o null si no converge
 */
export function calculateIRR(cashflows, guess = 0.01) {
  const maxIter = 100;
  const precision = 1e-7;
  let rate = guess;

  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dNpv = 0;

    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      if (t > 0) {
        dNpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < precision) {
      return rate;
    }

    if (Math.abs(dNpv) < 1e-12) {
      break;
    }

    const newRate = rate - npv / dNpv;
    if (isNaN(newRate) || !isFinite(newRate)) break;
    rate = newRate;
  }

  return null;
}

/**
 * Calcula la TAE real efectiva a partir de flujos de caja reales
 * (teniendo en cuenta comisiones iniciales, seguros vinculados y cuotas).
 * 
 * @param {number} netFinancedCapital - Capital líquido dispuesto
 * @param {number} monthlyPayment - Cuota mensual que se paga
 * @param {number} months - Plazo en meses
 * @param {number} balloonPayment - Cuota final (si existe)
 * @param {number} upfrontFees - Gastos iniciales adicionales (comisión apertura no financiada, seguros obligatorios al contado)
 * @returns {number} TAE en porcentaje (ej: 9.85)
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

  const monthlyIrr = calculateIRR(cashflows, 0.008);
  if (monthlyIrr === null || monthlyIrr < -0.99) {
    return 0;
  }

  const apr = (Math.pow(1 + monthlyIrr, 12) - 1) * 100;
  return Number(apr.toFixed(2));
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
  let high = 0.5;
  let monthlyRate = 0;

  for (let i = 0; i < 80; i++) {
    monthlyRate = (low + high) / 2;
    const calcPayment = calculateMonthlyPayment(principal, monthlyRate * 12 * 100, months, balloonPayment);

    if (Math.abs(calcPayment - monthlyPayment) < 0.001) {
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
