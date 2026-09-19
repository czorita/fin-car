/**
 * Gestor global de temas (Dark / Light).
 * Centraliza la lectura, guardado en localStorage y actualización de atributos en el DOM.
 */

import { STORAGE_KEY_THEME } from '../core/constants.js';

/**
 * Recupera el tema guardado en localStorage o 'dark' por defecto.
 * @returns {string} 'dark' | 'light'
 */
export function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Guarda el tema elegido en localStorage.
 * @param {string} theme - 'dark' | 'light'
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch (err) {
    console.error('Error guardando preferencia de tema:', err);
  }
}

/**
 * Inicializa el tema en el elemento raíz del documento y enlaza el botón conmutador.
 * Encapsula el estado localmente para evitar variables globales sueltas.
 * @param {object} [options]
 * @param {string} [options.buttonId='btn-theme-toggle']
 * @param {string} [options.iconId='theme-toggle-icon']
 * @param {Function} [options.onChange] Callback invocado al cambiar de tema (recibe 'dark' | 'light')
 * @returns {{ getTheme: () => string, toggle: () => string, updateIcon: () => void }}
 */
export function initThemeManager({ buttonId = 'btn-theme-toggle', iconId = 'theme-toggle-icon', onChange } = {}) {
  let currentTheme = getSavedTheme();

  const btnToggle = document.getElementById(buttonId);
  const iconEl = document.getElementById(iconId);

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
    if (iconEl) {
      iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (typeof onChange === 'function') {
      onChange(theme);
    }
  }

  // Aplicar tema inicial
  applyTheme(currentTheme);

  btnToggle?.addEventListener('click', () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  return {
    getTheme() {
      return currentTheme;
    },
    toggle() {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      return nextTheme;
    },
    updateIcon() {
      if (iconEl) {
        iconEl.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
      }
    }
  };
}
