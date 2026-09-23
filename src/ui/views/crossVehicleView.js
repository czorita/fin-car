/**
 * Vista de la Pestaña 2: comparativa entre coches diferentes bajo una misma modalidad.
 */

import { MODALITY_LABELS } from '../../core/types.js';
import { getCrossVehicleOffers, rankCrossVehicleOffers } from '../../core/multiVehicle.js';
import { createCrossVehicleCardElement } from '../../components/CrossVehicleCard.js';
import { createCrossVehicleTableElement } from '../../components/CrossVehicleTable.js';
import { el } from '../dom.js';

/**
 * Crea el aviso de "sin ofertas para esta modalidad".
 * @param {string} modLabel
 * @returns {HTMLElement}
 */
function createNoOffersForModalityBanner(modLabel) {
  return el('div', { className: 'cross-empty-banner' }, [
    el('div', { className: 'cross-empty-icon', text: '🔍', attrs: { 'aria-hidden': 'true' } }),
    el('h4', { className: 'cross-empty-title', text: `Sin ofertas de ${modLabel} entre tus coches` }),
    el('p', { className: 'cross-empty-text' }, [
      'Ninguno de tus vehículos registrados tiene actualmente una oferta bajo esta modalidad. ',
      'Selecciona otra modalidad (como ',
      el('strong', { text: 'Al contado' }),
      ' o ',
      el('strong', { text: 'Financiación lineal' }),
      ') o añade un presupuesto para evaluarlo.'
    ])
  ]);
}

/**
 * Renderiza la vista de la Pestaña 2.
 * @param {object} params
 * @param {object} params.dom
 * @param {HTMLElement|null} params.dom.modalitySelector
 * @param {HTMLElement|null} params.dom.displaySlot
 * @param {HTMLElement|null} params.dom.countLabel
 * @param {Array<import('../../core/types.js').NormalizedOffer>} params.normalizedList
 * @param {string} params.modality
 * @param {'cards'|'table'} params.view
 * @param {object} params.callbacks
 * @param {(offer: object) => object} [params.callbacks.getCardHandlers]
 * @param {(vehicle: string) => void} [params.callbacks.onInspectVehicle]
 * @param {() => Node|null} [params.callbacks.renderEmptyState]
 * @returns {Array<object>} Ofertas cruzadas ordenadas
 */
export function renderCrossVehicleView({ dom, normalizedList, modality, view, callbacks = {} }) {
  const { modalitySelector, displaySlot, countLabel } = dom;
  if (!displaySlot) return [];

  modalitySelector?.querySelectorAll('.segmented-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.modality === modality);
  });

  if (normalizedList.length === 0) {
    const emptyEl = callbacks.renderEmptyState?.();
    displaySlot.replaceChildren(...(emptyEl ? [emptyEl] : []));
    countLabel?.replaceChildren('Comparando ', el('strong', { text: '0' }), ' vehículos');
    return [];
  }

  const { rankedOffers } = rankCrossVehicleOffers(getCrossVehicleOffers(normalizedList, modality));
  const modLabel = MODALITY_LABELS[modality] || modality;

  countLabel?.replaceChildren(
    'Comparando ',
    el('strong', { text: String(rankedOffers.length) }),
    ' vehículos bajo modalidad ',
    el('em', { text: modLabel })
  );

  if (rankedOffers.length === 0) {
    displaySlot.replaceChildren(createNoOffersForModalityBanner(modLabel));
    return [];
  }

  if (view === 'cards') {
    const grid = el('div', { className: 'offers-grid' });
    rankedOffers.forEach((offer, idx) => {
      const isWinner = idx === 0 && rankedOffers.length > 1;
      grid.appendChild(createCrossVehicleCardElement(offer, isWinner, {
        allRankedOffers: rankedOffers,
        onInspectVehicle: (vName) => callbacks.onInspectVehicle?.(vName),
        onEditOffer: (target) => callbacks.getCardHandlers?.(target)?.onEdit?.(target)
      }));
    });
    displaySlot.replaceChildren(grid);
  } else {
    displaySlot.replaceChildren(createCrossVehicleTableElement(rankedOffers));
  }

  return rankedOffers;
}
