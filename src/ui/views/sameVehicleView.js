/**
 * Vista de la Pestaña 1: ofertas del mismo vehículo (tarjetas o tabla comparativa).
 */

import { rankOffers } from '../../core/normalizer.js';
import { filterOffersByVehicle } from '../../core/multiVehicle.js';
import { createOfferCardElement } from '../../components/OfferCard.js';
import { createComparisonTableElement } from '../../components/ComparisonTable.js';
import { el } from '../dom.js';

/**
 * Renderiza la vista de la Pestaña 1.
 * @param {object} params
 * @param {object} params.dom Elementos de la pestaña
 * @param {HTMLElement|null} params.dom.displaySlot
 * @param {Array<import('../../core/types.js').NormalizedOffer>} params.normalizedList
 * @param {string|null} params.activeVehicle
 * @param {'cards'|'table'} params.view
 * @param {object} params.callbacks
 * @param {(offer: object) => object} [params.callbacks.getCardHandlers]
 * @param {(card: HTMLElement, offer: object) => void} [params.callbacks.onCardCreated]
 * @param {() => Node|null} [params.callbacks.renderEmptyState]
 * @param {{ update: (offers: Array<object>) => void }} [params.trapGuide]
 * @returns {Array<import('../../core/types.js').NormalizedOffer>} Ofertas del vehículo ordenadas
 */
export function renderSameVehicleView({ dom, normalizedList, activeVehicle, view, callbacks = {}, trapGuide }) {
  const { displaySlot } = dom;
  if (!displaySlot) return [];

  if (normalizedList.length === 0) {
    const emptyEl = callbacks.renderEmptyState?.();
    displaySlot.replaceChildren(...(emptyEl ? [emptyEl] : []));
    return [];
  }

  const rankedVehicleOffers = rankOffers(filterOffersByVehicle(normalizedList, activeVehicle));

  // Actualizar modal de trampa (el enlace está en cada tarjeta)
  trapGuide?.update(rankedVehicleOffers);

  if (rankedVehicleOffers.length === 0) {
    displaySlot.replaceChildren(
      el('div', { className: 'empty-slot-message', text: 'No hay ofertas registradas para este coche.' })
    );
    return [];
  }

  if (view === 'cards') {
    const grid = el('div', { className: 'offers-grid' });
    rankedVehicleOffers.forEach(offer => {
      const handlers = callbacks.getCardHandlers?.(offer) || {};
      const card = createOfferCardElement(offer, handlers);
      callbacks.onCardCreated?.(card, offer);
      grid.appendChild(card);
    });
    displaySlot.replaceChildren(grid);
  } else {
    displaySlot.replaceChildren(createComparisonTableElement(rankedVehicleOffers));
  }

  return rankedVehicleOffers;
}
