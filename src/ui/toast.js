/**
 * Sistema unificado de notificaciones flotantes (Toasts).
 * Proporciona avisos visuales elegantes, accesibles y no bloqueantes.
 */

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
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      max-width: 90vw;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.85rem 1.35rem;
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(toast);
  }

  // Estilos según el tipo
  if (type === 'error') {
    toast.style.background = 'var(--accent-rose, #f43f5e)';
    toast.style.color = '#ffffff';
  } else if (type === 'warning') {
    toast.style.background = 'var(--accent-amber, #f59e0b)';
    toast.style.color = '#1c1917';
  } else if (type === 'info') {
    toast.style.background = 'var(--accent-cyan, #06b6d4)';
    toast.style.color = '#083344';
  } else {
    // success
    toast.style.background = 'var(--accent-emerald, #10b981)';
    toast.style.color = '#064e3b';
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  if (activeToastTimeout) {
    clearTimeout(activeToastTimeout);
  }

  activeToastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, duration);
}
