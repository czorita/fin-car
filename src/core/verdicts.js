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
      badge: 'Pago al contado',
      message: 'Sin intereses ni comisiones de financiación.',
      isWinnerCandidate: true
    };
  }

  if (netDifferenceVsCashRef < 0) {
    return {
      status: 'success',
      badge: 'Ahorro neto',
      message: `Ahorras ${Math.abs(netDifferenceVsCashRef).toLocaleString('es-ES')} € respecto al precio contado de catálogo gracias a las promociones.`
    };
  }

  if (netDifferenceVsCashRef === 0) {
    return {
      status: 'neutral',
      badge: 'Mismo coste que contado',
      message: 'El desembolso total de la financiación equivale exactamente al precio al contado.'
    };
  }

  // Si el descuento inicial es 0 (no hay descuento)
  if (advertisedDiscount <= 0) {
    return {
      status: 'warning',
      badge: 'Sin ventajas',
      message: `La financiación no tiene ventajas: al no haber descuento inicial, terminas pagando ${netDifferenceVsCashRef.toLocaleString('es-ES')} € más que al contado debido a intereses y comisiones.`
    };
  }

  // Si hay descuento inicial y el sobrecoste es asumible
  if (netDifferenceVsCashRef < advertisedDiscount * AFFORDABLE_SURCHARGE_FACTOR) {
    return {
      status: 'info',
      badge: 'Coste asumible',
      message: `Pagas ${netDifferenceVsCashRef.toLocaleString('es-ES')} € de más respecto al contado, pero conservas liquidez con una cuota de ${monthlyPayment.toLocaleString('es-ES')} €/mes.`
    };
  }

  // Si hay descuento inicial pero es ficticio (trampa de financiación)
  return {
    status: 'danger',
    badge: '⚠️ Trampa de financiación',
    message: `El descuento inicial de ${advertisedDiscount.toLocaleString('es-ES')} € es ficticio: terminas pagando ${netDifferenceVsCashRef.toLocaleString('es-ES')} € MÁS que al contado debido a intereses y comisiones.`
  };
}
