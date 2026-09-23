/**
 * Normalizador Financiero de Ofertas de Automoción.
 * Convierte cualquier presupuesto (contado, financiado estándar o flexible)
 * en métricas comparables y auditadas: Coste Total Real, Sobrecoste, TAE real y Veredicto.
 */

import { OFFER_MODALITIES } from './types.js';
import { calculateMonthlyPayment, calculateEffectiveApr, reverseEngineerInterestRate, generateAmortizationSchedule, calculateEarlyCancellationSettlement } from './finance.js';
import { generateVerdict } from './verdicts.js';
import { resolvePrices, resolveDownPayment, sumLinkedProducts } from './pricing.js';
import { DEFAULTS } from './constants.js';

/**
 * Normaliza una oferta y genera su análisis financiero detallado.
 * @param {import('./types.js').Offer} offer 
 * @returns {import('./types.js').NormalizedOffer}
 */
export function normalizeOffer(offer) {
  const isCash = offer.modality === OFFER_MODALITIES.CASH;
  const isFlexible = offer.modality === OFFER_MODALITIES.FLEXIBLE_FINANCE;
  const isEarlyCancellation = offer.modality === OFFER_MODALITIES.EARLY_CANCELLATION || (isFlexible && Boolean(offer.cancelEarly));

  // 1. Productos vinculados (indefinido = financiado, igual que el formulario)
  const {
    financed: productsFinanced,
    upfront: productsUpfront,
    total: totalProductsCost
  } = sumLinkedProducts(offer.linkedProducts);

  // 1b. Servicios adicionales incluidos de serie o bonificados (ej. mantenimiento oficial, seguro, garantía)
  const includedServices = Array.isArray(offer.includedServices) ? offer.includedServices : [];
  const includedServicesValue = includedServices.reduce((sum, s) => sum + (Number(s.marketValue) || 0), 0);

  const tradeInValue = Number(offer.tradeInValue) || 0;

  // Precios y descuentos (lógica compartida con createDefaultOffer; sin valores por defecto)
  const {
    offerPrice,
    vehiclePrice,
    cashPriceReference: cashPriceRef,
    financeDiscount
  } = resolvePrices(offer);

  // Si es contado
  if (isCash) {
    const totalOutofPocket = Math.max(0, offerPrice - tradeInValue + totalProductsCost);
    const adjustedTcoCost = Number(Math.max(0, totalOutofPocket - includedServicesValue).toFixed(2));
    const netDifferenceVsCashRef = totalOutofPocket - (cashPriceRef - tradeInValue);
    const netEquatedDifferenceVsCashRef = Number((adjustedTcoCost - (cashPriceRef - tradeInValue)).toFixed(2));

    return {
      ...offer,
      vehiclePrice,
      financeDiscount: 0,
      cashPriceReference: vehiclePrice,
      offerPrice,
      isCash: true,
      isEarlyCancellation: false,
      isFlexible: false,
      isFlexibleFinance: false,
      downPayment: 0,
      principalFinanced: 0,
      monthlyPayment: 0,
      totalMonths: 0,
      contractMonths: 0,
      earlyCancellationMonth: 0,
      earlyCancellationPenaltyRate: 0,
      settlementCapital: 0,
      cancellationPenalty: 0,
      finalSettlementPayment: 0,
      futureInterestSaved: 0,
      balloonPayment: 0,
      effectiveApr: 0,
      nominalTin: 0,
      totalInterest: 0,
      upfrontPayment: totalOutofPocket,
      totalFinancedPayments: 0,
      totalOutOfPocketCost: totalOutofPocket,
      includedServices,
      includedServicesValue,
      adjustedTcoCost,
      
      // Métricas de comparación
      costBreakdown: {
        vehicleNet: Math.max(0, offerPrice - tradeInValue),
        interests: 0,
        earlyCancellationPenalty: 0,
        linkedProducts: totalProductsCost,
        includedServicesValue
      },
      advertisedDiscount: 0,
      netDifferenceVsCashRef,
      netEquatedDifferenceVsCashRef,
      verdict: generateVerdict({ isCash: true, includedServicesValue, netDifferenceVsCashRef, netEquatedDifferenceVsCashRef }),
      amortizationSchedule: []
    };
  }

  // Si es financiación (estándar, flexible o cancelación anticipada)
  // Entrada y capital: el capital se recalcula siempre a partir de la entrada resuelta
  const {
    downPayment,
    netVehicleToFinance,
    principal: financedPrincipal
  } = resolveDownPayment({
    offerPrice,
    tradeInValue,
    productsFinanced,
    downPayment: offer.downPayment,
    financedAmount: offer.financedAmount
  });
  const tin = Number(offer.tin) || 0;

  let months = Number(offer.months) || DEFAULTS.months;
  const contractMonths = Number(offer.contractMonths) || months;
  const cancelMonth = Number(offer.earlyCancellationMonth) || DEFAULTS.earlyCancellationMonth;
  const penaltyRate = offer.earlyCancellationPenaltyRate !== undefined
    ? Number(offer.earlyCancellationPenaltyRate)
    : DEFAULTS.earlyCancellationPenaltyRate;
  const manualMonthlyPayment = Number(offer.manualMonthlyPayment) > 0 ? Number(offer.manualMonthlyPayment) : null;

  const originalBalloon = isFlexible ? (Number(offer.balloonPayment) || 0) : 0;
  let balloon = originalBalloon;
  let monthlyPayment;
  let totalInterest;
  let effectiveTin = tin;
  let settlementCapital = 0;
  let cancellationPenalty = 0;
  let finalSettlementPayment = 0;
  let futureInterestSaved = 0;
  let totalInstallments;
  let totalOutOfPocketCost;

  // Desembolso inicial (de tu bolsillo al firmar)
  const initialCashOut = downPayment + productsUpfront;

  if (isEarlyCancellation) {
    if (manualMonthlyPayment !== null && effectiveTin <= 0) {
      const rev = reverseEngineerInterestRate(financedPrincipal, manualMonthlyPayment, contractMonths, originalBalloon);
      effectiveTin = rev.tin;
    }
    // Con cuota manual, la liquidación (capital pendiente, intereses y totales) se calcula
    // con la cuota que realmente se paga, no con la teórica del TIN.
    const earlyCalc = calculateEarlyCancellationSettlement(
      financedPrincipal,
      effectiveTin,
      contractMonths,
      cancelMonth,
      penaltyRate,
      originalBalloon,
      manualMonthlyPayment
    );
    monthlyPayment = manualMonthlyPayment ?? earlyCalc.monthlyPayment;
    totalInterest = earlyCalc.totalInterestPaid;
    settlementCapital = earlyCalc.settlementCapital;
    cancellationPenalty = earlyCalc.penaltyAmount;
    finalSettlementPayment = earlyCalc.finalSettlementPayment;
    futureInterestSaved = earlyCalc.futureInterestSaved;
    months = earlyCalc.cancelMonth;
    totalInstallments = earlyCalc.regularPaymentsTotal;
    balloon = finalSettlementPayment;
    totalOutOfPocketCost = Number((initialCashOut + totalInstallments + finalSettlementPayment).toFixed(2));
  } else if (manualMonthlyPayment !== null) {
    // Si el usuario introdujo manualmente la cuota del concesionario, deducimos el TIN
    monthlyPayment = manualMonthlyPayment;
    const rev = reverseEngineerInterestRate(financedPrincipal, monthlyPayment, months, balloon);
    effectiveTin = rev.tin;
    totalInterest = rev.totalInterest;
    totalInstallments = Number((monthlyPayment * months).toFixed(2));
    totalOutOfPocketCost = Number((initialCashOut + totalInstallments + balloon).toFixed(2));
  } else {
    monthlyPayment = calculateMonthlyPayment(financedPrincipal, tin, months, balloon);
    const totalPayments = (monthlyPayment * months) + balloon;
    totalInterest = Math.max(0, totalPayments - financedPrincipal);
    totalInstallments = Number((monthlyPayment * months).toFixed(2));
    totalOutOfPocketCost = Number((initialCashOut + totalInstallments + balloon).toFixed(2));
  }

  monthlyPayment = Number(monthlyPayment.toFixed(2));
  totalInterest = Number(totalInterest.toFixed(2));

  // Coste total equiparado (TCO: coste financiero menos el valor de mercado de los servicios incluidos que te ahorras de pagar a mano)
  const adjustedTcoCost = Number(Math.max(0, totalOutOfPocketCost - includedServicesValue).toFixed(2));

  // TAE real efectiva (null si la TIR no tiene solución: no se inventa una aproximación)
  const effectiveApr = calculateEffectiveApr(
    netVehicleToFinance,
    monthlyPayment,
    months,
    balloon,
    productsUpfront
  );

  // Desglose de costes
  const costBreakdown = {
    vehicleNet: Math.max(0, offerPrice - tradeInValue),
    interests: totalInterest,
    earlyCancellationPenalty: cancellationPenalty,
    linkedProducts: totalProductsCost,
    includedServicesValue
  };

  // Comparación contra precio contado de referencia
  const baseCashReferenceTotal = Math.max(0, cashPriceRef - tradeInValue);
  const advertisedDiscount = Math.max(0, cashPriceRef - offerPrice); // El descuento que te promete el comercial por financiar
  const financialSurcharge = totalInterest + totalProductsCost + cancellationPenalty; // Todo lo que añades por financiar
  const netDifferenceVsCashRef = Number((totalOutOfPocketCost - baseCashReferenceTotal).toFixed(2));
  // Diferencia real equiparada (coste financiado vs lo que costaría el coche al contado + pagar esos servicios a mano)
  const netEquatedDifferenceVsCashRef = Number((adjustedTcoCost - baseCashReferenceTotal).toFixed(2));

  // Veredicto
  const verdict = generateVerdict({
    isCash: false,
    isEarlyCancellation,
    cancelMonth: isEarlyCancellation ? months : 0,
    futureInterestSaved,
    cancellationPenalty,
    netDifferenceVsCashRef,
    advertisedDiscount,
    monthlyPayment,
    includedServicesValue,
    netEquatedDifferenceVsCashRef
  });

  // Cuadro de amortización
  const amortizationSchedule = isEarlyCancellation
    ? generateAmortizationSchedule(financedPrincipal, effectiveTin, contractMonths, originalBalloon, { cancelMonth, penaltyRate }, manualMonthlyPayment)
    : generateAmortizationSchedule(financedPrincipal, effectiveTin, months, balloon, null, manualMonthlyPayment);

  return {
    ...offer,
    vehiclePrice,
    financeDiscount,
    offerPrice,
    cashPriceReference: cashPriceRef,
    downPayment,
    financedAmount: Number(financedPrincipal.toFixed(2)),
    isCash: false,
    isEarlyCancellation,
    isFlexible,
    isFlexibleFinance: isFlexible,
    cancelEarly: Boolean(offer.cancelEarly && isFlexible),
    principalFinanced: Number(financedPrincipal.toFixed(2)),
    monthlyPayment,
    totalMonths: months,
    contractMonths,
    earlyCancellationMonth: cancelMonth,
    earlyCancellationPenaltyRate: penaltyRate,
    settlementCapital,
    cancellationPenalty,
    finalSettlementPayment,
    futureInterestSaved,
    balloonPayment: isFlexible ? originalBalloon : balloon,
    effectiveApr,
    nominalTin: effectiveTin,
    tin: effectiveTin,
    totalInterest,
    upfrontPayment: initialCashOut,
    totalFinancedPayments: totalInstallments,
    totalOutOfPocketCost,
    includedServices,
    includedServicesValue,
    adjustedTcoCost,
    costBreakdown,
    advertisedDiscount,
    financialSurcharge,
    netDifferenceVsCashRef,
    netEquatedDifferenceVsCashRef,
    baseCashReferenceTotal,
    verdict,
    amortizationSchedule
  };
}

/**
 * Etiquetas de los indicadores destacados que asigna rankOffers.
 */
export const OFFER_HIGHLIGHTS = {
  LOWEST_TOTAL_COST: '🏆 Menor coste total',
  BEST_TCO: '💎 Mejor valor equiparado (TCO)',
  LEAST_INTEREST: '📉 Menos intereses pagados'
};

/**
 * Compara un array de ofertas normalizadas y marca los mejores indicadores.
 * @param {import('./types.js').NormalizedOffer[]} normalizedOffers
 * @returns {Array<import('./types.js').NormalizedOffer & { highlights: string[] }>}
 */
export function rankOffers(normalizedOffers) {
  if (!normalizedOffers.length) return [];

  // Orden de modalidad: contado → financiación lineal → financiación flexible → cancelación anticipada
  const MODALITY_ORDER = {
    [OFFER_MODALITIES.CASH]: 0,
    [OFFER_MODALITIES.STANDARD_FINANCE]: 1,
    [OFFER_MODALITIES.FLEXIBLE_FINANCE]: 2,
    [OFFER_MODALITIES.EARLY_CANCELLATION]: 3
  };

  const sorted = [...normalizedOffers].sort((a, b) => {
    const orderDiff = (MODALITY_ORDER[a.modality] ?? 99) - (MODALITY_ORDER[b.modality] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    // Dentro de la misma modalidad, ordenar de menos a más meses
    return (a.totalMonths || 0) - (b.totalMonths || 0);
  });

  // Mínimo coste total financiero y mínimo coste equiparado TCO
  const minTotalCost = Math.min(...sorted.map(o => o.totalOutOfPocketCost));
  const minTcoCost = Math.min(...sorted.map(o => o.adjustedTcoCost !== undefined ? o.adjustedTcoCost : o.totalOutOfPocketCost));
  const minInterest = Math.min(...sorted.map(o => o.totalInterest));
  const hasIncludedServices = sorted.some(o => (o.includedServicesValue || 0) > 0);

  return sorted.map(offer => {
    const badges = [];
    if (offer.totalOutOfPocketCost === minTotalCost) {
      badges.push(OFFER_HIGHLIGHTS.LOWEST_TOTAL_COST);
    }
    if (hasIncludedServices && (offer.adjustedTcoCost ?? offer.totalOutOfPocketCost) === minTcoCost && offer.totalOutOfPocketCost !== minTotalCost) {
      badges.push(OFFER_HIGHLIGHTS.BEST_TCO);
    }
    if (offer.totalInterest === minInterest && offer.totalInterest > 0) {
      badges.push(OFFER_HIGHLIGHTS.LEAST_INTEREST);
    }

    return {
      ...offer,
      highlights: badges
    };
  });
}
