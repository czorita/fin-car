/**
 * Controlador genérico de un par de campos enlazados donde uno se calcula a partir del otro
 * (entrada ↔ capital financiado, TIN ↔ cuota mensual).
 * El campo que el usuario escribe manda; el otro queda bloqueado como "derivado"
 * hasta que se pulsa su botón de desbloqueo.
 */

import { setVisible } from '../../ui/dom.js';

/**
 * @typedef {object} DerivedResult
 * @property {string} value Valor calculado para el campo derivado
 * @property {string} helperText Texto de ayuda bajo el campo derivado
 */

/**
 * @typedef {object} PairSide
 * @property {string} mode Identificador del modo en que este campo manda (p. ej. 'tin')
 * @property {HTMLInputElement} input
 * @property {HTMLElement|null} unlockBtn Botón que desbloquea este campo cuando es derivado
 * @property {HTMLElement|null} helper Texto de ayuda bajo el campo
 * @property {string} activeHelperText Ayuda mostrada cuando este campo manda
 * @property {() => DerivedResult|null} derive Calcula el otro campo, o null si faltan datos
 */

/**
 * Bloquea o desbloquea un campo derivado.
 * @param {HTMLInputElement} input
 * @param {boolean} derived
 */
function setDerived(input, derived) {
  input.disabled = derived;
  input.classList.toggle('input-derived', derived);
}

/**
 * Crea el controlador de un par de campos enlazados.
 * @param {object} options
 * @param {PairSide} options.first
 * @param {PairSide} options.second
 * @param {() => void} options.onChange Se invoca tras cada cambio del usuario en el par
 * @returns {{
 *   sync: (forcedMode?: string|null) => DerivedResult|null,
 *   getMode: () => string|null,
 *   setValues: (firstValue: string, secondValue: string, mode: string|null) => void
 * }}
 */
export function createDerivedPair({ first, second, onChange }) {
  let activeMode = null;
  const sides = [first, second];
  const other = side => (side === first ? second : first);

  /**
   * Determina qué campo manda según cuál tiene valor.
   */
  function resolveMode() {
    const active = sides.find(s => s.mode === activeMode);
    if (active) {
      if (!active.input.value.trim()) activeMode = null;
      return;
    }
    const filled = sides.filter(s => s.input.value.trim());
    activeMode = filled.length === 1 ? filled[0].mode : null;
  }

  /**
   * Sincroniza el par: bloquea el campo derivado y recalcula su valor.
   * @param {string|null} [forcedMode] Modo impuesto; si se omite se deduce de los valores
   * @returns {DerivedResult|null} Resultado del cálculo (null si no hay campo que mande o faltan datos)
   */
  function sync(forcedMode) {
    if (forcedMode !== undefined) {
      activeMode = forcedMode;
    } else {
      resolveMode();
    }

    const active = sides.find(s => s.mode === activeMode);
    if (!active) {
      sides.forEach(s => {
        setDerived(s.input, false);
        setVisible(s.unlockBtn, false);
        if (s.helper) s.helper.textContent = '';
      });
      return null;
    }

    const derivedSide = other(active);
    setDerived(active.input, false);
    setDerived(derivedSide.input, true);
    setVisible(active.unlockBtn, false);
    setVisible(derivedSide.unlockBtn, true, 'inline-block');
    if (active.helper) active.helper.textContent = active.activeHelperText;

    const result = active.derive();
    derivedSide.input.value = result ? result.value : '';
    if (derivedSide.helper) derivedSide.helper.textContent = result ? result.helperText : '';
    return result;
  }

  sides.forEach(side => {
    side.input.addEventListener('input', () => {
      sync(side.input.value.trim() ? side.mode : null);
      onChange();
    });

    // Desbloquear este campo: se vacía el par y el usuario vuelve a elegir cuál manda
    side.unlockBtn?.addEventListener('click', () => {
      sides.forEach(s => {
        s.input.value = '';
        setDerived(s.input, false);
      });
      sync(null);
      side.input.focus();
      onChange();
    });
  });

  return {
    sync,
    getMode: () => activeMode,
    setValues(firstValue, secondValue, mode) {
      first.input.value = firstValue;
      second.input.value = secondValue;
      sync(mode);
    }
  };
}
