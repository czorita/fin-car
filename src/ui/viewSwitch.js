/**
 * Controlador para la conmutación de vistas (Tarjetas vs Tabla).
 */

/**
 * Inicializa los botones de selección de vista de ofertas.
 * @param {object} [options]
 * @param {string} [options.cardsBtnId='view-cards-btn']
 * @param {string} [options.tableBtnId='view-table-btn']
 * @param {'cards' | 'table'} [options.initialView='cards']
 * @param {Function} [options.onViewChange] Callback invocado con la nueva vista ('cards' | 'table')
 * @returns {{ getView: () => string, setView: (view: 'cards' | 'table') => void }}
 */
export function initViewSwitcher({
  cardsBtnId = 'view-cards-btn',
  tableBtnId = 'view-table-btn',
  initialView = 'cards',
  onViewChange
} = {}) {
  const viewCardsBtn = document.getElementById(cardsBtnId);
  const viewTableBtn = document.getElementById(tableBtnId);
  let currentView = initialView;

  function updateButtons() {
    viewCardsBtn?.classList.toggle('active', currentView === 'cards');
    viewTableBtn?.classList.toggle('active', currentView === 'table');
  }

  function setView(view) {
    if (view !== 'cards' && view !== 'table') return;
    currentView = view;
    updateButtons();
    if (typeof onViewChange === 'function') {
      onViewChange(currentView);
    }
  }

  viewCardsBtn?.addEventListener('click', () => setView('cards'));
  viewTableBtn?.addEventListener('click', () => setView('table'));

  updateButtons();

  return {
    getView() {
      return currentView;
    },
    setView
  };
}
