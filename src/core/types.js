/**
 * Tipos y estructuras de datos para las ofertas de coches.
 */

import { generateId, ID_PREFIX_OFFER, DEFAULTS } from './constants.js';
import { getVehicleImageUrl } from './vehicleCatalog.js';
import { resolvePrices, resolveDownPayment, sumLinkedProducts } from './pricing.js';

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
 * Producto vinculado a la financiación (seguro, pack de mantenimiento...).
 * @typedef {Object} LinkedProduct
 * @property {string} id
 * @property {string} name
 * @property {number} cost
 * @property {boolean} [financed] - Si es `false` se paga al contado; si no está informado, se financia
 * @property {boolean} [required]
 */

/**
 * Servicio incluido de serie o bonificado (mantenimiento, seguro, garantía...).
 * @typedef {Object} IncludedService
 * @property {string} id
 * @property {string} name
 * @property {number} marketValue - Valor de mercado si se contratara por libre
 * @property {string} [category]
 */

/**
 * Oferta de compra tal como la introduce el usuario (o la crea `createDefaultOffer`).
 * @typedef {Object} Offer
 * @property {string} id
 * @property {string} vehicle
 * @property {string} [imageUrl]
 * @property {string} title
 * @property {string} [dealer]
 * @property {string} [notes]
 * @property {string} modality - Uno de OFFER_MODALITIES
 * @property {number} vehiclePrice - Precio de catálogo / referencia
 * @property {number} financeDiscount - Descuento condicionado a financiar
 * @property {number} cashPriceReference - Precio al contado de referencia
 * @property {number} offerPrice - Precio base de cálculo tras descuentos
 * @property {number} downPayment - Entrada
 * @property {number|null} [financedAmount] - Capital a financiar informado
 * @property {number} tradeInValue - Valor del vehículo entregado
 * @property {number} months - Plazo en meses
 * @property {number} contractMonths - Plazo del contrato original (cancelación anticipada)
 * @property {number|null} tin - TIN anual (%)
 * @property {number|null} manualMonthlyPayment - Cuota indicada por el concesionario
 * @property {number} balloonPayment - Cuota final (VFG) en financiación flexible
 * @property {boolean} [cancelEarly] - Compra flexible con cancelación anticipada
 * @property {number} earlyCancellationMonth - Mes de cancelación
 * @property {number} earlyCancellationPenaltyRate - Comisión de cancelación (%)
 * @property {LinkedProduct[]} linkedProducts
 * @property {IncludedService[]} includedServices
 * @property {string} createdAt
 * @property {string} [updatedAt] - Última modificación (storage.js)
 * @property {boolean} [pendingSync] - Pendiente de sincronizar con el servidor (solo caché local)
 * @property {number} [advertisedDiscount] - Alias legado de financeDiscount
 * @property {number} [totalMonths] - Plazo efectivo (presente en ofertas normalizadas)
 * @property {boolean} [isExample] - Oferta de ejemplo precargada
 */

/**
 * Oferta normalizada por `normalizeOffer`: la oferta original más sus métricas comparables.
 * @typedef {Offer & {
 *   isCash: boolean,
 *   isEarlyCancellation: boolean,
 *   isFlexible: boolean,
 *   isFlexibleFinance: boolean,
 *   principalFinanced: number,
 *   monthlyPayment: number,
 *   totalMonths: number,
 *   settlementCapital: number,
 *   cancellationPenalty: number,
 *   finalSettlementPayment: number,
 *   futureInterestSaved: number,
 *   effectiveApr: number|null,
 *   nominalTin: number,
 *   totalInterest: number,
 *   upfrontPayment: number,
 *   totalFinancedPayments: number,
 *   totalOutOfPocketCost: number,
 *   includedServicesValue: number,
 *   adjustedTcoCost: number,
 *   costBreakdown: {
 *     vehicleNet: number,
 *     interests: number,
 *     earlyCancellationPenalty: number,
 *     linkedProducts: number,
 *     includedServicesValue: number
 *   },
 *   advertisedDiscount: number,
 *   financialSurcharge?: number,
 *   netDifferenceVsCashRef: number,
 *   netEquatedDifferenceVsCashRef: number,
 *   baseCashReferenceTotal?: number,
 *   verdict: import('./verdicts.js').Verdict,
 *   amortizationSchedule: Array<Object>
 * }} NormalizedOffer
 * `effectiveApr` es `null` cuando la TAE no puede calcularse (TIR sin solución).
 */

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
    const cancelMonth = offer?.earlyCancellationMonth || DEFAULTS.earlyCancellationMonth;
    const contract = offer?.contractMonths || offer?.months || DEFAULTS.contractMonths;
    return `Cancelación mes ${cancelMonth} (de ${contract}m)`;
  }
  if (modality === OFFER_MODALITIES.FLEXIBLE_FINANCE && offer?.cancelEarly) {
    const cancelMonth = offer?.earlyCancellationMonth || DEFAULTS.earlyCancellationMonth;
    const contract = offer?.contractMonths || offer?.months || DEFAULTS.flexibleContractMonths;
    return `Compra flexible (cancelación mes ${cancelMonth} de ${contract}m)`;
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

  // Precios y descuentos (lógica compartida con normalizeOffer)
  const { offerPrice, vehiclePrice, cashPriceReference, financeDiscount } = resolvePrices(overrides, { defaults: DEFAULTS });

  let downPayment = 0;
  let financedAmount = overrides.financedAmount !== undefined && overrides.financedAmount !== null
    ? Number(overrides.financedAmount)
    : null;

  if (!isCash) {
    const resolved = resolveDownPayment({
      offerPrice,
      tradeInValue: overrides.tradeInValue,
      productsFinanced: sumLinkedProducts(overrides.linkedProducts).financed,
      downPayment: overrides.downPayment,
      financedAmount: overrides.financedAmount,
      defaultDownPayment: DEFAULTS.downPayment
    });
    downPayment = resolved.downPayment;
    financedAmount = resolved.financedAmount;
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
    cancelEarly: Boolean(overrides.cancelEarly),
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
