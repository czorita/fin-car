/**
 * AutoCompare PRO - Punto de Entrada Principal
 * Arquitectura limpia basada en controladores DOM nativos y plantillas HTML5.
 */

import './styles/index.css';
import './styles/components.css';
import './styles/comparison.css';

import { 
  getStoredOffers, 
  upsertOffer, 
  deleteOffer, 
  resetToSamples, 
  exportOffersAsJson, 
  importOffersFromJson, 
  getSavedTheme, 
  saveTheme 
} from './services/storage.js';

import { normalizeOffer, rankOffers } from './core/normalizer.js';
import { createDefaultOffer } from './core/types.js';

import { initHeader } from './components/Header.js';
import { updateVerdictBanner } from './components/VerdictBanner.js';
import { createOfferCardElement } from './components/OfferCard.js';
import { createComparisonTableElement } from './components/ComparisonTable.js';
import { renderCostBreakdownChart } from './components/CostBreakdownChart.js';
import { initOfferModal } from './components/OfferModal.js';
import { initAmortizationModal } from './components/AmortizationModal.js';
import { initReverseCalcModal } from './components/ReverseCalcModal.js';

import confetti from 'canvas-confetti';

// Estado de la aplicación
let currentTheme = getSavedTheme();
let rawOffers = getStoredOffers();
let currentView = 'cards'; // 'cards' | 'table'

// Inicializar tema en el DOM
document.documentElement.setAttribute('data-theme', currentTheme);

// Referencias a contenedores del layout
const offersDisplaySlot = document.getElementById('offers-display-slot');
const offersCountLabel = document.getElementById('offers-count-label');
const analyticsSection = document.getElementById('analytics-section');
const costBreakdownCanvas = document.getElementById('cost-breakdown-canvas');
const viewCardsBtn = document.getElementById('view-cards-btn');
const viewTableBtn = document.getElementById('view-table-btn');
const fabNewOffer = document.getElementById('fab-new-offer');
const tmplEmptyState = document.getElementById('tmpl-empty-state');

// Inicializar Modales
const offerModalCtrl = initOfferModal({
  onSave: (offerData) => {
    const isNew = !offerData.id;
    const fullOffer = createDefaultOffer(offerData);
    rawOffers = upsertOffer(fullOffer);
    renderApp();
    if (isNew) {
      triggerConfetti();
    }
  }
});

const amortizationModalCtrl = initAmortizationModal();

const reverseCalcModalCtrl = initReverseCalcModal({
  onApplyAsOffer: (computedOffer) => {
    const fullOffer = createDefaultOffer(computedOffer);
    rawOffers = upsertOffer(fullOffer);
    renderApp();
    triggerConfetti();
  }
});

/**
 * Efecto de celebración con confetti
 */
function triggerConfetti() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 }
  });
}

/**
 * Conmutador de tema de la aplicación
 */
function handleToggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  saveTheme(currentTheme);
  document.documentElement.setAttribute('data-theme', currentTheme);
  headerCtrl.updateTheme(currentTheme);
  renderApp();
}

// Inicializar Header
const headerCtrl = initHeader({
  onNewOffer: () => offerModalCtrl.open(null),
  onReverseCalc: () => reverseCalcModalCtrl.open(),
  onExport: () => exportOffersAsJson(),
  onImport: async (file) => {
    try {
      const imported = await importOffersFromJson(file);
      rawOffers = imported;
      renderApp();
      triggerConfetti();
    } catch (err) {
      alert(err.message);
    }
  },
  onResetSamples: () => {
    if (confirm('¿Deseas restaurar las 3 ofertas de ejemplo predeterminadas? Se sobreescribirán las actuales.')) {
      rawOffers = resetToSamples();
      renderApp();
    }
  },
  onToggleTheme: handleToggleTheme,
  currentTheme
});

// Control de Vistas (Tarjetas vs Tabla)
viewCardsBtn?.addEventListener('click', () => {
  currentView = 'cards';
  updateViewButtons();
  renderOfferList();
});

viewTableBtn?.addEventListener('click', () => {
  currentView = 'table';
  updateViewButtons();
  renderOfferList();
});

function updateViewButtons() {
  viewCardsBtn?.classList.toggle('active', currentView === 'cards');
  viewTableBtn?.classList.toggle('active', currentView === 'table');
}

fabNewOffer?.addEventListener('click', () => offerModalCtrl.open(null));

/**
 * Renderiza la lista o tabla de ofertas
 */
function renderOfferList() {
  const normalizedList = rawOffers.map(o => normalizeOffer(o));
  const rankedOffers = rankOffers(normalizedList);
  const bestOffer = rankedOffers.find(o => o.highlights && o.highlights.includes('🏆 Menor Coste Total'));

  if (rankedOffers.length === 0) {
    const clone = tmplEmptyState.content.cloneNode(true);
    const emptyBtn = clone.querySelector('.empty-add-btn');
    emptyBtn?.addEventListener('click', () => offerModalCtrl.open(null));
    offersDisplaySlot.replaceChildren(clone);
    return;
  }

  if (currentView === 'cards') {
    const grid = document.createElement('div');
    grid.className = 'offers-grid';

    rankedOffers.forEach(offer => {
      const isWinner = bestOffer && offer.id === bestOffer.id;
      const card = createOfferCardElement(offer, isWinner, {
        onEdit: (targetOffer) => {
          const raw = rawOffers.find(o => o.id === targetOffer.id);
          offerModalCtrl.open(raw);
        },
        onSchedule: (targetOffer) => {
          amortizationModalCtrl.open(targetOffer);
        },
        onDelete: (targetOffer) => {
          if (confirm(`¿Eliminar la oferta "${targetOffer.title}"?`)) {
            rawOffers = deleteOffer(targetOffer.id);
            renderApp();
          }
        }
      });
      grid.appendChild(card);
    });

    offersDisplaySlot.replaceChildren(grid);
  } else {
    const tableElement = createComparisonTableElement(rankedOffers);
    offersDisplaySlot.replaceChildren(tableElement);
  }
}

/**
 * Renderizado y orquestación general
 */
function renderApp() {
  const normalizedList = rawOffers.map(o => normalizeOffer(o));
  const rankedOffers = rankOffers(normalizedList);

  // 1. Actualizar contador
  if (offersCountLabel) {
    offersCountLabel.replaceChildren();
    const txtNode = document.createTextNode('Mostrando ');
    const countStrong = document.createElement('strong');
    countStrong.textContent = String(rankedOffers.length);
    const endTxt = document.createTextNode(rankedOffers.length === 1 ? ' oferta registrada' : ' ofertas registradas');
    offersCountLabel.appendChild(txtNode);
    offersCountLabel.appendChild(countStrong);
    offersCountLabel.appendChild(endTxt);
  }

  // 2. Actualizar Banner de Veredicto
  updateVerdictBanner(rankedOffers);

  // 3. Renderizar vista de ofertas (Tarjetas o Tabla)
  renderOfferList();

  // 4. Actualizar Analítica y Gráficos
  if (rankedOffers.length > 0) {
    if (analyticsSection) analyticsSection.style.display = 'block';
    if (costBreakdownCanvas) {
      renderCostBreakdownChart(costBreakdownCanvas, rankedOffers, currentTheme);
    }
  } else {
    if (analyticsSection) analyticsSection.style.display = 'none';
  }
}

// Iniciar aplicación
renderApp();
