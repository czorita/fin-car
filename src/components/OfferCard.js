/**
 * Controlador del Componente Tarjeta de Oferta.
 * Utiliza la plantilla nativa <template id="tmpl-offer-card"> y crea nodos DOM seguros sin innerHTML.
 */

import { OFFER_MODALITIES, getOfferFinanceSubtitle } from '../core/types.js';
import { formatAprPercent } from '../core/formatters.js';
import { OFFER_HIGHLIGHTS } from '../core/normalizer.js';

/**
 * Crea una fila de especificación en el desglose de la tarjeta.
 * @param {string} label 
 * @param {string} value 
 * @param {object} [options]
 * @param {string} [options.highlightClass]
 * @param {boolean} [options.isEmphasized]
 * @returns {HTMLDivElement}
 */
function createSpecRow(label, value, options = {}) {
  const row = document.createElement('div');
  row.className = options.isEmphasized ? 'spec-row spec-row--emphasized' : 'spec-row';

  const lblSpan = document.createElement('span');
  lblSpan.className = 'spec-label';
  lblSpan.textContent = label;

  const valSpan = document.createElement('span');
  valSpan.className = `spec-val ${options.highlightClass || ''}`.trim();
  valSpan.textContent = value;

  row.appendChild(lblSpan);
  row.appendChild(valSpan);
  return row;
}

/**
 * Crea una insignia (badge) DOM.
 * @param {string} text 
 * @param {string} className 
 * @returns {HTMLSpanElement}
 */
function createBadge(text, className) {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

/**
 * Renderiza una tarjeta de oferta clonando la plantilla HTML5.
 * @param {import('../core/normalizer.js').NormalizedOffer} offer 
 * @param {boolean} isWinner 
 * @param {object} handlers
 * @param {Function} handlers.onEdit
 * @param {Function} handlers.onSchedule
 * @param {Function} handlers.onDelete
 * @returns {HTMLElement} Elemento article listo para insertar en el DOM
 */
export function createOfferCardElement(offer, isWinner, { onEdit, onSchedule, onDelete } = {}) {
  const template = document.getElementById('tmpl-offer-card');
  if (!template) {
    throw new Error('Plantilla #tmpl-offer-card no encontrada en el DOM');
  }

  const clone = template.content.cloneNode(true);
  const card = clone.querySelector('.offer-card');
  const isCash = offer.isCash;
  const isFlexible = offer.modality === OFFER_MODALITIES.FLEXIBLE_FINANCE;
  const isEarlyCancel = offer.modality === OFFER_MODALITIES.EARLY_CANCELLATION;

  card.dataset.id = offer.id;
  if (isWinner) {
    card.classList.add('is-winner');
  }

  // 1. Badges
  const badgesContainer = card.querySelector('.offer-badges');

  if (isWinner) {
    badgesContainer.appendChild(createBadge('🏆 Menor coste', 'badge-winner'));
  }

  if (isEarlyCancel) {
    badgesContainer.appendChild(createBadge(`⚡ Cancelación mes ${offer.earlyCancellationMonth || 24}`, 'badge-info'));
  }

  if (offer.highlights && offer.highlights.length) {
    offer.highlights.forEach(hl => {
      if (hl !== OFFER_HIGHLIGHTS.LOWEST_TOTAL_COST) {
        badgesContainer.appendChild(createBadge(hl, 'badge-info'));
      }
    });
  }

  if (offer.includedServicesValue > 0) {
    badgesContainer.appendChild(createBadge(`🎁 +${offer.includedServicesValue.toLocaleString('es-ES')} € servicios`, 'badge-info'));
  }

  // 2. Título (fórmula de financiación y meses) y Concesionario
  card.querySelector('.offer-title').textContent = getOfferFinanceSubtitle(offer);
  card.querySelector('.dealer-text').textContent = offer.dealer || 'Concesionario sin especificar';

  // 3. Coste Hero
  card.querySelector('.cost-hero-amount').textContent = `${offer.totalOutOfPocketCost.toLocaleString('es-ES')} €`;

  let paymentPlanSubtext = '';
  if (!isCash) {
    if (isEarlyCancel && isFlexible) {
      paymentPlanSubtext = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas de ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes + Finiquito mes ${offer.earlyCancellationMonth}: ${offer.finalSettlementPayment.toLocaleString('es-ES')} € (cuota final cancelada)`;
    } else if (isEarlyCancel) {
      paymentPlanSubtext = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas de ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes + Finiquito mes ${offer.earlyCancellationMonth}: ${offer.finalSettlementPayment.toLocaleString('es-ES')} €`;
    } else if (isFlexible) {
      paymentPlanSubtext = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas de ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes + Cuota final de ${offer.balloonPayment.toLocaleString('es-ES')} €`;
    } else {
      paymentPlanSubtext = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas de ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes`;
    }
  }
  const heroSubEl = card.querySelector('.cost-hero-sub');
  if (heroSubEl) {
    heroSubEl.textContent = paymentPlanSubtext;
    heroSubEl.style.display = paymentPlanSubtext ? 'block' : 'none';
  }

  // 4. Alerta de Veredicto (trampas, costes asumibles o ahorros reales equiparados por servicios)
  const alertEl = card.querySelector('.card-verdict-alert');
  const isTrap = offer.verdict?.status === 'danger';
  const isEquatedSuccess = offer.verdict?.status === 'success' && offer.verdict?.badge?.includes('equiparado');
  const isDirectSuccess = offer.verdict?.status === 'success' && !isEquatedSuccess;
  const isMitigated = offer.verdict?.status === 'info';
  const isNeutralOrWarning = isCash || !offer.verdict || offer.verdict.status === 'neutral' || (offer.verdict.status === 'warning' && !offer.includedServicesValue);

  if ((isNeutralOrWarning || isDirectSuccess) && !isEquatedSuccess) {
    if (alertEl) alertEl.style.display = 'none';
  } else {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.className = 'card-verdict-alert';
      if (isTrap) alertEl.classList.add('danger');
      else if (isMitigated) alertEl.classList.add('info');
      else if (isEquatedSuccess) alertEl.classList.add('success');
      else if (offer.verdict.status === 'warning') alertEl.classList.add('warning');

      card.querySelector('.verdict-badge-text').textContent = offer.verdict.badge;
      card.querySelector('.verdict-msg-text').textContent = offer.verdict.message;

      // Mostrar link al modal de guía de trampa solo para veredictos de trampa
      const trapLinkBtn = card.querySelector('.verdict-trap-link');
      if (trapLinkBtn) {
        if (isTrap) {
          trapLinkBtn.style.display = 'inline-block';
          trapLinkBtn.addEventListener('click', () => {
            const modal = document.getElementById('modal-trap-guide');
            if (modal && typeof modal.showModal === 'function') modal.showModal();
          });
        } else {
          trapLinkBtn.style.display = 'none';
        }
      }
    }
  }

  // 5. Lista de especificaciones y métricas
  const specsList = card.querySelector('.offer-specs-list');

  const vPrice = offer.vehiclePrice || offer.cashPriceReference || offer.offerPrice;
  specsList.appendChild(createSpecRow('Precio del vehículo:', `${vPrice.toLocaleString('es-ES')} €`));

  const disc = offer.financeDiscount !== undefined ? offer.financeDiscount : (offer.advertisedDiscount || 0);
  if (!isCash && disc > 0) {
    specsList.appendChild(createSpecRow('Descuento por financiar:', `-${disc.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
    specsList.appendChild(createSpecRow('Precio base de cálculo:', `${offer.offerPrice.toLocaleString('es-ES')} €`, { isEmphasized: true }));
  }

  if (!isCash && offer.downPayment > 0) {
    specsList.appendChild(createSpecRow('Entrada aportada:', `${offer.downPayment.toLocaleString('es-ES')} €`));
  }

  if (offer.tradeInValue > 0) {
    specsList.appendChild(createSpecRow('Tasación coche usado:', `-${offer.tradeInValue.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
  }

  if (!isCash) {
    specsList.appendChild(createSpecRow('Capital financiado:', `${offer.principalFinanced.toLocaleString('es-ES')} €`));
    specsList.appendChild(createSpecRow('TIN nominal / TAE real:', `${offer.nominalTin}% TIN / ${formatAprPercent(offer.effectiveApr)} TAE`));
    specsList.appendChild(createSpecRow('Total intereses banco:', `+${offer.totalInterest.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-trap' }));

    if (offer.costBreakdown.linkedProducts > 0) {
      specsList.appendChild(createSpecRow('Seguros y extras obligatorios:', `+${offer.costBreakdown.linkedProducts.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-trap' }));
    }

    if (isFlexible && offer.balloonPayment > 0) {
      if (isEarlyCancel) {
        specsList.appendChild(createSpecRow('Cuota final evitada (VFG):', `${offer.balloonPayment.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
      } else {
        specsList.appendChild(createSpecRow('Cuota final / VFG:', `${offer.balloonPayment.toLocaleString('es-ES')} €`));
      }
    }

    if (isEarlyCancel) {
      specsList.appendChild(createSpecRow('Plazo contrato original:', `${offer.contractMonths} meses`));
      specsList.appendChild(createSpecRow(`Capital liquidado (mes ${offer.earlyCancellationMonth}):`, `${offer.settlementCapital.toLocaleString('es-ES')} €`));
      specsList.appendChild(createSpecRow(`Comisión cancelación (${offer.earlyCancellationPenaltyRate}%):`, `+${offer.cancellationPenalty.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-trap' }));
      if (offer.futureInterestSaved > 0) {
        specsList.appendChild(createSpecRow('Intereses evitados (ahorro):', `-${offer.futureInterestSaved.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save', isEmphasized: true }));
      }
    }

    const diffSign = offer.netDifferenceVsCashRef > 0 ? '+' : '';
    const diffClass = offer.netDifferenceVsCashRef > 0 ? 'highlight-trap' : 'highlight-save';
    specsList.appendChild(createSpecRow('Diferencia financiera vs contado:', `${diffSign}${offer.netDifferenceVsCashRef.toLocaleString('es-ES')} €`, { highlightClass: diffClass }));
  }

  if (offer.includedServicesValue > 0) {
    specsList.appendChild(createSpecRow('Servicios incluidos (valor mercado):', `-${offer.includedServicesValue.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
    specsList.appendChild(createSpecRow('Coste total equiparado (TCO):', `${offer.adjustedTcoCost.toLocaleString('es-ES')} €`, { isEmphasized: true, highlightClass: 'highlight-save' }));
    if (!isCash && offer.netEquatedDifferenceVsCashRef !== undefined) {
      const eqSign = offer.netEquatedDifferenceVsCashRef > 0 ? '+' : '';
      const eqClass = offer.netEquatedDifferenceVsCashRef > 0 ? 'highlight-trap' : 'highlight-save';
      specsList.appendChild(createSpecRow('Diferencia real equiparada:', `${eqSign}${offer.netEquatedDifferenceVsCashRef.toLocaleString('es-ES')} €`, { highlightClass: eqClass, isEmphasized: true }));
    }
  }

  // 6. Notas opcionales
  if (offer.notes) {
    const notesBox = card.querySelector('.offer-notes-box');
    notesBox.querySelector('.notes-text').textContent = `"${offer.notes}"`;
    notesBox.style.display = 'block';
  }

  // 7. Botones de acción y eventos
  const btnEdit = card.querySelector('.btn-edit');
  const btnSchedule = card.querySelector('.btn-schedule');
  const btnDelete = card.querySelector('.btn-delete');

  if (typeof onEdit === 'function' && btnEdit) {
    btnEdit.addEventListener('click', () => onEdit(offer));
  } else if (btnEdit) {
    btnEdit.style.display = 'none';
  }

  if (typeof onDelete === 'function' && btnDelete) {
    btnDelete.addEventListener('click', () => onDelete(offer));
  } else if (btnDelete) {
    btnDelete.style.display = 'none';
  }

  if (!isCash && btnSchedule) {
    btnSchedule.style.display = 'inline-flex';
    if (typeof onSchedule === 'function') {
      btnSchedule.addEventListener('click', () => onSchedule(offer));
    }
  }

  return card;
}
