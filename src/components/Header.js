/**
 * Controlador del Header de la aplicación.
 * Conecta los listeners a los elementos semánticos existentes en el DOM sin inyectar cadenas HTML.
 */

/**
 * Inicializa y enlaza los eventos del header.
 * @param {object} handlers
 * @param {Function} handlers.onNewOffer
 * @param {Function} handlers.onReverseCalc
 * @param {Function} handlers.onExport
 * @param {Function} handlers.onImport
 * @param {Function} handlers.onResetSamples
 * @param {Function} handlers.onToggleTheme
 * @param {string} currentTheme
 */
export function initHeader({ onNewOffer, onReverseCalc, onExport, onImport, onResetSamples, onToggleTheme, currentTheme }) {
  const btnNewOffer = document.getElementById('btn-new-offer');
  const btnReverseCalc = document.getElementById('btn-reverse-calc');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnResetSamples = document.getElementById('btn-reset-samples');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const inputImport = document.getElementById('input-import-json');
  const themeIcon = document.getElementById('theme-toggle-icon');

  if (themeIcon) {
    themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }

  btnNewOffer?.addEventListener('click', onNewOffer);
  btnReverseCalc?.addEventListener('click', onReverseCalc);
  btnExportJson?.addEventListener('click', onExport);
  btnResetSamples?.addEventListener('click', onResetSamples);
  btnThemeToggle?.addEventListener('click', onToggleTheme);

  inputImport?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  });

  return {
    updateTheme(theme) {
      if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    }
  };
}
