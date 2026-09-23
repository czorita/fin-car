/**
 * Tipos y estructuras de datos para las ofertas de coches.
 */

import { generateId, ID_PREFIX_OFFER, DEFAULTS } from './constants.js';
import { getVehicleImageUrl } from './vehicleCatalog.js';

export { generateId };

export const OFFER_MODALITIES = {
  CASH: 'cash',
  STANDARD_FINANCE: 'standard_finance',
  FLEXIBLE_FINANCE: 'flexible_finance',
  EARLY_CANCELLATION: 'early_cancellation'
};

export const MODALITY_LABELS = {
  [OFFER_MODALITIES.CASH]: 'Pago al contado',
  [OFFER_MODALITIES.STANDARD_FINANCE]: 'Financiación lineal estándar',
  [OFFER_MODALITIES.FLEXIBLE_FINANCE]: 'Financiación flexible (multiopción / balloon)',
  [OFFER_MODALITIES.EARLY_CANCELLATION]: 'Financiación con cancelación anticipada'
};

export const MODALITY_SHORT_NAMES = {
  [OFFER_MODALITIES.CASH]: 'Al contado',
  [OFFER_MODALITIES.STANDARD_FINANCE]: 'Financiación lineal',
  [OFFER_MODALITIES.FLEXIBLE_FINANCE]: 'Compra flexible',
  [OFFER_MODALITIES.EARLY_CANCELLATION]: 'Cancelación anticipada'
};

/**
 * Devuelve el tipo de financiación con los meses (ej. "Al Contado", "Financiación Lineal (60m)").
 * Corresponde a la parte situada a la derecha del guion.
 * @param {Partial<Offer>} offer
 * @returns {string}
 */
export function getOfferFinanceSubtitle(offer) {
  const modality = offer?.modality || OFFER_MODALITIES.STANDARD_FINANCE;
  const modLabel = MODALITY_SHORT_NAMES[modality] || MODALITY_LABELS[modality] || modality;

  if (modality === OFFER_MODALITIES.CASH) {
    return modLabel;
  }
  if (modality === OFFER_MODALITIES.EARLY_CANCELLATION) {
    const cancelMonth = offer?.earlyCancellationMonth || 24;
    const contract = offer?.contractMonths || offer?.months || 84;
    return `Cancelación mes ${cancelMonth} (de ${contract}m)`;
  }
  const months = offer?.months || offer?.totalMonths;
  return months ? `${modLabel} (${months}m)` : modLabel;
}

/**
 * Genera el título descriptivo automático para una oferta:
 * "Nombre del modelo + Tipo de financiación" (ej. "Hyundai Tucson - Financiación Lineal (60m)").
 * @param {Partial<Offer>} offer
 * @returns {string}
 */
export function getOfferDisplayTitle(offer) {
  const vehicle = getOfferVehicle(offer) || 'Vehículo';
  const subtitle = getOfferFinanceSubtitle(offer);
  return `${vehicle} - ${subtitle}`;
}

/**
 * Extrae o infiere el nombre del vehículo a partir del objeto de oferta.
 * Maneja datos legados de forma retrocompatible.
 * @param {Partial<Offer>} offer
 * @returns {string}
 */
export function getOfferVehicle(offer) {
  if (offer?.vehicle && String(offer.vehicle).trim()) {
    return String(offer.vehicle).trim();
  }
  const title = offer?.title ? String(offer.title).trim() : '';
  if (!title) return 'Vehículo sin especificar';

  if (title.includes(' - ')) {
    return title.split(' - ')[0].trim();
  }
  const cleaned = title.replace(/\s+(fin\b.*|contado\b.*|flexible\b.*)/i, '').trim();
  return cleaned || title;
}

/**
 * Crea una oferta con valores por defecto y validación robusta (evitando falsos negativos con valor 0).
 * @param {Partial<Offer>} overrides 
 * @returns {Offer}
 */
export function createDefaultOffer(overrides = {}) {
  const id = overrides.id || generateId(ID_PREFIX_OFFER);
  const vehicle = overrides.vehicle !== undefined && overrides.vehicle !== null && String(overrides.vehicle).trim() !== ''
    ? String(overrides.vehicle).trim()
    : getOfferVehicle(overrides);
  const imageUrl = getVehicleImageUrl(vehicle, overrides.imageUrl);

  const isCash = overrides.modality === OFFER_MODALITIES.CASH;

  // Precios y descuentos
  let offerPrice;
  let vehiclePrice;
  let cashPriceReference;
  let financeDiscount = 0;

  if (isCash) {
    offerPrice = Number(overrides.offerPrice ?? overrides.vehiclePrice ?? overrides.cashPriceReference ?? DEFAULTS.cashPriceReference);
    vehiclePrice = offerPrice;
    cashPriceReference = offerPrice;
    financeDiscount = 0;
  } else if (overrides.offerPrice !== undefined) {
    // Si viene offerPrice explícito (nueva convención o modal):
    offerPrice = Number(overrides.offerPrice);
    financeDiscount = Number(overrides.financeDiscount ?? overrides.advertisedDiscount ?? 0);
    cashPriceReference = overrides.cashPriceReference !== undefined
      ? Number(overrides.cashPriceReference)
      : (overrides.vehiclePrice !== undefined ? Number(overrides.vehiclePrice) : (offerPrice + financeDiscount));
    vehiclePrice = overrides.vehiclePrice !== undefined ? Number(overrides.vehiclePrice) : cashPriceReference;
  } else if (overrides.vehiclePrice !== undefined) {
    // Modo legacy / retrocompatible: vehiclePrice es el precio catálogo pre-descuento
    vehiclePrice = Number(overrides.vehiclePrice);
    financeDiscount = Number(overrides.financeDiscount ?? overrides.advertisedDiscount ?? 0);
    offerPrice = Math.max(0, vehiclePrice - financeDiscount);
    cashPriceReference = overrides.cashPriceReference !== undefined ? Number(overrides.cashPriceReference) : vehiclePrice;
  } else {
    // Valores por defecto
    offerPrice = DEFAULTS.offerPrice;
    cashPriceReference = DEFAULTS.cashPriceReference;
    vehiclePrice = DEFAULTS.cashPriceReference;
    financeDiscount = Math.max(0, cashPriceReference - offerPrice);
  }

  const linkedProducts = overrides.linkedProducts || [];
  const productsFinanced = linkedProducts
    .filter(p => p.financed !== false)
    .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);

  let downPayment = 0;
  let financedAmount = overrides.financedAmount !== undefined && overrides.financedAmount !== null
    ? Number(overrides.financedAmount)
    : null;

  if (!isCash) {
    if (overrides.downPayment !== undefined && overrides.downPayment !== null) {
      downPayment = Number(overrides.downPayment);
      if (financedAmount === null) {
        financedAmount = Math.max(0, offerPrice - downPayment - Number(overrides.tradeInValue || 0) + productsFinanced);
      }
    } else if (financedAmount !== null) {
      const tradeIn = Number(overrides.tradeInValue || 0);
      downPayment = Math.max(0, offerPrice - tradeIn + productsFinanced - financedAmount);
    } else {
      downPayment = DEFAULTS.downPayment;
      financedAmount = Math.max(0, offerPrice - downPayment - Number(overrides.tradeInValue || 0) + productsFinanced);
    }
  }

  return {
    id,
    vehicle,
    imageUrl,
    title: overrides.title || 'Nueva oferta',
    dealer: overrides.dealer || '',
    notes: overrides.notes || '',
    modality: overrides.modality || OFFER_MODALITIES.STANDARD_FINANCE,
    
    // Precios: vehiclePrice (catálogo/referencia) y offerPrice (precio base tras descuento)
    vehiclePrice,
    financeDiscount,
    cashPriceReference,
    offerPrice,
    downPayment,
    financedAmount,
    tradeInValue: overrides.tradeInValue !== undefined 
      ? Number(overrides.tradeInValue) 
      : 0,

    // Parámetros de préstamo
    months: overrides.months !== undefined 
      ? Number(overrides.months) 
      : (overrides.modality === OFFER_MODALITIES.EARLY_CANCELLATION ? DEFAULTS.contractMonths : DEFAULTS.months),
    contractMonths: overrides.contractMonths !== undefined
      ? Number(overrides.contractMonths)
      : (overrides.months !== undefined ? Number(overrides.months) : (overrides.modality === OFFER_MODALITIES.EARLY_CANCELLATION ? DEFAULTS.contractMonths : DEFAULTS.months)),
    tin: overrides.tin !== undefined 
      ? (overrides.tin === null ? null : Number(overrides.tin)) 
      : (overrides.manualMonthlyPayment ? null : DEFAULTS.tin),
    manualMonthlyPayment: overrides.manualMonthlyPayment !== undefined 
      ? (overrides.manualMonthlyPayment === null ? null : Number(overrides.manualMonthlyPayment)) 
      : null,
    
    // Financiación flexible / multiopción
    balloonPayment: overrides.balloonPayment !== undefined 
      ? Number(overrides.balloonPayment) 
      : 0,

    // Financiación con cancelación anticipada (permanencia)
    earlyCancellationMonth: overrides.earlyCancellationMonth !== undefined
      ? Number(overrides.earlyCancellationMonth)
      : DEFAULTS.earlyCancellationMonth,
    earlyCancellationPenaltyRate: overrides.earlyCancellationPenaltyRate !== undefined
      ? Number(overrides.earlyCancellationPenaltyRate)
      : DEFAULTS.earlyCancellationPenaltyRate,

    // Productos obligatorios vinculados a la financiación
    linkedProducts: Array.isArray(overrides.linkedProducts) ? overrides.linkedProducts : [],

    // Servicios adicionales incluidos de serie o bonificados (ej. mantenimiento, seguro, garantía)
    includedServices: Array.isArray(overrides.includedServices) ? overrides.includedServices : [],

    createdAt: overrides.createdAt || new Date().toISOString()
  };
}
