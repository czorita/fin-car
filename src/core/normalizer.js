/**
 * Normalizador Financiero de Ofertas de Automoción.
 * Convierte cualquier presupuesto (contado, financiado estándar o flexible)
 * en métricas comparables y auditadas: Coste Total Real, Sobrecoste, TAE real y Veredicto.
 */

import { OFFER_MODALITIES } from './types.js';
import { calculateMonthlyPayment, calculateEffectiveApr, reverseEngineerInterestRate, generateAmortizationSchedule, calculateEarlyCancellationSettlement } from './finance.js';
import { generateVerdict } from './verdicts.js';

/**
 * Normaliza una oferta y genera su análisis financiero detallado.
 * @param {import('./types.js').Offer} offer 
 * @returns {NormalizedOffer}
 */
export function normalizeOffer(offer) {
  const isCash = offer.modality === OFFER_MODALITIES.CASH;
  const isFlexible = offer.modality === OFFER_MODALITIES.FLEXIBLE_FINANCE;
  const isEarlyCancellation = offer.modality === OFFER_MODALITIES.EARLY_CANCELLATION;

  // 1. Productos vinculados
  const products = offer.linkedProducts || [];
  const productsFinanced = products
    .filter(p => p.financed)
    .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const productsUpfront = products
    .filter(p => !p.financed)
    .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const totalProductsCost = productsFinanced + productsUpfront;

  // 1b. Servicios adicionales incluidos de serie o bonificados (ej. mantenimiento oficial, seguro, garantía)
  const includedServices = Array.isArray(offer.includedServices) ? offer.includedServices : [];
  const includedServicesValue = includedServices.reduce((sum, s) => sum + (Number(s.marketValue) || 0), 0);

  const tradeInValue = Number(offer.tradeInValue) || 0;

  // Precio del vehículo y descuento por financiar
  const vehiclePrice = Number(offer.vehiclePrice) || Number(offer.cashPriceReference) || Number(offer.offerPrice) || 0;
  let financeDiscount = 0;
  if (!isCash) {
    if (offer.financeDiscount !== undefined) {
      financeDiscount = Number(offer.financeDiscount);
    } else if (offer.advertisedDiscount !== undefined) {
      financeDiscount = Number(offer.advertisedDiscount);
    } else if (offer.cashPriceReference !== undefined && offer.offerPrice !== undefined && Number(offer.cashPriceReference) > Number(offer.offerPrice)) {
      financeDiscount = Number(offer.cashPriceReference) - Number(offer.offerPrice);
    }
  }

  // La resta será el precio con el que se hagan todos los cálculos
  let calculationPrice = isCash ? vehiclePrice : Math.max(0, vehiclePrice - financeDiscount);
  if (offer.offerPrice !== undefined && offer.vehiclePrice === undefined && offer.financeDiscount === undefined) {
    calculationPrice = Number(offer.offerPrice);
  }
  const offerPrice = calculationPrice;
  const cashPriceRef = vehiclePrice;

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
  const downPayment = Number(offer.downPayment) || 0;
  const tin = Number(offer.tin) || 0;

  // Capital base del vehículo a financiar
  const netVehicleToFinance = Math.max(0, offerPrice - downPayment - tradeInValue);
  const financedPrincipal = netVehicleToFinance + productsFinanced;

  let months = Number(offer.months) || 60;
  const contractMonths = Number(offer.contractMonths) || months;
  const cancelMonth = Number(offer.earlyCancellationMonth) || 24;
  const penaltyRate = offer.earlyCancellationPenaltyRate !== undefined ? Number(offer.earlyCancellationPenaltyRate) : 1.0;

  let balloon = isFlexible ? (Number(offer.balloonPayment) || 0) : 0;
  let monthlyPayment = 0;
  let totalInterest = 0;
  let effectiveTin = tin;
  let settlementCapital = 0;
  let cancellationPenalty = 0;
  let finalSettlementPayment = 0;
  let futureInterestSaved = 0;
  let totalInstallments = 0;
  let totalOutOfPocketCost = 0;

  // Desembolso inicial (de tu bolsillo al firmar)
  const initialCashOut = downPayment + productsUpfront;

  if (isEarlyCancellation) {
    if (offer.manualMonthlyPayment && Number(offer.manualMonthlyPayment) > 0) {
      monthlyPayment = Number(offer.manualMonthlyPayment);
      if (effectiveTin <= 0) {
        const rev = reverseEngineerInterestRate(financedPrincipal, monthlyPayment, contractMonths, 0);
        effectiveTin = rev.tin;
      }
    }
    const earlyCalc = calculateEarlyCancellationSettlement(financedPrincipal, effectiveTin, contractMonths, cancelMonth, penaltyRate);
    if (!offer.manualMonthlyPayment || Number(offer.manualMonthlyPayment) <= 0) {
      monthlyPayment = earlyCalc.monthlyPayment;
    }
    totalInterest = earlyCalc.totalInterestPaid;
    settlementCapital = earlyCalc.settlementCapital;
    cancellationPenalty = earlyCalc.penaltyAmount;
    finalSettlementPayment = earlyCalc.finalSettlementPayment;
    futureInterestSaved = earlyCalc.futureInterestSaved;
    months = earlyCalc.cancelMonth;
    totalInstallments = earlyCalc.regularPaymentsTotal;
    balloon = finalSettlementPayment;
    totalOutOfPocketCost = Number((initialCashOut + totalInstallments + finalSettlementPayment).toFixed(2));
  } else if (offer.manualMonthlyPayment && Number(offer.manualMonthlyPayment) > 0) {
    // Si el usuario introdujo manualmente la cuota del concesionario, deducimos el TIN
    monthlyPayment = Number(offer.manualMonthlyPayment);
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

  // TAE real efectiva
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
    ? generateAmortizationSchedule(financedPrincipal, effectiveTin, contractMonths, 0, { cancelMonth, penaltyRate })
    : generateAmortizationSchedule(financedPrincipal, effectiveTin, months, balloon);

  return {
    ...offer,
    vehiclePrice,
    financeDiscount,
    offerPrice,
    cashPriceReference: vehiclePrice,
    isCash: false,
    isEarlyCancellation,
    isFlexible,
    isFlexibleFinance: isFlexible,
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
    balloonPayment: balloon,
    effectiveApr: effectiveApr || Number((effectiveTin * 1.05).toFixed(2)), // Si TAE da 0 aproximar
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
 * Compara un array de ofertas normalizadas y marca los mejores indicadores.
 * @param {NormalizedOffer[]} normalizedOffers 
 * @returns {Array<NormalizedOffer & { bestIn: string[] }>}
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
      badges.push('🏆 Menor coste total');
    }
    if (hasIncludedServices && (offer.adjustedTcoCost ?? offer.totalOutOfPocketCost) === minTcoCost && offer.totalOutOfPocketCost !== minTotalCost) {
      badges.push('💎 Mejor valor equiparado (TCO)');
    }
    if (offer.totalInterest === minInterest && offer.totalInterest > 0) {
      badges.push('📉 Menos intereses pagados');
    }

    return {
      ...offer,
      highlights: badges
    };
  });
}
