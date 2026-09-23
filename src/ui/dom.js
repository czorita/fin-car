/**
 * Utilidades DOM compartidas por los componentes y vistas.
 * Permiten construir nodos sin concatenar HTML en strings ni aplicar estilos inline.
 */

/**
 * Iconos SVG estáticos de la aplicación (contenido fijo y de confianza).
 */
const ICONS = {
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  externalLink: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
};

/**
 * Crea un icono SVG a partir del catálogo estático.
 * @param {keyof typeof ICONS} name
 * @returns {SVGElement}
 */
export function createIcon(name) {
  const tmpl = document.createElement('template');
  tmpl.innerHTML = ICONS[name];
  return /** @type {SVGElement} */ (tmpl.content.firstElementChild);
}

/**
 * Crea un elemento con clase, texto, atributos e hijos.
 * @param {string} tag
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text]
 * @param {Record<string, string>} [options.attrs]
 * @param {Array<Node|string|null|undefined|false>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, { className, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  }
  children.forEach(child => {
    if (child === null || child === undefined || child === false) return;
    node.append(child);
  });
  return node;
}

/**
 * Muestra u oculta un elemento mediante su propiedad display.
 * @param {HTMLElement|null|undefined} node
 * @param {boolean} visible
 * @param {string} [display='block'] Valor de display cuando es visible
 */
export function setVisible(node, visible, display = 'block') {
  if (node) node.style.display = visible ? display : 'none';
}
