import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom } from '../helpers/dom.js';

let dom;

describe('Utilidades DOM (ui/dom.js)', () => {
  before(async () => {
    setupDom();
    dom = await import('../../src/ui/dom.js');
  });

  test('el crea el elemento con clase, texto, atributos e hijos (ignorando vacíos)', () => {
    const node = dom.el('div', { className: 'card', attrs: { 'data-id': '7' } }, [
      dom.el('strong', { text: 'Hola' }),
      ' mundo',
      null,
      false
    ]);
    assert.equal(node.className, 'card');
    assert.equal(node.getAttribute('data-id'), '7');
    assert.equal(node.textContent, 'Hola mundo');
    assert.equal(node.childNodes.length, 2);
  });

  test('el trata el texto como texto, nunca como HTML', () => {
    const node = dom.el('p', { text: '<img src=x onerror=alert(1)>' });
    assert.equal(node.children.length, 0);
    assert.equal(node.textContent, '<img src=x onerror=alert(1)>');
  });

  test('createIcon devuelve un SVG nuevo en cada llamada', () => {
    const a = dom.createIcon('check');
    const b = dom.createIcon('check');
    assert.equal(a.tagName.toLowerCase(), 'svg');
    assert.notEqual(a, b);
    assert.equal(a.getAttribute('aria-hidden'), 'true');
  });

  test('setVisible alterna display y tolera elementos nulos', () => {
    const node = dom.el('div');
    dom.setVisible(node, true, 'flex');
    assert.equal(node.style.display, 'flex');
    dom.setVisible(node, false);
    assert.equal(node.style.display, 'none');
    assert.doesNotThrow(() => dom.setVisible(null, true));
  });
});
