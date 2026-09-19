/**
 * Normalizador Financiero de Ofertas de Automoción.
 * Convierte cualquier presupuesto (contado, financiado estándar o flexible)
 * en métricas comparables y auditadas: Coste Total Real, Sobrecoste, TAE real y Veredicto.
 */

import { OFFER_MODALITIES } from './types.js';
import { calculateMonthlyPayment, calculateEffectiveApr, reverseEngineerInterestRate, generateAmortizationSchedule } from './finance.js';
import { generateVerdict } from './verdicts.js';

/**
 * Normaliza una oferta y genera su análisis financiero detallado.
 * @param {import('./types.js').Offer} offer 
 * @returns {NormalizedOffer}
 */
export function normalizeOffer(offer) {
  const isCash = offer.modality === OFFER_MODALITIES.CASH;
  const isFlexible = offer.modality === OFFER_MODALITIES.FLEXIBLE_FINANCE;

  // 1. Productos vinculados
  const products = offer.linkedProducts || [];
  const productsFinanced = products
    .filter(p => p.financed)
    .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const productsUpfront = products
    .filter(p => !p.financed)
    .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
  const totalProductsCost = productsFinanced + productsUpfront;

  const registrationFee = Number(offer.registrationFee) || 0;
  const tradeInValue = Number(offer.tradeInValue) || 0;
  const cashPriceRef = Number(offer.cashPriceReference) || Number(offer.offerPrice) || 0;
  const offerPrice = Number(offer.offerPrice) || 0;

  // Si es contado
  if (isCash) {
    const totalOutofPocket = Math.max(0, offerPrice - tradeInValue + registrationFee + totalProductsCost);
    return {
      ...offer,
      isCash: true,
      downPayment: 0,
      principalFinanced: 0,
      monthlyPayment: 0,
      totalMonths: 0,
      balloonPayment: 0,
      effectiveApr: 0,
      nominalTin: 0,
      totalInterest: 0,
      openingFeeAmount: 0,
      upfrontPayment: totalOutofPocket,
      totalFinancedPayments: 0,
      totalOutOfPocketCost: totalOutofPocket,
      
      // Métricas de comparación
      costBreakdown: {
        vehicleNet: Math.max(0, offerPrice - tradeInValue),
        interests: 0,
        openingFee: 0,
        linkedProducts: totalProductsCost,
        registrationFee: registrationFee
      },
      advertisedDiscount: Math.max(0, cashPriceRef - offerPrice),
      netDifferenceVsCashRef: totalOutofPocket - (cashPriceRef - tradeInValue + registrationFee),
      verdict: generateVerdict({ isCash: true }),
      amortizationSchedule: []
    };
  }

  // Si es financiación (estándar o flexible)
  const downPayment = Number(offer.downPayment) || 0;
  const months = Number(offer.months) || 60;
  const balloon = isFlexible ? (Number(offer.balloonPayment) || 0) : 0;
  const tin = Number(offer.tin) || 0;
  const openingPct = Number(offer.openingFeePercentage) || 0;
  const isOpeningFinanced = Boolean(offer.openingFeeFinanced);

  // Capital base del vehículo a financiar
  const netVehicleToFinance = Math.max(0, offerPrice - downPayment - tradeInValue);

  // Base para calcular la comisión de apertura
  const preOpeningPrincipal = netVehicleToFinance + productsFinanced;
  const openingFeeAmount = Number(((preOpeningPrincipal * openingPct) / 100).toFixed(2));

  let financedPrincipal = preOpeningPrincipal;
  let upfrontOpeningFee = 0;

  if (isOpeningFinanced) {
    financedPrincipal += openingFeeAmount;
  } else {
    upfrontOpeningFee = openingFeeAmount;
  }

  // Cuota mensual
  let monthlyPayment = 0;
  let totalInterest = 0;
  let effectiveTin = tin;

  if (offer.manualMonthlyPayment && Number(offer.manualMonthlyPayment) > 0) {
    // Si el usuario introdujo manualmente la cuota del concesionario, deducimos el TIN
    monthlyPayment = Number(offer.manualMonthlyPayment);
    const rev = reverseEngineerInterestRate(financedPrincipal, monthlyPayment, months, balloon);
    effectiveTin = rev.tin;
    totalInterest = rev.totalInterest;
  } else {
    monthlyPayment = calculateMonthlyPayment(financedPrincipal, tin, months, balloon);
    const totalPayments = (monthlyPayment * months) + balloon;
    totalInterest = Math.max(0, totalPayments - financedPrincipal);
  }

  monthlyPayment = Number(monthlyPayment.toFixed(2));
  totalInterest = Number(totalInterest.toFixed(2));

  // Desembolso inicial (de tu bolsillo al firmar)
  const initialCashOut = downPayment + registrationFee + upfrontOpeningFee + productsUpfront;

  // Pagos futuros
  const totalInstallments = Number((monthlyPayment * months).toFixed(2));
  
  // Coste total según decisión de cuota final
  const willKeepCar = !isFlexible || offer.balloonDecision !== 'return';
  const finalBalloonToPay = willKeepCar ? balloon : 0;
  
  const totalOutOfPocketCost = Number((initialCashOut + totalInstallments + finalBalloonToPay).toFixed(2));

  // TAE real efectiva
  const effectiveApr = calculateEffectiveApr(
    netVehicleToFinance,
    monthlyPayment,
    months,
    balloon,
    upfrontOpeningFee + productsUpfront
  );

  // Desglose de costes
  const costBreakdown = {
    vehicleNet: Math.max(0, offerPrice - tradeInValue),
    interests: totalInterest,
    openingFee: openingFeeAmount,
    linkedProducts: totalProductsCost,
    registrationFee: registrationFee
  };

  // Comparación contra precio contado de referencia
  const baseCashReferenceTotal = Math.max(0, cashPriceRef - tradeInValue + registrationFee);
  const advertisedDiscount = Math.max(0, cashPriceRef - offerPrice); // El descuento que te promete el comercial por financiar
  const financialSurcharge = totalInterest + openingFeeAmount + totalProductsCost; // Todo lo que añades por financiar
  const netDifferenceVsCashRef = Number((totalOutOfPocketCost - baseCashReferenceTotal).toFixed(2));

  // Veredicto
  const verdict = generateVerdict({
    isCash: false,
    netDifferenceVsCashRef,
    advertisedDiscount,
    monthlyPayment
  });

  // Cuadro de amortización
  const amortizationSchedule = generateAmortizationSchedule(financedPrincipal, effectiveTin, months, balloon);

  return {
    ...offer,
    isCash: false,
    principalFinanced: Number(financedPrincipal.toFixed(2)),
    monthlyPayment,
    totalMonths: months,
    balloonPayment: balloon,
    effectiveApr: effectiveApr || Number((effectiveTin * 1.05).toFixed(2)), // Si TAE da 0 aproximar
    nominalTin: effectiveTin,
    totalInterest,
    openingFeeAmount,
    upfrontPayment: initialCashOut,
    totalFinancedPayments: totalInstallments,
    totalOutOfPocketCost,
    costBreakdown,
    advertisedDiscount,
    financialSurcharge,
    netDifferenceVsCashRef,
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

  // Mínimo coste total
  const minTotalCost = Math.min(...normalizedOffers.map(o => o.totalOutOfPocketCost));
  // Menor sobrecoste de intereses
  const minInterest = Math.min(...normalizedOffers.map(o => o.totalInterest));

  return normalizedOffers.map(offer => {
    const badges = [];
    if (offer.totalOutOfPocketCost === minTotalCost) {
      badges.push('🏆 Menor Coste Total');
    }
    if (offer.totalInterest === minInterest && offer.totalInterest > 0) {
      badges.push('📉 Menos Intereses Pagados');
    }

    return {
      ...offer,
      highlights: badges
    };
  });
}
