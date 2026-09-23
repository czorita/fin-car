/**
 * FinCar - Controlador de la Web de Ejemplos
 * Muestra las ofertas de ejemplo precargadas desde el volumen (/app/data/examples)
 * y permite compararlas tanto por modelo de coche como entre coches diferentes.
 */

import './styles/index.css';
import './styles/components.css';
import './styles/comparison.css';

import { fetchExampleOffers, copyExampleToUser } from './services/storage.js';
import { initAmortizationModal } from './components/AmortizationModal.js';
import { initOfferModal } from './components/OfferModal.js';
import { createDefaultOffer } from './core/types.js';
import { getUniqueVehicles } from './core/multiVehicle.js';
import { showToast } from './ui/toast.js';
import { createAppShell } from './ui/appShell.js';
import { el, createIcon } from './ui/dom.js';

import confetti from 'canvas-confetti';

const COPY_ERROR_MESSAGE = 'Copiada localmente. Error al sincronizar con el servidor.';

const amortizationModalCtrl = initAmortizationModal();
// Asignado tras crear la shell (los callbacks de tarjetas se usan sólo tras el primer render)
let offerModalCtrl;

/**
 * Añade a la tarjeta de ejemplo el botón "Guardar en mis ofertas".
 * @param {HTMLElement} card
 * @param {object} offer Oferta normalizada
 * @param {Array<object>} exampleOffers Ofertas de ejemplo originales
 */
function addCopyButton(card, offer, exampleOffers) {
  const actionsFooter = card.querySelector('.card-actions');
  if (!actionsFooter) return;

  const copyBtn = el('button', { className: 'btn btn-primary btn-sm btn-copy-example', attrs: { type: 'button' } }, [
    createIcon('copy'),
    ' Guardar en mis ofertas'
  ]);
  copyBtn.addEventListener('click', async () => {
    const raw = exampleOffers.find(o => o.id === offer.id);
    try {
      await copyExampleToUser(raw || offer);
      showToast(`¡"${offer.title}" copiada a tus presupuestos!`, { type: 'success' });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {
      showToast(COPY_ERROR_MESSAGE, { type: 'error' });
    }
  });

  actionsFooter.insertBefore(copyBtn, actionsFooter.firstChild);
}

const { store, renderApp } = createAppShell({
  createCallbacks: ({ store, inspectVehicle }) => ({
    getCardHandlers: () => ({
      onEdit: (targetOffer) => {
        const { offers, selectedVehicle } = store.getState();
        offerModalCtrl.open(offers.find(o => o.id === targetOffer.id), selectedVehicle);
      },
      onSchedule: (targetOffer) => amortizationModalCtrl.open(targetOffer),
      onDelete: null // Solo lectura para borrado en vista de ejemplos
    }),
    onCardCreated: (card, offer) => addCopyButton(card, offer, store.getState().offers),
    onInspectVehicle: inspectVehicle
  })
});

offerModalCtrl = initOfferModal({
  getKnownVehicles: () => getUniqueVehicles(store.getState().offers).map(v => v.name),
  onSave: async (offerData) => {
    const fullOffer = createDefaultOffer(offerData);
    try {
      await copyExampleToUser(fullOffer);
      showToast('¡Oferta guardada en tus presupuestos personales!', { type: 'success' });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } catch {
      showToast(COPY_ERROR_MESSAGE, { type: 'error' });
    }
  }
});

// Cargar ejemplos del volumen / API
fetchExampleOffers().then(offers => {
  store.setState({ offers });
}).catch(() => renderApp());
