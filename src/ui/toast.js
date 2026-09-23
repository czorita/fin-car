/**
 * Sistema unificado de notificaciones flotantes (Toasts).
 * Proporciona avisos visuales elegantes, accesibles y no bloqueantes.
 * El aspecto se define en comparison.css (.app-toast y variantes .app-toast--<tipo>).
 */

const TOAST_TYPES = ['success', 'info', 'warning', 'error'];

let activeToastTimeout = null;

/**
 * Muestra una notificación emergente en la esquina inferior.
 * @param {string} message Texto del mensaje a mostrar
 * @param {object} [options]
 * @param {'success' | 'info' | 'warning' | 'error'} [options.type='success']
 * @param {number} [options.duration=3500] Duración en milisegundos
 */
export function showToast(message, { type = 'success', duration = 3500 } = {}) {
  let toast = document.getElementById('app-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  const variant = TOAST_TYPES.includes(type) ? type : 'success';
  toast.className = `app-toast app-toast--${variant} is-visible`;
  toast.textContent = message;

  if (activeToastTimeout) {
    clearTimeout(activeToastTimeout);
  }

  activeToastTimeout = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, duration);
}
