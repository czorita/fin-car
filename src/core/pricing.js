/**
 * Resolución de precios, productos vinculados y entrada/capital financiado.
 * Funciones puras compartidas por `createDefaultOffer` (types.js) y `normalizeOffer` (normalizer.js)
 * para que ambas interpreten una oferta exactamente igual.
 */

// Importación circular segura: OFFER_MODALITIES solo se usa en tiempo de llamada.
import { OFFER_MODALITIES } from './types.js';

/**
 * Indica si un valor está informado (ni `undefined` ni `null`).
 * @param {*} value
 * @returns {boolean}
 */
function isProvided(value) {
  return value !== undefined && value !== null;
}

/**
 * Indica si un producto vinculado se financia dentro del préstamo.
 * Semántica única en toda la app (igual que el formulario): si `financed` no está
 * informado, el producto se considera financiado; solo `financed: false` es pago al contado.
 * @param {{ financed?: boolean }} product
 * @returns {boolean}
 */
export function isProductFinanced(product) {
  return product?.financed !== false;
}

/**
 * Suma el coste de los productos vinculados separando financiados y pagados al contado.
 * @param {Array<{ cost?: number|string, financed?: boolean }>} [products=[]]
 * @returns {{ financed: number, upfront: number, total: number }}
 */
export function sumLinkedProducts(products = []) {
  let financed = 0;
  let upfront = 0;
  for (const product of Array.isArray(products) ? products : []) {
    const cost = Number(product?.cost) || 0;
    if (isProductFinanced(product)) {
      financed += cost;
    } else {
      upfront += cost;
    }
  }
  return { financed, upfront, total: financed + upfront };
}

/**
 * Resuelve los precios de una oferta: precio de oferta (base de cálculo), precio de catálogo,
 * precio contado de referencia y descuento por financiar.
 *
 * Prioridad (financiación): `offerPrice` → `vehiclePrice` → `cashPriceReference` → valores por defecto.
 * En contado, el precio de oferta es el de referencia y no hay descuento por financiar.
 *
 * @param {Object} offer - Oferta (parcial) de entrada
 * @param {Object} [options]
 * @param {{ offerPrice: number, cashPriceReference: number }|null} [options.defaults=null]
 *   Valores a usar cuando no hay ningún precio informado. Si es `null`, los precios quedan a 0.
 * @returns {{ offerPrice: number, vehiclePrice: number, cashPriceReference: number, financeDiscount: number }}
 */
export function resolvePrices(offer = {}, { defaults = null } = {}) {
  if (offer.modality === OFFER_MODALITIES.CASH) {
    const fallback = defaults ? defaults.cashPriceReference : 0;
    const offerPrice = Number(offer.offerPrice ?? offer.vehiclePrice ?? offer.cashPriceReference ?? fallback);
    return { offerPrice, vehiclePrice: offerPrice, cashPriceReference: offerPrice, financeDiscount: 0 };
  }

  const financeDiscount = Number(offer.financeDiscount ?? offer.advertisedDiscount ?? 0);

  if (isProvided(offer.offerPrice)) {
    // Precio de oferta explícito (convención actual del formulario)
    const offerPrice = Number(offer.offerPrice);
    const cashPriceReference = isProvided(offer.cashPriceReference)
      ? Number(offer.cashPriceReference)
      : (isProvided(offer.vehiclePrice) ? Number(offer.vehiclePrice) : offerPrice + financeDiscount);
    const vehiclePrice = isProvided(offer.vehiclePrice) ? Number(offer.vehiclePrice) : cashPriceReference;
    return { offerPrice, vehiclePrice, cashPriceReference, financeDiscount };
  }

  if (isProvided(offer.vehiclePrice)) {
    // Modo legacy: vehiclePrice es el precio de catálogo antes del descuento
    const vehiclePrice = Number(offer.vehiclePrice);
    const offerPrice = Math.max(0, vehiclePrice - financeDiscount);
    const cashPriceReference = isProvided(offer.cashPriceReference) ? Number(offer.cashPriceReference) : vehiclePrice;
    return { offerPrice, vehiclePrice, cashPriceReference, financeDiscount };
  }

  if (isProvided(offer.cashPriceReference)) {
    const cashPriceReference = Number(offer.cashPriceReference);
    const offerPrice = Math.max(0, cashPriceReference - financeDiscount);
    return { offerPrice, vehiclePrice: cashPriceReference, cashPriceReference, financeDiscount };
  }

  if (defaults) {
    const offerPrice = defaults.offerPrice;
    const cashPriceReference = defaults.cashPriceReference;
    return {
      offerPrice,
      vehiclePrice: cashPriceReference,
      cashPriceReference,
      financeDiscount: Math.max(0, cashPriceReference - offerPrice)
    };
  }

  return { offerPrice: 0, vehiclePrice: 0, cashPriceReference: 0, financeDiscount };
}

/**
 * Resuelve la entrada y el capital financiado de una oferta con financiación.
 *
 * - Si hay `downPayment`, manda la entrada y el capital se deriva de ella.
 * - Si solo hay `financedAmount`, la entrada se deduce de él.
 * - Si no hay ninguno, se usa `defaultDownPayment`.
 *
 * @param {Object} params
 * @param {number} params.offerPrice - Precio de oferta (base de cálculo)
 * @param {number} [params.tradeInValue=0] - Valor del vehículo entregado
 * @param {number} [params.productsFinanced=0] - Coste de productos vinculados financiados
 * @param {number|null} [params.downPayment] - Entrada informada
 * @param {number|null} [params.financedAmount] - Capital a financiar informado
 * @param {number} [params.defaultDownPayment=0] - Entrada si no se informa ni entrada ni capital
 * @returns {{ downPayment: number, netVehicleToFinance: number, principal: number, financedAmount: number }}
 *   `principal` es el capital recalculado a partir de la entrada; `financedAmount` respeta el valor
 *   informado si lo hay y, si no, coincide con `principal`.
 */
export function resolveDownPayment({
  offerPrice,
  tradeInValue = 0,
  productsFinanced = 0,
  downPayment,
  financedAmount,
  defaultDownPayment = 0
}) {
  const price = Number(offerPrice) || 0;
  const tradeIn = Number(tradeInValue) || 0;
  const products = Number(productsFinanced) || 0;

  let resolvedDown;
  if (isProvided(downPayment)) {
    resolvedDown = Number(downPayment);
  } else if (isProvided(financedAmount)) {
    resolvedDown = Math.max(0, price - tradeIn + products - Number(financedAmount));
  } else {
    resolvedDown = Number(defaultDownPayment) || 0;
  }

  const netVehicleToFinance = Math.max(0, price - resolvedDown - tradeIn);
  const principal = netVehicleToFinance + products;

  return {
    downPayment: resolvedDown,
    netVehicleToFinance,
    principal,
    financedAmount: isProvided(financedAmount) ? Number(financedAmount) : principal
  };
}
