/**
 * Motor de Renderizado Compartido (renderEngine).
 * Centraliza la normalización, ranking, gestión de vistas (tarjetas vs tabla),
 * contador, banner de veredicto y sincronización con gráficos analíticos.
 * Elimina la doble normalización (DRY + rendimiento).
 */

import { normalizeOffer, rankOffers } from '../core/normalizer.js';
import { updateVerdictBanner } from '../components/VerdictBanner.js';
import { initTrapGuideModal } from '../components/TrapGuideModal.js';
import { createOfferCardElement } from '../components/OfferCard.js';
import { createComparisonTableElement } from '../components/ComparisonTable.js';
import { renderCostBreakdownChart } from '../components/CostBreakdownChart.js';

/**
 * Crea un renderer de la aplicación configurado para una página específica (main o ejemplos).
 * @param {object} config
 * @param {() => Array<object>} config.getOffers - Función que devuelve el array actual de ofertas
 * @param {() => string} config.getTheme - Función que devuelve 'dark' o 'light'
 * @param {() => string} config.getView - Función que devuelve 'cards' o 'table'
 * @param {HTMLElement} config.offersDisplaySlot - Contenedor principal de la lista/tabla
 * @param {HTMLElement} [config.offersCountLabel] - Elemento donde se muestra el contador
 * @param {HTMLElement} [config.analyticsSection] - Sección del gráfico analítico
 * @param {HTMLCanvasElement} [config.costBreakdownCanvas] - Canvas para el gráfico Chart.js
 * @param {(count: number) => { count: number, label: string }} [config.counterConfig] - Generador de texto de contador
 * @param {(offer: object) => object} [config.getCardHandlers] - Generador de handlers de tarjeta (onEdit, onSchedule, onDelete)
 * @param {(card: HTMLElement, offer: object) => void} [config.onCardCreated] - Hook para inyectar botones adicionales en la tarjeta
 * @param {() => HTMLElement | null} [config.renderEmptyState] - Renderer personalizado cuando no hay ofertas
 * @returns {{ renderApp: () => Array<object>, renderOfferList: (rankedOffers?: Array<object>) => void }}
 */
export function createAppRenderer({
  getOffers,
  getTheme,
  getView,
  offersDisplaySlot,
  offersCountLabel,
  analyticsSection,
  costBreakdownCanvas,
  counterConfig,
  getCardHandlers,
  onCardCreated,
  renderEmptyState
}) {
  const trapGuideCtrl = initTrapGuideModal();

  /**
   * Renderiza la lista o tabla de ofertas a partir de las ofertas ya normalizadas y clasificadas.
   * Evita recalcular normalizeOffer() y rankOffers() por segunda vez.
   * @param {Array<object>} [cachedRanked]
   */
  function renderOfferList(cachedRanked) {
    if (!offersDisplaySlot) return;

    const rankedOffers = cachedRanked || rankOffers(getOffers().map(o => normalizeOffer(o)));
    const bestOffer = rankedOffers.find(o => o.highlights && o.highlights.includes('🏆 Menor Coste Total'));

    if (rankedOffers.length === 0) {
      if (typeof renderEmptyState === 'function') {
        const emptyEl = renderEmptyState();
        if (emptyEl) {
          offersDisplaySlot.replaceChildren(emptyEl);
          return;
        }
      }
      offersDisplaySlot.replaceChildren();
      return;
    }

    if (getView() === 'cards') {
      const grid = document.createElement('div');
      grid.className = 'offers-grid';

      rankedOffers.forEach(offer => {
        const isWinner = Boolean(bestOffer && offer.id === bestOffer.id);
        const handlers = typeof getCardHandlers === 'function' ? getCardHandlers(offer) : {};
        const card = createOfferCardElement(offer, isWinner, handlers);

        if (typeof onCardCreated === 'function') {
          onCardCreated(card, offer);
        }

        grid.appendChild(card);
      });

      offersDisplaySlot.replaceChildren(grid);
    } else {
      const tableElement = createComparisonTableElement(rankedOffers);
      offersDisplaySlot.replaceChildren(tableElement);
    }
  }

  /**
   * Orquestación completa de un ciclo de renderizado.
   * Normaliza una sola vez y pasa la lista calculada a todos los sub-componentes.
   * @returns {Array<object>} Ofertas clasificadas
   */
  function renderApp() {
    const rawOffers = getOffers();
    const normalizedList = rawOffers.map(o => normalizeOffer(o));
    const rankedOffers = rankOffers(normalizedList);

    // 1. Actualizar contador
    if (offersCountLabel) {
      offersCountLabel.replaceChildren();
      const txtNode = document.createTextNode('Mostrando ');
      const countStrong = document.createElement('strong');
      countStrong.textContent = String(rankedOffers.length);

      let suffixText = rankedOffers.length === 1 ? ' oferta registrada' : ' ofertas registradas';
      if (typeof counterConfig === 'function') {
        const custom = counterConfig(rankedOffers.length);
        if (custom?.label) {
          suffixText = custom.label;
        }
      }

      const endTxt = document.createTextNode(suffixText);
      offersCountLabel.appendChild(txtNode);
      offersCountLabel.appendChild(countStrong);
      offersCountLabel.appendChild(endTxt);
    }

    // 2. Actualizar Banner de Veredicto y Guía de Trampa
    updateVerdictBanner(rankedOffers);
    trapGuideCtrl?.update(rankedOffers);

    // 3. Renderizar ofertas (Tarjetas o Tabla) reutilizando rankedOffers
    renderOfferList(rankedOffers);

    // 4. Actualizar sección de gráficos analíticos
    if (rankedOffers.length > 0) {
      if (analyticsSection) analyticsSection.style.display = 'block';
      if (costBreakdownCanvas) {
        renderCostBreakdownChart(costBreakdownCanvas, rankedOffers, getTheme());
      }
    } else {
      if (analyticsSection) analyticsSection.style.display = 'none';
    }

    return rankedOffers;
  }

  return {
    renderApp,
    renderOfferList
  };
}
