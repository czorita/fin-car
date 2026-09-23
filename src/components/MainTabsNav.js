/**
 * Controlador de Pestañas Principales de la Aplicación.
 * Alterna entre:
 * 1. 'same_vehicle': Comparativa de fórmulas de pago para el mismo vehículo.
 * 2. 'cross_vehicle': Comparativa entre diferentes modelos de coches bajo una misma modalidad.
 *
 * Implementa accesibilidad WAI-ARIA (role="tablist", role="tab", role="tabpanel").
 */

const STORAGE_KEY_ACTIVE_TAB = 'fin_car_active_tab_v1';

export const MAIN_TABS = {
  SAME_VEHICLE: 'same_vehicle',
  CROSS_VEHICLE: 'cross_vehicle'
};

/**
 * Inicializa la barra de navegación de pestañas principales.
 * @param {object} options
 * @param {string} [options.initialTab]
 * @param {(tab: string) => void} options.onTabChange
 * @returns {{ getActiveTab: () => string, setActiveTab: (tab: string) => void }}
 */
export function initMainTabsNav({ initialTab, onTabChange } = {}) {
  const btnSame = document.getElementById('tab-btn-same-vehicle');
  const btnCross = document.getElementById('tab-btn-cross-vehicle');
  const panelSame = document.getElementById('tab-same-vehicle-panel');
  const panelCross = document.getElementById('tab-cross-vehicle-panel');

  const savedTab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
  let currentTab = initialTab || savedTab || MAIN_TABS.SAME_VEHICLE;

  function updateUI() {
    const isSame = currentTab === MAIN_TABS.SAME_VEHICLE;

    if (btnSame) {
      btnSame.classList.toggle('active', isSame);
      btnSame.setAttribute('aria-selected', isSame ? 'true' : 'false');
      btnSame.setAttribute('tabindex', isSame ? '0' : '-1');
    }

    if (btnCross) {
      btnCross.classList.toggle('active', !isSame);
      btnCross.setAttribute('aria-selected', !isSame ? 'true' : 'false');
      btnCross.setAttribute('tabindex', !isSame ? '0' : '-1');
    }

    if (panelSame) {
      panelSame.hidden = !isSame;
      panelSame.classList.toggle('active-panel', isSame);
    }

    if (panelCross) {
      panelCross.hidden = isSame;
      panelCross.classList.toggle('active-panel', !isSame);
    }
  }

  function setActiveTab(tab) {
    if (tab !== MAIN_TABS.SAME_VEHICLE && tab !== MAIN_TABS.CROSS_VEHICLE) {
      return;
    }
    currentTab = tab;
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tab);
    updateUI();

    if (typeof onTabChange === 'function') {
      onTabChange(currentTab);
    }
  }

  btnSame?.addEventListener('click', () => setActiveTab(MAIN_TABS.SAME_VEHICLE));
  btnCross?.addEventListener('click', () => setActiveTab(MAIN_TABS.CROSS_VEHICLE));

  // Navegación por teclado accesible (flechas izquierda / derecha)
  const tabsList = document.querySelector('.main-tabs-nav');
  tabsList?.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = currentTab === MAIN_TABS.SAME_VEHICLE ? MAIN_TABS.CROSS_VEHICLE : MAIN_TABS.SAME_VEHICLE;
      setActiveTab(nextTab);
      const nextBtn = nextTab === MAIN_TABS.SAME_VEHICLE ? btnSame : btnCross;
      nextBtn?.focus();
    }
  });

  updateUI();

  return {
    getActiveTab() {
      return currentTab;
    },
    setActiveTab
  };
}
