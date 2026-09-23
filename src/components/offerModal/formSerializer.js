/**
 * Serialización pura del formulario de oferta (sin DOM, testeable en Node).
 * - formValuesToOffer: valores del formulario → datos de oferta para guardar.
 * - offerToFormValues: oferta guardada → valores con los que rellenar el formulario.
 */

import { OFFER_MODALITIES, getOfferVehicle, getOfferDisplayTitle } from '../../core/types.js';
import { parseLocaleNumber, formatLocaleNumber } from '../../core/formatters.js';
import { generateId, ID_PREFIX_OFFER, ID_PREFIX_PRODUCT, ID_PREFIX_SERVICE, DEFAULTS } from '../../core/constants.js';
import { getVehicleImageUrl } from '../../core/vehicleCatalog.js';
import { reverseEngineerInterestRate } from '../../core/finance.js';
import { sumLinkedProducts } from '../../core/pricing.js';

/**
 * @typedef {object} OfferFormValues Valores de texto tal y como están en los campos del formulario
 * @property {string} id
 * @property {string} vehicle
 * @property {string} dealer
 * @property {string} notes
 * @property {string} offerPrice
 * @property {string} financeDiscount
 * @property {string} downPayment
 * @property {string} financedAmount
 * @property {string} tradeInValue
 * @property {string} months
 * @property {string} tin
 * @property {string} manualMonthly
 * @property {string} balloonPayment
 * @property {boolean} cancelEarly Cancelación anticipada en financiación flexible
 * @property {string} earlyCancelMonth
 * @property {string} earlyCancelPenalty
 */

/**
 * Convierte el número de meses del formulario en un entero >= 1.
 * @param {string|number} value
 * @param {number} [fallback]
 * @returns {number}
 */
export function parseMonths(value, fallback = DEFAULTS.months) {
  return Math.max(1, Math.round(Number(value) || fallback));
}

/**
 * Capital financiado a partir de los campos del formulario.
 * @param {object} params
 * @param {string|number} params.offerPrice
 * @param {string|number} params.downPayment
 * @param {string|number} params.tradeInValue
 * @param {Array<import('../../core/types.js').LinkedProduct>} params.linkedProducts
 * @returns {number}
 */
export function computeFinancedPrincipal({ offerPrice, downPayment, tradeInValue, linkedProducts }) {
  const price = parseLocaleNumber(offerPrice || 0);
  const down = parseLocaleNumber(downPayment || 0);
  const tradeIn = parseLocaleNumber(tradeInValue || 0);
  return Math.max(0, price - down - tradeIn) + sumLinkedProducts(linkedProducts).financed;
}

/**
 * Capital a financiar antes de restar la entrada (precio - vehículo entregado + productos financiados).
 * @param {object} params
 * @param {string|number} params.offerPrice
 * @param {string|number} params.tradeInValue
 * @param {Array<import('../../core/types.js').LinkedProduct>} params.linkedProducts
 * @returns {number}
 */
export function computeNetBeforeDownPayment({ offerPrice, tradeInValue, linkedProducts }) {
  const price = parseLocaleNumber(offerPrice || 0);
  const tradeIn = parseLocaleNumber(tradeInValue || 0);
  return Math.max(0, price - tradeIn) + sumLinkedProducts(linkedProducts).financed;
}

/**
 * Construye los datos de la oferta a guardar a partir de los valores del formulario.
 * @param {OfferFormValues} values
 * @param {object} ctx
 * @param {string} ctx.modality
 * @param {'tin'|'monthly'|null} ctx.financingMode Campo que manda: TIN o cuota
 * @param {Array<import('../../core/types.js').LinkedProduct>} ctx.linkedProducts
 * @param {Array<import('../../core/types.js').IncludedService>} ctx.includedServices
 * @returns {Partial<import('../../core/types.js').Offer>}
 */
export function formValuesToOffer(values, { modality, financingMode, linkedProducts, includedServices }) {
  const isCash = modality === OFFER_MODALITIES.CASH;
  const isFlexible = modality === OFFER_MODALITIES.FLEXIBLE_FINANCE;
  const cancelEarly = isFlexible && Boolean(values.cancelEarly);
  const isEarlyCancel = modality === OFFER_MODALITIES.EARLY_CANCELLATION || cancelEarly;

  const vName = (values.vehicle || '').trim();
  const offerPrice = parseLocaleNumber(values.offerPrice);
  const financeDiscount = isCash ? 0 : parseLocaleNumber(values.financeDiscount);
  const cashPriceReference = isCash ? offerPrice : offerPrice + financeDiscount;
  const months = parseMonths(values.months);
  const cancelMonth = isEarlyCancel ? parseMonths(values.earlyCancelMonth, DEFAULTS.earlyCancellationMonth) : 0;
  const penaltyRate = isEarlyCancel ? parseLocaleNumber(values.earlyCancelPenalty || '1,0') : 0;
  const balloonPayment = isFlexible ? parseLocaleNumber(values.balloonPayment) : 0;
  const principal = computeFinancedPrincipal({ ...values, linkedProducts });

  let tin = parseLocaleNumber(values.tin);
  let manualMonthlyPayment = values.manualMonthly ? parseLocaleNumber(values.manualMonthly) : null;

  if (!isCash) {
    if (financingMode === 'monthly') {
      const manualVal = parseLocaleNumber(values.manualMonthly);
      if (manualVal > 0) {
        manualMonthlyPayment = manualVal;
        tin = reverseEngineerInterestRate(principal, manualVal, months, balloonPayment).tin;
      } else {
        manualMonthlyPayment = null;
      }
    } else if (financingMode === 'tin') {
      manualMonthlyPayment = null;
    }
  }

  const downPayment = isCash ? 0 : parseLocaleNumber(values.downPayment);
  const financedAmount = isCash ? 0 : (values.financedAmount ? parseLocaleNumber(values.financedAmount) : principal);

  return {
    id: values.id || generateId(ID_PREFIX_OFFER),
    vehicle: vName || 'Vehículo sin especificar',
    imageUrl: getVehicleImageUrl(vName) || '',
    title: getOfferDisplayTitle({ vehicle: vName, modality, months, contractMonths: months, earlyCancellationMonth: cancelMonth, cancelEarly }),
    dealer: (values.dealer || '').trim(),
    notes: (values.notes || '').trim(),
    modality,
    cancelEarly,
    vehiclePrice: offerPrice,
    financeDiscount,
    cashPriceReference,
    offerPrice,
    advertisedDiscount: financeDiscount,
    downPayment,
    financedAmount,
    tradeInValue: parseLocaleNumber(values.tradeInValue),
    months,
    contractMonths: months,
    earlyCancellationMonth: cancelMonth,
    earlyCancellationPenaltyRate: penaltyRate,
    tin,
    manualMonthlyPayment,
    balloonPayment,
    linkedProducts: linkedProducts.map(p => ({ ...p, cost: parseLocaleNumber(p.cost) })),
    includedServices: includedServices.map(s => ({ ...s, marketValue: parseLocaleNumber(s.marketValue) }))
  };
}

/**
 * Calcula los valores con los que rellenar el formulario al editar una oferta guardada.
 * @param {import('../../core/types.js').Offer} offer
 * @returns {{
 *   values: OfferFormValues,
 *   modality: string,
 *   downPaymentMode: 'down'|'financed'|null,
 *   financingMode: 'tin'|'monthly',
 *   linkedProducts: Array<import('../../core/types.js').LinkedProduct>,
 *   includedServices: Array<import('../../core/types.js').IncludedService>
 * }}
 */
export function offerToFormValues(offer) {
  const isCash = offer.modality === OFFER_MODALITIES.CASH;
  const hasOnlyFinancedAmount = Boolean(offer.financedAmount) && (offer.downPayment === undefined || offer.downPayment === null);

  const price = offer.offerPrice || offer.vehiclePrice || offer.cashPriceReference || '';
  const discount = offer.financeDiscount !== undefined
    ? offer.financeDiscount
    : (offer.advertisedDiscount || (offer.cashPriceReference && offer.offerPrice && Number(offer.cashPriceReference) > Number(offer.offerPrice)
      ? Number(offer.cashPriceReference) - Number(offer.offerPrice)
      : ''));

  let downPayment;
  let financedAmount;
  let downPaymentMode;
  if (isCash) {
    downPayment = '0';
    financedAmount = '0';
    downPaymentMode = null;
  } else if (hasOnlyFinancedAmount) {
    downPayment = '';
    financedAmount = formatLocaleNumber(offer.financedAmount);
    downPaymentMode = 'financed';
  } else {
    downPayment = formatLocaleNumber(offer.downPayment || '');
    financedAmount = '';
    downPaymentMode = 'down';
  }

  const hasManualMonthly = Boolean(offer.manualMonthlyPayment);

  return {
    values: {
      id: offer.id,
      vehicle: offer.vehicle || getOfferVehicle(offer) || '',
      dealer: offer.dealer || '',
      notes: offer.notes || '',
      offerPrice: formatLocaleNumber(price),
      financeDiscount: formatLocaleNumber(discount),
      downPayment,
      financedAmount,
      tradeInValue: formatLocaleNumber(offer.tradeInValue || ''),
      months: String(offer.contractMonths || offer.months || DEFAULTS.months),
      tin: hasManualMonthly ? '' : (offer.tin !== undefined ? formatLocaleNumber(offer.tin) : formatLocaleNumber(DEFAULTS.tin)),
      manualMonthly: hasManualMonthly ? formatLocaleNumber(offer.manualMonthlyPayment) : '',
      balloonPayment: offer.balloonPayment ? formatLocaleNumber(offer.balloonPayment) : '',
      cancelEarly: Boolean(offer.cancelEarly),
      earlyCancelMonth: String(offer.earlyCancellationMonth || DEFAULTS.earlyCancellationMonth),
      earlyCancelPenalty: offer.earlyCancellationPenaltyRate !== undefined
        ? formatLocaleNumber(offer.earlyCancellationPenaltyRate)
        : '1,0'
    },
    modality: offer.modality || OFFER_MODALITIES.STANDARD_FINANCE,
    downPaymentMode,
    financingMode: hasManualMonthly ? 'monthly' : 'tin',
    linkedProducts: (offer.linkedProducts || []).map(p => ({ id: p.id || generateId(ID_PREFIX_PRODUCT), ...p })),
    includedServices: Array.isArray(offer.includedServices)
      ? offer.includedServices.map(s => ({ id: s.id || generateId(ID_PREFIX_SERVICE), ...s, marketValue: parseLocaleNumber(s.marketValue) }))
      : []
  };
}
