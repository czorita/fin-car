/**
 * FinCar - Controlador de la Web de Ejemplos
 * Muestra las ofertas de ejemplo precargadas desde el volumen (/app/data/examples)
 * y permite compararlas tanto por modelo de coche como entre coches diferentes.
 */

import './styles/index.css';
import './styles/components.css';
import './styles/comparison.css';

import { 
  fetchExampleOffers, 
  copyExampleToUser 
} from './services/storage.js';

import { initAmortizationModal } from './components/AmortizationModal.js';
import { initOfferModal } from './components/OfferModal.js';
import { createDefaultOffer } from './core/types.js';
import { getUniqueVehicles } from './core/multiVehicle.js';
import { initThemeManager } from './ui/theme.js';
import { initViewSwitcher } from './ui/viewSwitch.js';
import { initMainTabsNav, MAIN_TABS } from './components/MainTabsNav.js';
import { showToast } from './ui/toast.js';
import { createAppRenderer } from './ui/renderEngine.js';

import confetti from 'canvas-confetti';

let exampleOffers = [];
let selectedVehicle = null;
let selectedCrossModality = 'cash';

// Elementos DOM Pestaña 1
const vehicleChipsList = document.getElementById('vehicle-chips-list');
const offersDisplaySlot = document.getElementById('offers-display-slot');
const offersCountLabel = document.getElementById('offers-count-label');

// Elementos DOM Pestaña 2
const crossModalitySelector = document.getElementById('cross-modality-selector');
const crossDisplaySlot = document.getElementById('cross-display-slot');
const crossCountLabel = document.getElementById('cross-count-label');

// Elementos Compartidos
const analyticsSection = document.getElementById('analytics-section');
const analyticsHeading = document.getElementById('analytics-heading');
const analyticsSubtext = document.getElementById('analytics-subtext');
const costBreakdownCanvas = document.getElementById('cost-breakdown-canvas');

const amortizationModalCtrl = initAmortizationModal();

const offerModalCtrl = initOfferModal({
  getKnownVehicles: () => getUniqueVehicles(exampleOffers).map(v => v.name),
  onSave: async (offerData) => {
    const fullOffer = createDefaultOffer(offerData);
    try {
      await copyExampleToUser(fullOffer);
      showToast('¡Oferta guardada en tus presupuestos personales!', { type: 'success' });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } catch {
      showToast('Copiada localmente. Error al sincronizar con el servidor.', { type: 'danger' });
    }
  }
});

let renderApp;

// Gestor de Tema Global
const themeManager = initThemeManager({
  onChange: () => renderApp?.()
});

// Gestor de Pestañas Principales
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
  getOffers: () => exampleOffers,
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
  btnAddForVehicle: null,
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
      const raw = exampleOffers.find(o => o.id === targetOffer.id);
      offerModalCtrl.open(raw, selectedVehicle);
    },
    onSchedule: (targetOffer) => {
      amortizationModalCtrl.open(targetOffer);
    },
    onDelete: null // Solo lectura para borrado en vista de ejemplos
  }),
  onCardCreated: (card, offer) => {
    const actionsFooter = card.querySelector('.card-actions');
    if (!actionsFooter) return;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-primary btn-sm';
    copyBtn.style.flex = '1.2';
    copyBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      Guardar en mis ofertas
    `;
    copyBtn.addEventListener('click', async () => {
      const raw = exampleOffers.find(o => o.id === offer.id);
      try {
        await copyExampleToUser(raw || offer);
        showToast(`¡"${offer.title}" copiada a tus presupuestos!`, { type: 'success' });
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } catch {
        showToast('Copiada localmente. Error al sincronizar con el servidor.', { type: 'danger' });
      }
    });

    actionsFooter.insertBefore(copyBtn, actionsFooter.firstChild);
  },
  onInspectVehicle: (vName) => {
    selectedVehicle = vName;
    mainTabsNav.setActiveTab(MAIN_TABS.SAME_VEHICLE);
    renderApp();
  }
});
renderApp = renderer.renderApp;

// Cargar ejemplos del volumen / API
fetchExampleOffers().then(offers => {
  exampleOffers = offers;
  renderApp();
});
