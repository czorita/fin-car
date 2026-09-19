/**
 * Controlador del Componente Tarjeta de Oferta.
 * Utiliza la plantilla nativa <template id="tmpl-offer-card"> y crea nodos DOM seguros sin innerHTML.
 */

import { MODALITY_LABELS, OFFER_MODALITIES } from '../core/types.js';

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
  row.className = 'spec-row';
  if (options.isEmphasized) {
    row.style.borderTop = '1px solid var(--border-medium)';
    row.style.paddingTop = '0.5rem';
    row.style.marginTop = '0.2rem';
  }

  const lblSpan = document.createElement('span');
  lblSpan.className = 'spec-label';
  lblSpan.textContent = label;
  if (options.isEmphasized) {
    lblSpan.style.fontWeight = '600';
  }

  const valSpan = document.createElement('span');
  valSpan.className = `spec-val ${options.highlightClass || ''}`;
  valSpan.textContent = value;
  if (options.isEmphasized) {
    valSpan.style.fontSize = '0.95rem';
  }

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
export function createOfferCardElement(offer, isWinner, { onEdit, onSchedule, onDelete }) {
  const template = document.getElementById('tmpl-offer-card');
  if (!template) {
    throw new Error('Plantilla #tmpl-offer-card no encontrada en index.html');
  }

  const clone = template.content.cloneNode(true);
  const card = clone.querySelector('.offer-card');
  const isCash = offer.isCash;
  const isFlexible = offer.modality === OFFER_MODALITIES.FLEXIBLE_FINANCE;

  card.dataset.id = offer.id;
  if (isWinner) {
    card.classList.add('is-winner');
  }

  // 1. Badges
  const badgesContainer = card.querySelector('.offer-badges');
  badgesContainer.appendChild(createBadge(MODALITY_LABELS[offer.modality] || 'Oferta', 'badge-neutral'));

  if (isWinner) {
    badgesContainer.appendChild(createBadge('🏆 Mejor Opción Global', 'badge-winner'));
  }

  if (offer.highlights && offer.highlights.length) {
    offer.highlights.forEach(hl => {
      if (!hl.includes('Menor Coste Total')) {
        badgesContainer.appendChild(createBadge(hl, 'badge-info'));
      }
    });
  }

  // 2. Título y Concesionario
  card.querySelector('.offer-title').textContent = offer.title;
  card.querySelector('.dealer-text').textContent = offer.dealer || 'Concesionario sin especificar';

  // 3. Coste Hero
  card.querySelector('.cost-hero-amount').textContent = `${offer.totalOutOfPocketCost.toLocaleString('es-ES')} €`;

  let paymentPlanSubtext = 'Pago único con transferencia bancaria directa';
  if (!isCash) {
    if (isFlexible) {
      paymentPlanSubtext = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas de ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes + Cuota final de ${offer.balloonPayment.toLocaleString('es-ES')} €`;
    } else {
      paymentPlanSubtext = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas de ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes`;
    }
  }
  card.querySelector('.cost-hero-sub').textContent = paymentPlanSubtext;

  // 4. Alerta de Veredicto
  const alertEl = card.querySelector('.card-verdict-alert');
  if (offer.verdict.status === 'danger') alertEl.classList.add('danger');
  else if (offer.verdict.status === 'success') alertEl.classList.add('success');
  else if (offer.verdict.status === 'info') alertEl.classList.add('info');
  else alertEl.classList.add('neutral');

  card.querySelector('.verdict-badge-text').textContent = offer.verdict.badge;
  card.querySelector('.verdict-msg-text').textContent = offer.verdict.message;

  // 5. Lista de especificaciones y métricas
  const specsList = card.querySelector('.offer-specs-list');

  specsList.appendChild(createSpecRow('Precio vehículo ofertado:', `${offer.offerPrice.toLocaleString('es-ES')} €`));

  if (offer.advertisedDiscount > 0) {
    specsList.appendChild(createSpecRow('Descuento anunciado:', `-${offer.advertisedDiscount.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
  }

  if (offer.downPayment > 0) {
    specsList.appendChild(createSpecRow('Entrada aportada:', `${offer.downPayment.toLocaleString('es-ES')} €`));
  }

  if (offer.tradeInValue > 0) {
    specsList.appendChild(createSpecRow('Tasación coche usado:', `-${offer.tradeInValue.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
  }

  if (!isCash) {
    specsList.appendChild(createSpecRow('Capital financiado:', `${offer.principalFinanced.toLocaleString('es-ES')} €`));
    specsList.appendChild(createSpecRow('TIN nominal / TAE real:', `${offer.nominalTin}% TIN / ${offer.effectiveApr}% TAE`));
    specsList.appendChild(createSpecRow('Total intereses banco:', `+${offer.totalInterest.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-trap' }));
    specsList.appendChild(createSpecRow('Comisión de apertura:', `${offer.openingFeeAmount.toLocaleString('es-ES')} € (${offer.openingFeePercentage}%)`));

    if (offer.costBreakdown.linkedProducts > 0) {
      specsList.appendChild(createSpecRow('Seguros y extras obligatorios:', `+${offer.costBreakdown.linkedProducts.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-trap' }));
    }

    if (isFlexible) {
      const decisionLabel = offer.balloonDecision === 'keep' ? 'Quedárselo' : 'Devolverlo';
      specsList.appendChild(createSpecRow('Cuota Final / VFG:', `${offer.balloonPayment.toLocaleString('es-ES')} € (${decisionLabel})`));
    }

    const diffSign = offer.netDifferenceVsCashRef > 0 ? '+' : '';
    const diffClass = offer.netDifferenceVsCashRef > 0 ? 'highlight-trap' : 'highlight-save';
    specsList.appendChild(createSpecRow('Diferencia neta vs Contado:', `${diffSign}${offer.netDifferenceVsCashRef.toLocaleString('es-ES')} €`, { highlightClass: diffClass, isEmphasized: true }));
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

  btnEdit.addEventListener('click', () => onEdit(offer));
  btnDelete.addEventListener('click', () => onDelete(offer));

  if (!isCash && btnSchedule) {
    btnSchedule.style.display = 'inline-flex';
    btnSchedule.addEventListener('click', () => onSchedule(offer));
  }

  return card;
}
