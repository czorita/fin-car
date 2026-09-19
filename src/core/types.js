/**
 * Tipos y estructuras de datos para las ofertas de coches.
 */

import { generateId, ID_PREFIX_OFFER, DEFAULTS } from './constants.js';

export { generateId };

export const OFFER_MODALITIES = {
  CASH: 'cash',
  STANDARD_FINANCE: 'standard_finance',
  FLEXIBLE_FINANCE: 'flexible_finance'
};

export const MODALITY_LABELS = {
  [OFFER_MODALITIES.CASH]: 'Pago al Contado',
  [OFFER_MODALITIES.STANDARD_FINANCE]: 'Financiación Lineal Estándar',
  [OFFER_MODALITIES.FLEXIBLE_FINANCE]: 'Financiación Flexible (Multiopción / Balloon)'
};

/**
 * Crea una oferta con valores por defecto y validación robusta (evitando falsos negativos con valor 0).
 * @param {Partial<Offer>} overrides 
 * @returns {Offer}
 */
export function createDefaultOffer(overrides = {}) {
  const id = overrides.id || generateId(ID_PREFIX_OFFER);

  return {
    id,
    title: overrides.title || 'Nueva Oferta',
    dealer: overrides.dealer || '',
    notes: overrides.notes || '',
    modality: overrides.modality || OFFER_MODALITIES.STANDARD_FINANCE,
    
    // Precios de compra y venta base (comprobación estricta !== undefined para admitir 0)
    cashPriceReference: overrides.cashPriceReference !== undefined 
      ? Number(overrides.cashPriceReference) 
      : DEFAULTS.cashPriceReference,
    offerPrice: overrides.offerPrice !== undefined 
      ? Number(overrides.offerPrice) 
      : DEFAULTS.offerPrice,
    downPayment: overrides.downPayment !== undefined 
      ? Number(overrides.downPayment) 
      : (overrides.modality === OFFER_MODALITIES.CASH ? 0 : DEFAULTS.downPayment),
    tradeInValue: overrides.tradeInValue !== undefined 
      ? Number(overrides.tradeInValue) 
      : 0,
    registrationFee: overrides.registrationFee !== undefined 
      ? Number(overrides.registrationFee) 
      : 0,

    // Parámetros de préstamo
    months: overrides.months !== undefined 
      ? Number(overrides.months) 
      : DEFAULTS.months,
    tin: overrides.tin !== undefined 
      ? Number(overrides.tin) 
      : DEFAULTS.tin,
    manualMonthlyPayment: overrides.manualMonthlyPayment !== undefined 
      ? (overrides.manualMonthlyPayment === null ? null : Number(overrides.manualMonthlyPayment)) 
      : null,
    
    // Financiación flexible / multiopción
    balloonPayment: overrides.balloonPayment !== undefined 
      ? Number(overrides.balloonPayment) 
      : 0,
    balloonDecision: overrides.balloonDecision || 'keep',
    
    // Comisiones
    openingFeePercentage: overrides.openingFeePercentage !== undefined 
      ? Number(overrides.openingFeePercentage) 
      : DEFAULTS.openingFeePercentage,
    openingFeeFinanced: overrides.openingFeeFinanced !== undefined 
      ? Boolean(overrides.openingFeeFinanced) 
      : true,

    // Productos obligatorios vinculados a la financiación
    linkedProducts: Array.isArray(overrides.linkedProducts) ? overrides.linkedProducts : [],

    createdAt: overrides.createdAt || new Date().toISOString()
  };
}
