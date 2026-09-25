/**
 * Vista de la Pestaña 1: ofertas del mismo vehículo (tarjetas o tabla comparativa).
 */

import { rankOffers, OFFER_HIGHLIGHTS } from '../../core/normalizer.js';
import { filterOffersByVehicle } from '../../core/multiVehicle.js';
import { createOfferCardElement } from '../../components/OfferCard.js';
import { createComparisonTableElement } from '../../components/ComparisonTable.js';
import { getOfferFinanceSubtitle } from '../../core/types.js';
import { el } from '../dom.js';

/**
 * Franja con la conclusión principal: cuál es la mejor opción del coche y cuánto ahorra frente a la siguiente.
 * @param {HTMLElement|null|undefined} banner
 * @param {Array<import('../../core/types.js').NormalizedOffer>} rankedOffers Ofertas ordenadas (la primera es la mejor)
 * @param {import('../../core/types.js').NormalizedOffer|undefined} bestOffer
 * @param {string|null} vehicle
 */
function renderBestOfferBanner(banner, rankedOffers, bestOffer, vehicle) {
  if (!banner) return;
  if (!bestOffer || rankedOffers.length < 2) {
    banner.hidden = true;
    banner.replaceChildren();
    return;
  }

  const runnerUp = rankedOffers
    .filter(o => o.id !== bestOffer.id)
    .reduce((min, o) => (o.totalOutOfPocketCost < min.totalOutOfPocketCost ? o : min));
  const saving = Math.max(0, Math.round(runnerUp.totalOutOfPocketCost - bestOffer.totalOutOfPocketCost));
  const dealer = bestOffer.dealer ? ` en ${bestOffer.dealer}` : '';

  banner.hidden = false;
  banner.replaceChildren(
    el('span', { className: 'best-offer-icon', text: '🏆', attrs: { 'aria-hidden': 'true' } }),
    el('span', {}, [
      `Mejor opción para el ${vehicle || 'coche'}: `,
      el('strong', { text: `${getOfferFinanceSubtitle(bestOffer)}${dealer}` }),
      saving > 0 ? ' — pagas ' : '',
      saving > 0
        ? el('strong', { className: 'highlight-save', text: `${saving.toLocaleString('es-ES')} € menos` })
        : '',
      saving > 0 ? ' que con la siguiente.' : ''
    ])
  );
}

/**
 * Renderiza la vista de la Pestaña 1.
 * @param {object} params
 * @param {object} params.dom Elementos de la pestaña
 * @param {HTMLElement|null} params.dom.displaySlot
 * @param {HTMLElement|null} [params.dom.bestOfferBanner]
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
  const { displaySlot, bestOfferBanner } = dom;
  if (!displaySlot) return [];

  if (normalizedList.length === 0) {
    const emptyEl = callbacks.renderEmptyState?.();
    displaySlot.replaceChildren(...(emptyEl ? [emptyEl] : []));
    renderBestOfferBanner(bestOfferBanner, [], undefined, null);
    return [];
  }

  const rankedVehicleOffers = rankOffers(filterOffersByVehicle(normalizedList, activeVehicle));
  const bestOffer = rankedVehicleOffers.find(o => o.highlights?.includes(OFFER_HIGHLIGHTS.LOWEST_TOTAL_COST));

  renderBestOfferBanner(bestOfferBanner, rankedVehicleOffers, bestOffer, activeVehicle);

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
