/**
 * Controlador de la Guía de Negociación y Detección de Trampas.
 * Gestiona el diálogo modal de consejos, que se abre desde el enlace de cada tarjeta
 * y lista las ofertas analizadas que contienen una trampa de financiación.
 */

import { el, setVisible } from '../ui/dom.js';

/**
 * Inicializa el controlador del diálogo de la trampa del descuento.
 * @returns {{ update: (offers: Array<object>) => void, open: () => void, close: () => void }}
 */
export function initTrapGuideModal() {
  const dialog = document.getElementById('modal-trap-guide');
  const btnClose = document.getElementById('btn-close-trap-guide');
  const btnUnderstood = document.getElementById('btn-understood-trap-guide');
  const alertBox = document.getElementById('trap-guide-offers-alert');
  const listEl = document.getElementById('trap-guide-offers-list');

  function open() {
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  function close() {
    if (dialog && typeof dialog.close === 'function') {
      dialog.close();
    }
  }

  btnClose?.addEventListener('click', close);
  btnUnderstood?.addEventListener('click', close);

  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) {
      close();
    }
  });

  return {
    open,
    close,
    update(offers) {
      const trapOffers = (offers || []).filter(o => !o.isCash && o.verdict && o.verdict.status === 'danger');
      // Rellenar el aviso del modal con las ofertas afectadas (el modal se abre desde cada tarjeta)
      if (!alertBox || !listEl) return;
      listEl.replaceChildren(...trapOffers.map(o => {
        const discount = Number(o.advertisedDiscount) || 0;
        const extraCost = Number(o.netDifferenceVsCashRef) || 0;
        return el('li', {}, [
          el('strong', { text: o.title || 'Oferta' }),
          `: Descuento anunciado de ${discount.toLocaleString('es-ES')} € ficticio; acabas pagando `,
          el('strong', { text: `+${extraCost.toLocaleString('es-ES')} € MÁS` }),
          ' que al contado.'
        ]);
      }));
      setVisible(alertBox, trapOffers.length > 0);
    }
  };
}
