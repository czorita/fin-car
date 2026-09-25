/**
 * FinCar - Punto de Entrada Principal
 * Presupuestos del usuario: persistencia (storage.js), store reactivo y modales de creación/edición.
 */

import './styles/index.css';
import './styles/components.css';
import './styles/comparison.css';

import { getStoredOffers, fetchUserOffers, upsertOffer, deleteOffer } from './services/storage.js';
import { createDefaultOffer } from './core/types.js';
import { getUniqueVehicles } from './core/multiVehicle.js';
import { showToast } from './ui/toast.js';
import { createAppShell } from './ui/appShell.js';
import { el } from './ui/dom.js';

import { initHeader } from './components/Header.js';
import { initOfferModal } from './components/OfferModal.js';
import { initAmortizationModal } from './components/AmortizationModal.js';

import confetti from 'canvas-confetti';

const SYNC_ERROR_MESSAGE = 'Guardado localmente. Error al sincronizar con el servidor.';

function triggerConfetti() {
  confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
}

const amortizationModalCtrl = initAmortizationModal();
// Asignado tras crear la shell (los callbacks de tarjetas se usan sólo tras el primer render)
let offerModalCtrl;

const { store, dom, renderApp } = createAppShell({
  initialOffers: getStoredOffers(),
  createCallbacks: ({ store, inspectVehicle }) => ({
    getCardHandlers: () => ({
      onEdit: targetOffer => {
        const { offers, selectedVehicle } = store.getState();
        offerModalCtrl.open(
          offers.find(o => o.id === targetOffer.id),
          selectedVehicle
        );
      },
      onSchedule: targetOffer => amortizationModalCtrl.open(targetOffer),
      onDelete: async targetOffer => {
        if (!confirm(`¿Eliminar la oferta "${targetOffer.title}"?`)) return;
        try {
          store.setState({ offers: await deleteOffer(targetOffer.id) });
          showToast(`Oferta "${targetOffer.title}" eliminada.`, { type: 'info' });
        } catch {
          // El borrado queda pendiente de sincronizar: reflejar la caché local en la UI
          store.setState({ offers: getStoredOffers() });
          showToast('Eliminada localmente. Error al sincronizar con el servidor.', { type: 'error' });
        }
      }
    }),
    onInspectVehicle: inspectVehicle,
    renderEmptyState: () => {
      const tmpl = document.getElementById('tmpl-empty-state');
      if (!tmpl) return null;
      const clone = tmpl.content.cloneNode(true);
      clone.querySelector('.empty-add-btn')?.addEventListener('click', openNewOffer);
      return clone;
    }
  })
});

/**
 * Guarda una oferta y la selecciona; si falla la sincronización, la muestra desde la caché local.
 * @param {import('./core/types.js').Offer} fullOffer
 * @param {string} successMessage
 * @param {boolean} celebrate
 */
async function saveOffer(fullOffer, successMessage, celebrate) {
  try {
    const offers = await upsertOffer(fullOffer);
    store.setState({ offers, selectedVehicle: fullOffer.vehicle });
    showToast(successMessage, { type: 'success' });
    if (celebrate) triggerConfetti();
  } catch {
    // La oferta queda en la caché local (pendiente de sincronizar): reflejarla en la UI
    store.setState({ offers: getStoredOffers(), selectedVehicle: fullOffer.vehicle });
    showToast(SYNC_ERROR_MESSAGE, { type: 'error' });
  }
}

offerModalCtrl = initOfferModal({
  getKnownVehicles: () => getUniqueVehicles(store.getState().offers).map(v => v.name),
  onSave: offerData => {
    const isNew = !offerData.id;
    saveOffer(
      createDefaultOffer(offerData),
      isNew ? '¡Nueva oferta guardada correctamente!' : 'Oferta actualizada con éxito.',
      isNew
    );
  }
});

function openNewOffer() {
  offerModalCtrl.open(null, store.getState().selectedVehicle);
}

initHeader({
  onNewOffer: openNewOffer,
  // "Calcular el interés desde la cuota": el asistente deduce TIN, TAE e intereses a partir de la cuota
  onReverseCalc: () => offerModalCtrl.open(null, store.getState().selectedVehicle, { rateMode: 'monthly', step: 2 })
});
document.getElementById('fab-new-offer')?.addEventListener('click', openNewOffer);

// Carga de inicio: caché local inmediata y sincronización con el servidor
if (store.getState().offers.length > 0) {
  renderApp();
} else if (dom.offersDisplaySlot) {
  dom.offersDisplaySlot.replaceChildren(el('div', { className: 'loading-message', text: 'Cargando presupuestos...' }));
}

fetchUserOffers()
  .then(offers => store.setState({ offers }))
  .catch(() => renderApp());
