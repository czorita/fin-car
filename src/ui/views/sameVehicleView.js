/**
 * Vista de la Pestaña 1: ofertas del mismo vehículo (tarjetas o tabla comparativa).
 */

import { rankOffers, OFFER_HIGHLIGHTS } from '../../core/normalizer.js';
import { filterOffersByVehicle } from '../../core/multiVehicle.js';
import { createOfferCardElement } from '../../components/OfferCard.js';
import { createComparisonTableElement } from '../../components/ComparisonTable.js';
import { el, setVisible } from '../dom.js';

/**
 * Actualiza el contador "Mostrando N ofertas para X (de M en total)".
 * @param {HTMLElement|null} label
 * @param {number} shown
 * @param {string|null} vehicle
 * @param {number} total
 */
function renderCountLabel(label, shown, vehicle, total) {
  if (!label) return;
  if (total === 0) {
    label.replaceChildren('Mostrando ', el('strong', { text: '0' }), ' ofertas');
    return;
  }
  label.replaceChildren(
    'Mostrando ',
    el('strong', { text: String(shown) }),
    ' ofertas para ',
    el('strong', { text: vehicle || 'este vehículo' }),
    ` (de ${total} en total)`
  );
}

/**
 * Renderiza la vista de la Pestaña 1.
 * @param {object} params
 * @param {object} params.dom Elementos de la pestaña
 * @param {HTMLElement|null} params.dom.displaySlot
 * @param {HTMLElement|null} params.dom.countLabel
 * @param {HTMLElement|null} params.dom.btnAddForVehicle
 * @param {Array<import('../../core/types.js').NormalizedOffer>} params.normalizedList
 * @param {string|null} params.activeVehicle
 * @param {'cards'|'table'} params.view
 * @param {object} params.callbacks
 * @param {(offer: object) => object} [params.callbacks.getCardHandlers]
 * @param {(card: HTMLElement, offer: object) => void} [params.callbacks.onCardCreated]
 * @param {(vehicle: string) => void} [params.callbacks.onAddOfferForVehicle]
 * @param {() => Node|null} [params.callbacks.renderEmptyState]
 * @param {{ update: (offers: Array<object>) => void }} [params.trapGuide]
 * @returns {Array<import('../../core/types.js').NormalizedOffer>} Ofertas del vehículo ordenadas
 */
export function renderSameVehicleView({ dom, normalizedList, activeVehicle, view, callbacks = {}, trapGuide }) {
  const { displaySlot, countLabel, btnAddForVehicle } = dom;
  if (!displaySlot) return [];

  if (normalizedList.length === 0) {
    const emptyEl = callbacks.renderEmptyState?.();
    displaySlot.replaceChildren(...(emptyEl ? [emptyEl] : []));
    renderCountLabel(countLabel, 0, null, 0);
    setVisible(btnAddForVehicle, false);
    return [];
  }

  if (btnAddForVehicle) {
    setVisible(btnAddForVehicle, true, 'inline-flex');
    btnAddForVehicle.onclick = () => callbacks.onAddOfferForVehicle?.(activeVehicle);
  }

  const rankedVehicleOffers = rankOffers(filterOffersByVehicle(normalizedList, activeVehicle));
  const bestOffer = rankedVehicleOffers.find(o => o.highlights?.includes(OFFER_HIGHLIGHTS.LOWEST_TOTAL_COST));

  renderCountLabel(countLabel, rankedVehicleOffers.length, activeVehicle, normalizedList.length);

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
      const isWinner = Boolean(bestOffer && offer.id === bestOffer.id);
      const handlers = callbacks.getCardHandlers?.(offer) || {};
      const card = createOfferCardElement(offer, isWinner, handlers);
      callbacks.onCardCreated?.(card, offer);
      grid.appendChild(card);
    });
    displaySlot.replaceChildren(grid);
  } else {
    displaySlot.replaceChildren(createComparisonTableElement(rankedVehicleOffers));
  }

  return rankedVehicleOffers;
}
