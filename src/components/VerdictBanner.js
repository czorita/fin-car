/**
 * Controlador del Banner de Veredicto.
 * Actualiza los nodos semánticos existentes en index.html de forma segura y tipada.
 */

import { TRAP_THRESHOLD_EUROS } from '../core/constants.js';

/**
 * Actualiza el banner de veredicto con los resultados calculados.
 * @param {Array<import('../core/normalizer.js').NormalizedOffer>} offers 
 */
export function updateVerdictBanner(offers) {
  const banner = document.getElementById('verdict-banner');
  if (!banner) return;

  if (!offers || offers.length < 2) {
    banner.style.display = 'none';
    return;
  }

  // Ordenar de menor a mayor coste total
  const sorted = [...offers].sort((a, b) => a.totalOutOfPocketCost - b.totalOutOfPocketCost);
  const bestOffer = sorted[0];
  const worstOffer = sorted[sorted.length - 1];
  const diffSavings = worstOffer.totalOutOfPocketCost - bestOffer.totalOutOfPocketCost;

  const bestTitleEl = document.getElementById('verdict-best-title');
  const bestSubtextEl = document.getElementById('verdict-best-subtext');
  const savingsAmountEl = document.getElementById('verdict-savings-amount');
  const trapAlertEl = document.getElementById('verdict-trap-alert');
  const trapTextEl = document.getElementById('verdict-trap-text');

  if (bestTitleEl) bestTitleEl.textContent = bestOffer.title;
  if (bestSubtextEl) {
    const paymentMode = bestOffer.isCash ? 'Al contado' : `${bestOffer.monthlyPayment.toLocaleString('es-ES')} €/mes`;
    bestSubtextEl.textContent = `Desembolso total neto de ${bestOffer.totalOutOfPocketCost.toLocaleString('es-ES')} € (${paymentMode}).`;
  }
  if (savingsAmountEl) {
    savingsAmountEl.textContent = diffSavings > 0 ? `+${diffSavings.toLocaleString('es-ES')} €` : '0 €';
  }

  // Comprobar si existe alguna oferta con trampa de financiación o sobrecoste elevado
  const trapOffer = offers.find(o => !o.isCash && o.netDifferenceVsCashRef > TRAP_THRESHOLD_EUROS);
  if (trapAlertEl && trapTextEl) {
    if (trapOffer) {
      if (trapOffer.advertisedDiscount > 0) {
        trapTextEl.textContent = `En la oferta "${trapOffer.title}", los intereses y comisiones superan el descuento inicial, encareciendo el coche en ${trapOffer.netDifferenceVsCashRef.toLocaleString('es-ES')} € respecto al precio contado de catálogo.`;
      } else {
        trapTextEl.textContent = `En la oferta "${trapOffer.title}", la financiación no tiene ventajas y encarece el coche en ${trapOffer.netDifferenceVsCashRef.toLocaleString('es-ES')} € respecto al precio al contado debido a intereses y comisiones.`;
      }
      trapAlertEl.style.display = 'block';
    } else {
      trapAlertEl.style.display = 'none';
    }
  }

  banner.style.display = 'flex';
}
