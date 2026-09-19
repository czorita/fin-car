/**
 * Controlador del Header de la aplicación.
 * Conecta los listeners a los botones de acción del header.
 */

/**
 * Inicializa y enlaza los eventos de acción del header.
 * @param {object} handlers
 * @param {Function} handlers.onNewOffer
 * @param {Function} handlers.onReverseCalc
 */
export function initHeader({ onNewOffer, onReverseCalc } = {}) {
  const btnNewOffer = document.getElementById('btn-new-offer');
  const btnReverseCalc = document.getElementById('btn-reverse-calc');

  if (typeof onNewOffer === 'function') {
    btnNewOffer?.addEventListener('click', onNewOffer);
  }
  if (typeof onReverseCalc === 'function') {
    btnReverseCalc?.addEventListener('click', onReverseCalc);
  }
}
