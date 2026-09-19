/**
 * Generador de veredictos financieros para las ofertas de automoción.
 * Separa la lógica de presentación y evaluación del cálculo matemático puro.
 */

import { AFFORDABLE_SURCHARGE_FACTOR } from './constants.js';

/**
 * @typedef {Object} Verdict
 * @property {'neutral' | 'success' | 'info' | 'danger' | 'warning'} status
 * @property {string} badge
 * @property {string} message
 * @property {boolean} [isWinnerCandidate]
 */

/**
 * Genera el veredicto para una oferta en base a sus métricas normalizadas.
 * @param {Object} metrics
 * @param {boolean} metrics.isCash
 * @param {number} metrics.netDifferenceVsCashRef
 * @param {number} metrics.advertisedDiscount
 * @param {number} metrics.monthlyPayment
 * @returns {Verdict}
 */
export function generateVerdict({ isCash, netDifferenceVsCashRef = 0, advertisedDiscount = 0, monthlyPayment = 0 }) {
  if (isCash) {
    return {
      status: 'neutral',
      badge: 'Pago al Contado',
      message: 'Sin intereses ni comisiones de financiación.',
      isWinnerCandidate: true
    };
  }

  if (netDifferenceVsCashRef <= 0) {
    return {
      status: 'success',
      badge: '¡Financiación Ventajosa!',
      message: `Ahorras ${Math.abs(netDifferenceVsCashRef).toLocaleString('es-ES')} € respecto al precio contado de catálogo gracias a las promociones.`
    };
  }

  if (netDifferenceVsCashRef < advertisedDiscount * AFFORDABLE_SURCHARGE_FACTOR) {
    return {
      status: 'info',
      badge: 'Coste Asumible',
      message: `Pagas ${netDifferenceVsCashRef.toLocaleString('es-ES')} € de más respecto al contado, pero conservas liquidez con una cuota de ${monthlyPayment.toLocaleString('es-ES')} €/mes.`
    };
  }

  return {
    status: 'danger',
    badge: '⚠️ Trampa de Financiación',
    message: `El descuento inicial de ${advertisedDiscount.toLocaleString('es-ES')} € es ficticio: terminas pagando ${netDifferenceVsCashRef.toLocaleString('es-ES')} € MÁS que al contado debido a intereses y comisiones.`
  };
}
