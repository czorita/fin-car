/**
 * Motor de Renderizado Unificado (renderEngine).
 * Orquesta el ciclo de renderizado de ambas pestañas a partir del estado del store:
 * - Pestaña 1: Mismo Vehículo (carrusel, tarjetas/tabla y desglose).
 * - Pestaña 2: Coches Diferentes (modalidad cruzada, tarjetas/matriz y comparativa).
 * Cada vista vive en src/ui/views/.
 */

import { normalizeOffer } from '../core/normalizer.js';
import { getUniqueVehicles } from '../core/multiVehicle.js';
import { initTrapGuideModal } from '../components/TrapGuideModal.js';
import { MAIN_TABS } from '../components/MainTabsNav.js';
import { renderVehicleCarousel } from './views/vehicleCarousel.js';
import { renderSameVehicleView } from './views/sameVehicleView.js';
import { renderCrossVehicleView } from './views/crossVehicleView.js';
import { renderAnalyticsView } from './views/analyticsView.js';

/**
 * @typedef {object} AppState
 * @property {Array<import('../core/types.js').Offer>} offers
 * @property {string|null} selectedVehicle
 * @property {string} selectedCrossModality
 */

/**
 * Crea el motor de renderizado configurado para la aplicación.
 * @param {object} config
 * @param {import('./store.js').Store<AppState>} config.store
 * @param {object} config.dom Elementos del layout (ver appShell.js)
 * @param {() => string} config.getTheme
 * @param {() => string} config.getActiveTab
 * @param {() => 'cards'|'table'} config.getView
 * @param {() => 'cards'|'table'} config.getCrossView
 * @param {object} [config.callbacks] Acciones de tarjetas y estados vacíos
 */
export function createAppRenderer({ store, dom, getTheme, getActiveTab, getView, getCrossView, callbacks = {} }) {
  const trapGuide = initTrapGuideModal();

  /**
   * Devuelve el vehículo activo, corrigiendo la selección si ya no existe.
   * @param {Array<{ name: string }>} uniqueVehicles
   * @returns {string|null}
   */
  function resolveActiveVehicle(uniqueVehicles) {
    const selected = store.getState().selectedVehicle;
    const exists = selected && uniqueVehicles.some(v => v.name.toLowerCase() === selected.toLowerCase());
    if (exists || uniqueVehicles.length === 0) return selected;

    const fallback = uniqueVehicles[0].name;
    // Silencioso: estamos dentro del propio renderizado
    store.setState({ selectedVehicle: fallback }, { silent: true });
    return fallback;
  }

  /**
   * Ciclo completo de renderizado sincronizado.
   */
  function renderApp() {
    const { offers, selectedCrossModality } = store.getState();
    const normalizedList = offers.map(o => normalizeOffer(o));
    const uniqueVehicles = getUniqueVehicles(offers);
    const activeVehicle = resolveActiveVehicle(uniqueVehicles);

    renderVehicleCarousel(dom.vehicleChipsList, uniqueVehicles, activeVehicle, name => {
      store.setState({ selectedVehicle: name });
    });

    const rankedVehicleOffers = renderSameVehicleView({
      dom: {
        displaySlot: dom.offersDisplaySlot,
        countLabel: dom.offersCountLabel,
        btnAddForVehicle: dom.btnAddForVehicle
      },
      normalizedList,
      activeVehicle,
      view: getView(),
      callbacks,
      trapGuide
    });

    const modality = selectedCrossModality || 'cash';
    const rankedCrossOffers = renderCrossVehicleView({
      dom: {
        modalitySelector: dom.crossModalitySelector,
        displaySlot: dom.crossDisplaySlot,
        countLabel: dom.crossCountLabel
      },
      normalizedList,
      modality,
      view: getCrossView(),
      callbacks
    });

    const activeTab = getActiveTab() || MAIN_TABS.SAME_VEHICLE;
    renderAnalyticsView({
      dom: {
        section: dom.analyticsSection,
        heading: dom.analyticsHeading,
        subtext: dom.analyticsSubtext,
        canvas: dom.costBreakdownCanvas
      },
      activeTab,
      offers: activeTab === MAIN_TABS.SAME_VEHICLE ? rankedVehicleOffers : rankedCrossOffers,
      activeVehicle,
      modality,
      theme: getTheme()
    });

    return { uniqueVehicles, rankedVehicleOffers, rankedCrossOffers };
  }

  // Botonera de modalidad cruzada
  dom.crossModalitySelector?.addEventListener('click', e => {
    const btn = e.target.closest('.segmented-btn');
    if (btn?.dataset.modality) {
      store.setState({ selectedCrossModality: btn.dataset.modality });
    }
  });

  return { renderApp };
}
