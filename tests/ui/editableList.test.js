import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, readPartial } from '../helpers/dom.js';

let createEditableList;
let list;
let changes;

function change(input, value) {
  if (input.type === 'checkbox') input.checked = value;
  else input.value = value;
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}

describe('Lista editable (offerModal/editableList.js) con la plantilla de productos vinculados', () => {
  before(async () => {
    setupDom();
    ({ createEditableList } = await import('../../src/components/offerModal/editableList.js'));
  });

  beforeEach(() => {
    document.body.innerHTML = `<div id="list"></div>${readPartial('tmpl-linked-product')}`;
    changes = 0;
    list = createEditableList({
      container: document.getElementById('list'),
      template: document.getElementById('tmpl-linked-product'),
      rowSelector: '.linked-product-row',
      removeSelector: '.btn-remove-prod',
      emptyText: 'Sin productos',
      fields: [
        { selector: '.prod-name', prop: 'name', kind: 'text' },
        { selector: '.prod-cost', prop: 'cost', kind: 'number' },
        { selector: '.prod-financed', prop: 'financed', kind: 'checkbox' }
      ],
      onChange: () => changes++
    });
  });

  test('Lista vacía muestra el mensaje de ayuda', () => {
    list.setItems([]);
    assert.equal(document.querySelector('#list .empty-inline-help').textContent, 'Sin productos');
  });

  test('Renderiza una fila por elemento con valores formateados', () => {
    list.setItems([
      { id: 'p1', name: 'Seguro', cost: 1350.5 },
      { id: 'p2', name: 'Pack', cost: 200, financed: false }
    ]);
    const rows = document.querySelectorAll('#list .linked-product-row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].querySelector('.prod-name').value, 'Seguro');
    assert.equal(rows[0].querySelector('.prod-cost').value, '1350,5');
    assert.equal(rows[0].querySelector('.prod-financed').checked, true, 'financed indefinido = marcado');
    assert.equal(rows[1].querySelector('.prod-financed').checked, false);
  });

  test('Editar importe y checkbox actualiza el objeto y notifica; el nombre no notifica', () => {
    const items = [{ id: 'p1', name: 'Seguro', cost: 100, financed: true }];
    list.setItems(items);
    const row = document.querySelector('#list .linked-product-row');

    change(row.querySelector('.prod-name'), 'Seguro de vida');
    assert.equal(items[0].name, 'Seguro de vida');
    assert.equal(changes, 0);

    change(row.querySelector('.prod-cost'), '1.250,75');
    assert.equal(items[0].cost, 1250.75);
    change(row.querySelector('.prod-financed'), false);
    assert.equal(items[0].financed, false);
    assert.equal(changes, 2);
  });

  test('add y eliminar fila actualizan la lista y notifican', () => {
    list.setItems([]);
    list.add({ id: 'p1', name: 'A', cost: 1 });
    list.add({ id: 'p2', name: 'B', cost: 2 });
    assert.equal(list.getItems().length, 2);
    document.querySelector('#list .btn-remove-prod').click();
    assert.deepEqual(
      list.getItems().map(i => i.id),
      ['p2']
    );
    assert.equal(document.querySelectorAll('#list .linked-product-row').length, 1);
    assert.equal(changes, 3);
  });
});
