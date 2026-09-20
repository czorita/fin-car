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
/**
 * Genera el veredicto para una oferta en base a sus métricas normalizadas y servicios incluidos.
 * @param {Object} metrics
 * @param {boolean} metrics.isCash
 * @param {number} [metrics.netDifferenceVsCashRef=0]
 * @param {number} [metrics.advertisedDiscount=0]
 * @param {number} [metrics.monthlyPayment=0]
 * @param {number} [metrics.includedServicesValue=0]
 * @param {number} [metrics.netEquatedDifferenceVsCashRef]
 * @returns {Verdict}
 */
export function generateVerdict({
  isCash,
  netDifferenceVsCashRef = 0,
  advertisedDiscount = 0,
  monthlyPayment = 0,
  includedServicesValue = 0,
  netEquatedDifferenceVsCashRef = undefined
}) {
  const equatedDiff = netEquatedDifferenceVsCashRef !== undefined
    ? netEquatedDifferenceVsCashRef
    : (netDifferenceVsCashRef - includedServicesValue);

  if (isCash) {
    const srvText = includedServicesValue > 0
      ? ` Incluye ${includedServicesValue.toLocaleString('es-ES')} € en servicios bonificados.`
      : '';
    return {
      status: 'neutral',
      badge: 'Pago al contado',
      message: `Sin intereses ni comisiones de financiación.${srvText}`,
      isWinnerCandidate: true
    };
  }

  // 1. Ahorro neto directo en el precio financiado (sin necesitar servicios)
  if (netDifferenceVsCashRef < 0) {
    const srvText = includedServicesValue > 0
      ? ` y además incluye ${includedServicesValue.toLocaleString('es-ES')} € en servicios de serie.`
      : ' gracias a las promociones.';
    return {
      status: 'success',
      badge: 'Ahorro neto',
      message: `Ahorras ${Math.abs(netDifferenceVsCashRef).toLocaleString('es-ES')} € respecto al precio contado de catálogo${srvText}`
    };
  }

  // 2. Ahorro real a igualdad de condiciones (los servicios incluidos superan el sobrecoste de intereses)
  if (equatedDiff < 0 && includedServicesValue > 0) {
    return {
      status: 'success',
      badge: '💎 Ahorro real equiparado',
      message: `Aunque pagas ${netDifferenceVsCashRef.toLocaleString('es-ES')} € más en el préstamo, incluye ${includedServicesValue.toLocaleString('es-ES')} € en servicios (mantenimiento/seguro). Ahorras ${Math.abs(equatedDiff).toLocaleString('es-ES')} € reales frente a pagar al contado y contratar esos servicios por libre.`
    };
  }

  if (netDifferenceVsCashRef === 0 && includedServicesValue === 0) {
    return {
      status: 'neutral',
      badge: 'Mismo coste que contado',
      message: 'El desembolso total de la financiación equivale exactamente al precio al contado.'
    };
  }

  if (equatedDiff === 0 && includedServicesValue > 0) {
    return {
      status: 'neutral',
      badge: 'Coste equiparado al contado',
      message: `El sobrecoste del préstamo (${netDifferenceVsCashRef.toLocaleString('es-ES')} €) queda exactamente compensado por los ${includedServicesValue.toLocaleString('es-ES')} € en servicios incluidos.`
    };
  }

  // 3. Si el descuento inicial es 0 (no hay descuento)
  if (advertisedDiscount <= 0) {
    if (includedServicesValue > 0) {
      return {
        status: 'warning',
        badge: 'Sin descuento inicial',
        message: `Sin descuento por financiar, aunque los ${includedServicesValue.toLocaleString('es-ES')} € en servicios reducen el sobrecoste real a ${equatedDiff.toLocaleString('es-ES')} €.`
      };
    }
    return {
      status: 'warning',
      badge: 'Sin ventajas',
      message: `La financiación no tiene ventajas: al no haber descuento inicial, terminas pagando ${netDifferenceVsCashRef.toLocaleString('es-ES')} € más que al contado debido a intereses y comisiones.`
    };
  }

  // 4. Si el sobrecoste equiparado es asumible
  if (equatedDiff < advertisedDiscount * AFFORDABLE_SURCHARGE_FACTOR) {
    if (includedServicesValue > 0) {
      return {
        status: 'info',
        badge: 'Sobrecoste mitigado por servicios',
        message: `Pagas ${netDifferenceVsCashRef.toLocaleString('es-ES')} € de más en cuotas, pero los ${includedServicesValue.toLocaleString('es-ES')} € en servicios incluidos reducen el sobrecoste real a ${equatedDiff.toLocaleString('es-ES')} € con cuota de ${monthlyPayment.toLocaleString('es-ES')} €/mes.`
      };
    }
    return {
      status: 'info',
      badge: 'Coste asumible',
      message: `Pagas ${netDifferenceVsCashRef.toLocaleString('es-ES')} € de más respecto al contado, pero conservas liquidez con una cuota de ${monthlyPayment.toLocaleString('es-ES')} €/mes.`
    };
  }

  // 5. Si hay descuento inicial pero es ficticio (trampa de financiación)
  if (includedServicesValue > 0) {
    return {
      status: 'danger',
      badge: '⚠️ Trampa de financiación (aún con servicios)',
      message: `El descuento inicial de ${advertisedDiscount.toLocaleString('es-ES')} € es ficticio: pese a incluir ${includedServicesValue.toLocaleString('es-ES')} € en servicios, terminas pagando ${equatedDiff.toLocaleString('es-ES')} € MÁS que al contado y pagando los servicios por libre.`
    };
  }

  return {
    status: 'danger',
    badge: '⚠️ Trampa de financiación',
    message: `El descuento inicial de ${advertisedDiscount.toLocaleString('es-ES')} € es ficticio: terminas pagando ${netDifferenceVsCashRef.toLocaleString('es-ES')} € MÁS que al contado debido a intereses y comisiones.`
  };
}
