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

  // Precio del vehículo y descuento por financiar
  let vehiclePrice = DEFAULTS.cashPriceReference;
  if (overrides.vehiclePrice !== undefined) {
    vehiclePrice = Number(overrides.vehiclePrice);
  } else if (overrides.cashPriceReference !== undefined) {
    vehiclePrice = Number(overrides.cashPriceReference);
  } else if (overrides.offerPrice !== undefined) {
    vehiclePrice = Number(overrides.offerPrice);
  }

  let financeDiscount = 0;
  if (!isCash) {
    if (overrides.financeDiscount !== undefined) {
      financeDiscount = Number(overrides.financeDiscount);
    } else if (overrides.advertisedDiscount !== undefined) {
      financeDiscount = Number(overrides.advertisedDiscount);
    } else if (overrides.cashPriceReference !== undefined && overrides.offerPrice !== undefined && Number(overrides.cashPriceReference) > Number(overrides.offerPrice)) {
      financeDiscount = Number(overrides.cashPriceReference) - Number(overrides.offerPrice);
    } else if (overrides.offerPrice === undefined && overrides.vehiclePrice === undefined) {
      financeDiscount = Math.max(0, DEFAULTS.cashPriceReference - DEFAULTS.offerPrice);
    }
  }

  // La resta es el precio con el que se hacen todos los cálculos
  let calculationPrice = isCash ? vehiclePrice : Math.max(0, vehiclePrice - financeDiscount);
  if (overrides.offerPrice !== undefined && overrides.vehiclePrice === undefined && overrides.financeDiscount === undefined) {
    calculationPrice = Number(overrides.offerPrice);
    if (!isCash && overrides.cashPriceReference !== undefined && Number(overrides.cashPriceReference) > calculationPrice) {
      financeDiscount = Number(overrides.cashPriceReference) - calculationPrice;
      vehiclePrice = Number(overrides.cashPriceReference);
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
    
    // Precios de compra y venta base (la resta vehiclePrice - financeDiscount es offerPrice)
    vehiclePrice,
    financeDiscount,
    cashPriceReference: vehiclePrice,
    offerPrice: calculationPrice,
    downPayment: overrides.downPayment !== undefined 
      ? Number(overrides.downPayment) 
      : (overrides.modality === OFFER_MODALITIES.CASH ? 0 : DEFAULTS.downPayment),
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
