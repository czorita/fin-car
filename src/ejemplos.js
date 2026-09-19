/**
 * AutoCompare PRO - Controlador de la Web de Ejemplos
 * Muestra las 3 ofertas de ejemplo precargadas desde el volumen (/app/data/examples)
 * y permite copiarlas a los presupuestos personales del usuario.
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
import { initThemeManager } from './ui/theme.js';
import { initViewSwitcher } from './ui/viewSwitch.js';
import { showToast } from './ui/toast.js';
import { createAppRenderer } from './ui/renderEngine.js';

import confetti from 'canvas-confetti';

let exampleOffers = [];

// Elementos DOM
const offersDisplaySlot = document.getElementById('offers-display-slot');
const offersCountLabel = document.getElementById('offers-count-label');
const analyticsSection = document.getElementById('analytics-section');
const costBreakdownCanvas = document.getElementById('cost-breakdown-canvas');

const amortizationModalCtrl = initAmortizationModal();

const offerModalCtrl = initOfferModal({
  onSave: async (offerData) => {
    // Al guardar desde ejemplos, se copia como oferta personal
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

// Funciones de renderizado (pre-declaradas para evitar Temporal Dead Zone en callbacks)
let renderApp;
let renderOfferList;

// Gestor de Tema Global
const themeManager = initThemeManager({
  onChange: () => renderApp?.()
});

// Gestor de Vistas (Tarjetas vs Tabla)
const viewSwitcher = initViewSwitcher({
  initialView: 'cards',
  onViewChange: () => renderOfferList?.()
});

// Motor de Renderizado Unificado
const renderer = createAppRenderer({
  getOffers: () => exampleOffers,
  getTheme: () => themeManager.getTheme(),
  getView: () => viewSwitcher.getView(),
  offersDisplaySlot,
  offersCountLabel,
  analyticsSection,
  costBreakdownCanvas,
  counterConfig: () => ({
    label: ' ofertas de ejemplo precargadas'
  }),
  getCardHandlers: () => ({
    onEdit: (targetOffer) => {
      const raw = exampleOffers.find(o => o.id === targetOffer.id);
      offerModalCtrl.open(raw);
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
  }
});
renderApp = renderer.renderApp;
renderOfferList = renderer.renderOfferList;

// Cargar ejemplos del volumen / API
fetchExampleOffers().then(offers => {
  exampleOffers = offers;
  renderApp();
});
