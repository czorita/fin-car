/**
 * FinCar - Punto de Entrada Principal
 * Arquitectura limpia basada en controladores DOM nativos y motor de renderizado compartido.
 */

import './styles/index.css';
import './styles/components.css';
import './styles/comparison.css';

import { 
  getStoredOffers, 
  fetchUserOffers,
  upsertOffer, 
  deleteOffer 
} from './services/storage.js';

import { createDefaultOffer } from './core/types.js';
import { getUniqueVehicles } from './core/multiVehicle.js';
import { initThemeManager } from './ui/theme.js';
import { initViewSwitcher } from './ui/viewSwitch.js';
import { initMainTabsNav, MAIN_TABS } from './components/MainTabsNav.js';
import { showToast } from './ui/toast.js';
import { createAppRenderer } from './ui/renderEngine.js';

import { initHeader } from './components/Header.js';
import { initOfferModal } from './components/OfferModal.js';
import { initAmortizationModal } from './components/AmortizationModal.js';
import { initReverseCalcModal } from './components/ReverseCalcModal.js';

import confetti from 'canvas-confetti';

// Estado de la aplicación
let rawOffers = getStoredOffers();
let selectedVehicle = null;
let selectedCrossModality = 'cash';

// Contenedores del layout Pestaña 1 (Mismo Vehículo)
const vehicleChipsList = document.getElementById('vehicle-chips-list');
const offersDisplaySlot = document.getElementById('offers-display-slot');
const offersCountLabel = document.getElementById('offers-count-label');
const btnAddForVehicle = document.getElementById('btn-add-for-vehicle');

// Contenedores del layout Pestaña 2 (Coches Diferentes)
const crossModalitySelector = document.getElementById('cross-modality-selector');
const crossDisplaySlot = document.getElementById('cross-display-slot');
const crossCountLabel = document.getElementById('cross-count-label');

// Contenedores Compartidos
const analyticsSection = document.getElementById('analytics-section');
const analyticsHeading = document.getElementById('analytics-heading');
const analyticsSubtext = document.getElementById('analytics-subtext');
const costBreakdownCanvas = document.getElementById('cost-breakdown-canvas');
const fabNewOffer = document.getElementById('fab-new-offer');
const tmplEmptyState = document.getElementById('tmpl-empty-state');

// Modales
const amortizationModalCtrl = initAmortizationModal();

const offerModalCtrl = initOfferModal({
  getKnownVehicles: () => getUniqueVehicles(rawOffers).map(v => v.name),
  onSave: async (offerData) => {
    const isNew = !offerData.id;
    const fullOffer = createDefaultOffer(offerData);
    try {
      rawOffers = await upsertOffer(fullOffer);
      selectedVehicle = fullOffer.vehicle;
      renderApp();
      showToast(isNew ? '¡Nueva oferta guardada correctamente!' : 'Oferta actualizada con éxito.', { type: 'success' });
      if (isNew) {
        triggerConfetti();
      }
    } catch {
      showToast('Guardado localmente. Error al sincronizar con el servidor.', { type: 'danger' });
    }
  }
});

const reverseCalcModalCtrl = initReverseCalcModal({
  onApplyAsOffer: async (computedOffer) => {
    const fullOffer = createDefaultOffer({
      ...computedOffer,
      vehicle: selectedVehicle || 'Nuevo vehículo'
    });
    try {
      rawOffers = await upsertOffer(fullOffer);
      selectedVehicle = fullOffer.vehicle;
      renderApp();
      showToast('Presupuesto inverso añadido a tus ofertas.', { type: 'success' });
      triggerConfetti();
    } catch {
      showToast('Guardado localmente. Error al sincronizar con el servidor.', { type: 'danger' });
    }
  }
});

let renderApp;

// Gestor de Tema Global
const themeManager = initThemeManager({
  onChange: () => renderApp?.()
});

// Gestor de Pestañas Principales (Mismo Vehículo vs Coches Diferentes)
const mainTabsNav = initMainTabsNav({
  onTabChange: () => renderApp?.()
});

// Gestor de Vistas Pestaña 1 (Tarjetas vs Tabla)
const viewSwitcher = initViewSwitcher({
  cardsBtnId: 'view-cards-btn',
  tableBtnId: 'view-table-btn',
  initialView: 'cards',
  onViewChange: () => renderApp?.()
});

// Gestor de Vistas Pestaña 2 (Tarjetas vs Tabla)
const crossViewSwitcher = initViewSwitcher({
  cardsBtnId: 'cross-view-cards-btn',
  tableBtnId: 'cross-view-table-btn',
  initialView: 'cards',
  onViewChange: () => renderApp?.()
});

// Motor de Renderizado Unificado
const renderer = createAppRenderer({
  getOffers: () => rawOffers,
  getTheme: () => themeManager.getTheme(),
  getActiveTab: () => mainTabsNav.getActiveTab(),
  getView: () => viewSwitcher.getView(),
  getCrossView: () => crossViewSwitcher.getView(),
  getSelectedVehicle: () => selectedVehicle,
  setSelectedVehicle: (v) => { selectedVehicle = v; },
  getSelectedCrossModality: () => selectedCrossModality,
  setSelectedCrossModality: (m) => { selectedCrossModality = m; },
  // Pestaña 1
  vehicleChipsList,
  offersDisplaySlot,
  offersCountLabel,
  btnAddForVehicle,
  // Pestaña 2
  crossModalitySelector,
  crossDisplaySlot,
  crossCountLabel,
  // Compartidos
  analyticsSection,
  analyticsHeading,
  analyticsSubtext,
  costBreakdownCanvas,
  getCardHandlers: () => ({
    onEdit: (targetOffer) => {
      const raw = rawOffers.find(o => o.id === targetOffer.id);
      offerModalCtrl.open(raw, selectedVehicle);
    },
    onSchedule: (targetOffer) => {
      amortizationModalCtrl.open(targetOffer);
    },
    onDelete: async (targetOffer) => {
      if (confirm(`¿Eliminar la oferta "${targetOffer.title}"?`)) {
        try {
          rawOffers = await deleteOffer(targetOffer.id);
          renderApp();
          showToast(`Oferta "${targetOffer.title}" eliminada.`, { type: 'info' });
        } catch {
          showToast('Eliminada localmente. Error al sincronizar con el servidor.', { type: 'danger' });
        }
      }
    }
  }),
  onInspectVehicle: (vName) => {
    selectedVehicle = vName;
    mainTabsNav.setActiveTab(MAIN_TABS.SAME_VEHICLE);
    renderApp();
  },
  onAddOfferForVehicle: (vName) => {
    offerModalCtrl.open(null, vName);
  },
  renderEmptyState: () => {
    if (!tmplEmptyState) return null;
    const clone = tmplEmptyState.content.cloneNode(true);
    const emptyBtn = clone.querySelector('.empty-add-btn');
    emptyBtn?.addEventListener('click', () => offerModalCtrl.open(null, selectedVehicle));
    return clone;
  }
});
renderApp = renderer.renderApp;

// Acciones del Header
initHeader({
  onNewOffer: () => offerModalCtrl.open(null, selectedVehicle),
  onReverseCalc: () => reverseCalcModalCtrl.open()
});

fabNewOffer?.addEventListener('click', () => offerModalCtrl.open(null, selectedVehicle));

function triggerConfetti() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 }
  });
}

// Carga de inicio
if (rawOffers.length > 0) {
  renderApp();
} else if (offersDisplaySlot) {
  offersDisplaySlot.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">Cargando presupuestos...</div>';
}

fetchUserOffers().then(offers => {
  rawOffers = offers;
  renderApp();
}).catch(() => {
  renderApp();
});
