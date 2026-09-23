/**
 * Lista editable de filas basada en una plantilla <template> (productos vinculados, servicios incluidos).
 * Cada fila se enlaza a un objeto del estado; los cambios se escriben directamente en él.
 */

import { parseLocaleNumber, formatLocaleNumber } from '../../core/formatters.js';
import { el } from '../../ui/dom.js';

/**
 * @typedef {object} ListField
 * @property {string} selector Selector del campo dentro de la fila
 * @property {string} prop Propiedad del objeto enlazada al campo
 * @property {'text'|'number'|'checkbox'} kind Tipo de campo. Los cambios en 'number' y 'checkbox' notifican onChange
 */

/**
 * Crea una lista editable.
 * @param {object} options
 * @param {HTMLElement|null} options.container
 * @param {HTMLTemplateElement|null} options.template
 * @param {string} options.rowSelector Selector de la fila dentro de la plantilla
 * @param {string} options.removeSelector Selector del botón de eliminar dentro de la fila
 * @param {string} options.emptyText Mensaje cuando la lista está vacía
 * @param {ListField[]} options.fields
 * @param {() => void} options.onChange Se invoca al cambiar un importe/checkbox, añadir o eliminar filas
 * @returns {{ getItems: () => Array<object>, setItems: (items: Array<object>) => void, add: (item: object) => void }}
 */
export function createEditableList({ container, template, rowSelector, removeSelector, emptyText, fields, onChange }) {
  let items = [];

  /**
   * Enlaza un campo de la fila con la propiedad del objeto.
   * @param {HTMLInputElement} input
   * @param {ListField} field
   * @param {object} item
   */
  function bindField(input, field, item) {
    if (field.kind === 'checkbox') {
      // Semántica de productos: sin valor explícito se considera marcado
      input.checked = item[field.prop] !== false;
      input.addEventListener('change', (e) => {
        item[field.prop] = e.target.checked;
        onChange();
      });
    } else if (field.kind === 'number') {
      input.value = formatLocaleNumber(item[field.prop] || 0);
      input.addEventListener('change', (e) => {
        item[field.prop] = parseLocaleNumber(e.target.value);
        onChange();
      });
    } else {
      input.value = item[field.prop] || '';
      input.addEventListener('change', (e) => {
        item[field.prop] = e.target.value;
      });
    }
  }

  function render() {
    if (!container) return;
    container.replaceChildren();

    if (items.length === 0) {
      container.appendChild(el('div', { className: 'empty-inline-help', text: emptyText }));
      return;
    }

    items.forEach(item => {
      if (!template) return;
      const clone = template.content.cloneNode(true);
      const row = clone.querySelector(rowSelector);
      if (!row) return;

      fields.forEach(field => {
        const input = row.querySelector(field.selector);
        if (input) bindField(input, field, item);
      });

      row.querySelector(removeSelector)?.addEventListener('click', () => {
        items = items.filter(i => i !== item);
        render();
        onChange();
      });

      container.appendChild(clone);
    });
  }

  return {
    getItems: () => items,
    setItems(newItems) {
      items = newItems;
      render();
    },
    add(item) {
      items.push(item);
      render();
      onChange();
    }
  };
}
