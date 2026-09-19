/**
 * Controlador de la Guía de Negociación y Detección de Trampas.
 * Conecta el banner interactivo y el diálogo modal de consejos.
 * Se activa ÚNICAMENTE cuando al menos una oferta analizada contiene una trampa de financiación.
 */

/**
 * Inicializa el controlador del banner y diálogo de la trampa del descuento.
 * @returns {{ update: (offers: Array<object>) => void, open: () => void, close: () => void }}
 */
export function initTrapGuideModal() {
  const banner = document.getElementById('trap-guide-banner');
  const btnOpen = document.getElementById('btn-open-trap-guide');
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

  btnOpen?.addEventListener('click', open);
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
      if (!banner) return;

      const trapOffers = (offers || []).filter(o => !o.isCash && o.verdict && o.verdict.status === 'danger');

      if (trapOffers.length === 0) {
        banner.style.display = 'none';
        return;
      }

      // Si hay ofertas con trampa de financiación, mostrar el banner clicable
      banner.style.display = 'block';

      // Rellenar lista con los detalles de las ofertas afectadas
      if (alertBox && listEl) {
        listEl.replaceChildren();
        trapOffers.forEach(o => {
          const li = document.createElement('li');
          const title = o.title || 'Oferta';
          const discount = Number(o.advertisedDiscount) || 0;
          const extraCost = Number(o.netDifferenceVsCashRef) || 0;

          li.innerHTML = `<strong>${title}</strong>: Descuento anunciado de ${discount.toLocaleString('es-ES')} € ficticio; acabas pagando <strong>+${extraCost.toLocaleString('es-ES')} € MÁS</strong> que al contado.`;
          listEl.appendChild(li);
        });
        alertBox.style.display = 'block';
      }
    }
  };
}
