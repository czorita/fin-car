/**
 * AutoCompare PRO - Punto de Entrada Principal
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
import { initThemeManager } from './ui/theme.js';
import { initViewSwitcher } from './ui/viewSwitch.js';
import { showToast } from './ui/toast.js';
import { createAppRenderer } from './ui/renderEngine.js';

import { initHeader } from './components/Header.js';
import { initOfferModal } from './components/OfferModal.js';
import { initAmortizationModal } from './components/AmortizationModal.js';
import { initReverseCalcModal } from './components/ReverseCalcModal.js';

import confetti from 'canvas-confetti';

// Estado de ofertas
let rawOffers = getStoredOffers();

// Contenedores del layout
const offersDisplaySlot = document.getElementById('offers-display-slot');
const offersCountLabel = document.getElementById('offers-count-label');
const analyticsSection = document.getElementById('analytics-section');
const costBreakdownCanvas = document.getElementById('cost-breakdown-canvas');
const fabNewOffer = document.getElementById('fab-new-offer');
const tmplEmptyState = document.getElementById('tmpl-empty-state');

// Modales
const amortizationModalCtrl = initAmortizationModal();

const offerModalCtrl = initOfferModal({
  onSave: async (offerData) => {
    const isNew = !offerData.id;
    const fullOffer = createDefaultOffer(offerData);
    try {
      rawOffers = await upsertOffer(fullOffer);
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
    const fullOffer = createDefaultOffer(computedOffer);
    try {
      rawOffers = await upsertOffer(fullOffer);
      renderApp();
      showToast('Presupuesto inverso añadido a tus ofertas.', { type: 'success' });
      triggerConfetti();
    } catch {
      showToast('Guardado localmente. Error al sincronizar con el servidor.', { type: 'danger' });
    }
  }
});

// Gestor de Tema Global
const themeManager = initThemeManager({
  onChange: () => renderApp()
});

// Gestor de Vistas (Tarjetas vs Tabla)
const viewSwitcher = initViewSwitcher({
  initialView: 'cards',
  onViewChange: () => renderOfferList()
});

// Motor de Renderizado Unificado
const { renderApp, renderOfferList } = createAppRenderer({
  getOffers: () => rawOffers,
  getTheme: () => themeManager.getTheme(),
  getView: () => viewSwitcher.getView(),
  offersDisplaySlot,
  offersCountLabel,
  analyticsSection,
  costBreakdownCanvas,
  counterConfig: (count) => ({
    count,
    label: count === 1 ? ' oferta registrada' : ' ofertas registradas'
  }),
  getCardHandlers: () => ({
    onEdit: (targetOffer) => {
      const raw = rawOffers.find(o => o.id === targetOffer.id);
      offerModalCtrl.open(raw);
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
  renderEmptyState: () => {
    if (!tmplEmptyState) return null;
    const clone = tmplEmptyState.content.cloneNode(true);
    const emptyBtn = clone.querySelector('.empty-add-btn');
    emptyBtn?.addEventListener('click', () => offerModalCtrl.open(null));
    return clone;
  }
});

// Acciones del Header
initHeader({
  onNewOffer: () => offerModalCtrl.open(null),
  onReverseCalc: () => reverseCalcModalCtrl.open()
});

fabNewOffer?.addEventListener('click', () => offerModalCtrl.open(null));

function triggerConfetti() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 }
  });
}

// Carga de inicio limpia: sincroniza primero con la API para evitar doble render
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
