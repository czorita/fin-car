/**
 * Esqueleto compartido de la aplicación (index.html y ejemplos.html).
 * Localiza los elementos del layout, crea los gestores de tema/pestañas/vistas,
 * el motor de renderizado y el store, y re-renderiza ante cualquier cambio de estado.
 */

import { initThemeManager } from './theme.js';
import { initViewSwitcher } from './viewSwitch.js';
import { initMainTabsNav, MAIN_TABS } from '../components/MainTabsNav.js';
import { createAppRenderer } from './renderEngine.js';
import { createStore } from './store.js';

/**
 * Localiza los elementos del layout principal.
 * @returns {Record<string, HTMLElement|null>}
 */
function queryLayout() {
  const byId = id => document.getElementById(id);
  return {
    // Pestaña 1 (Mismo Vehículo)
    vehicleChipsList: byId('vehicle-chips-list'),
    offersDisplaySlot: byId('offers-display-slot'),
    // Pestaña 2 (Coches Diferentes)
    crossModalitySelector: byId('cross-modality-select'),
    crossModalityField: byId('cross-modality-field'),
    crossDisplaySlot: byId('cross-display-slot'),
    // Compartidos
    analyticsSection: byId('analytics-section'),
    analyticsHeading: byId('analytics-heading'),
    analyticsSubtext: byId('analytics-subtext'),
    costBreakdownCanvas: byId('cost-breakdown-canvas')
  };
}

/**
 * Crea la aplicación: store + gestores de UI + renderizado reactivo.
 * @param {object} options
 * @param {Array<import('../core/types.js').Offer>} [options.initialOffers=[]]
 * @param {(ctx: { store: import('./store.js').Store<import('./renderEngine.js').AppState>, inspectVehicle: (name: string) => void }) => object} options.createCallbacks
 *   Fábrica de callbacks de tarjetas/estados vacíos (recibe el store para leer y actualizar el estado)
 * @returns {{
 *   store: import('./store.js').Store<import('./renderEngine.js').AppState>,
 *   dom: Record<string, HTMLElement|null>,
 *   renderApp: () => void
 * }}
 */
export function createAppShell({ initialOffers = [], createCallbacks }) {
  const dom = queryLayout();
  const store = createStore({
    offers: initialOffers,
    selectedVehicle: null,
    selectedCrossModality: 'cash'
  });

  // renderApp se asigna tras crear el renderer; los gestores lo invocan de forma diferida
  let renderApp = () => {};
  const rerender = () => renderApp();

  const themeManager = initThemeManager({ onChange: rerender });
  // Siempre se arranca mostrando un coche: la comparativa se abre desde el chip "Todos los coches"
  const mainTabsNav = initMainTabsNav({ initialTab: MAIN_TABS.SAME_VEHICLE, onTabChange: rerender });
  const viewSwitcher = initViewSwitcher({
    cardsBtnId: 'view-cards-btn',
    tableBtnId: 'view-table-btn',
    initialView: 'cards',
    onViewChange: rerender
  });

  /**
   * Muestra las ofertas del vehículo indicado (sale de la comparativa entre coches).
   * @param {string} name
   */
  function inspectVehicle(name) {
    // El cambio de pestaña dispara el re-renderizado con el nuevo vehículo
    store.setState({ selectedVehicle: name }, { silent: true });
    mainTabsNav.setActiveTab(MAIN_TABS.SAME_VEHICLE);
  }

  const renderer = createAppRenderer({
    store,
    dom,
    getTheme: () => themeManager.getTheme(),
    getActiveTab: () => mainTabsNav.getActiveTab(),
    getView: () => viewSwitcher.getView(),
    getCrossView: () => viewSwitcher.getView(),
    setActiveTab: tab => mainTabsNav.setActiveTab(tab),
    callbacks: createCallbacks({ store, inspectVehicle })
  });
  renderApp = renderer.renderApp;

  store.subscribe(rerender);

  return { store, dom, renderApp };
}
