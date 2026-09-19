/**
 * Vista de Matriz Tabla Comparativa Detallada.
 * Genera la estructura DOM completa usando la API nativa de DOM y clases CSS sin estilos inline.
 */

import { MODALITY_LABELS } from '../core/types.js';

/**
 * Añade una fila a la tabla comparativa.
 * @param {HTMLTableSectionElement} tbody 
 * @param {string} labelText 
 * @param {Array<string|number>} values 
 * @param {object} [options]
 * @param {boolean} [options.isBold]
 * @param {string} [options.highlightClass]
 * @param {boolean} [options.isLargeText]
 */
function appendTableRow(tbody, labelText, values, options = {}) {
  const tr = document.createElement('tr');

  const thLabel = document.createElement('td');
  thLabel.textContent = labelText;
  thLabel.className = 'table-cell--label';
  tr.appendChild(thLabel);

  values.forEach(val => {
    const td = document.createElement('td');
    td.textContent = String(val);

    const classes = ['table-cell--data'];
    if (options.isBold) classes.push('table-cell--bold');
    if (options.isLargeText) classes.push('table-cell--large');
    if (options.highlightClass) classes.push(options.highlightClass);
    td.className = classes.join(' ');

    tr.appendChild(td);
  });

  tbody.appendChild(tr);
}

/**
 * Renderiza la matriz comparativa en formato tabla lado a lado.
 * @param {Array<import('../core/normalizer.js').NormalizedOffer>} offers 
 * @returns {HTMLDivElement} Contenedor con la tabla comparativa
 */
export function createComparisonTableElement(offers) {
  const wrapper = document.createElement('div');
  wrapper.className = 'comparison-table-wrapper';

  if (!offers || offers.length === 0) {
    return wrapper;
  }

  const table = document.createElement('table');
  table.className = 'data-table comparison-matrix-table';

  // Thead
  const thead = document.createElement('thead');
  const headerTr = document.createElement('tr');

  const firstTh = document.createElement('th');
  firstTh.textContent = 'Concepto / Métrica';
  firstTh.className = 'table-th--label';
  headerTr.appendChild(firstTh);

  offers.forEach(o => {
    const th = document.createElement('th');
    th.className = 'table-th--offer';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'table-th-title';
    titleDiv.textContent = o.title;

    const badgeSpan = document.createElement('span');
    const isWinner = o.highlights && o.highlights.length > 0;
    badgeSpan.className = `badge ${isWinner ? 'badge-winner' : 'badge-neutral'} badge--small`;
    badgeSpan.textContent = isWinner ? o.highlights[0] : (MODALITY_LABELS[o.modality] || o.modality);

    th.appendChild(titleDiv);
    th.appendChild(badgeSpan);
    headerTr.appendChild(th);
  });

  thead.appendChild(headerTr);
  table.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');

  appendTableRow(tbody, 'Modalidad', offers.map(o => MODALITY_LABELS[o.modality] || o.modality));
  appendTableRow(tbody, 'Concesionario', offers.map(o => o.dealer || '—'));
  appendTableRow(tbody, 'Precio Catálogo', offers.map(o => `${(o.cashPriceReference || o.offerPrice).toLocaleString('es-ES')} €`));
  appendTableRow(tbody, 'Precio Ofertado', offers.map(o => `${o.offerPrice.toLocaleString('es-ES')} €`), { isBold: true });
  appendTableRow(tbody, 'Descuento Anunciado', offers.map(o => o.advertisedDiscount > 0 ? `-${o.advertisedDiscount.toLocaleString('es-ES')} €` : '0 €'), { isBold: true, highlightClass: 'highlight-save' });
  appendTableRow(tbody, 'Entrada Inicial', offers.map(o => o.downPayment > 0 ? `${o.downPayment.toLocaleString('es-ES')} €` : '0 €'));
  appendTableRow(tbody, 'Plazo', offers.map(o => o.isCash ? 'Contado' : `${o.totalMonths} meses`));
  appendTableRow(tbody, 'Cuota Mensual', offers.map(o => o.isCash ? '—' : `${o.monthlyPayment.toLocaleString('es-ES')} €/mes`), { isBold: true });
  appendTableRow(tbody, 'Cuota Final (VFG)', offers.map(o => o.balloonPayment > 0 ? `${o.balloonPayment.toLocaleString('es-ES')} €` : '—'));
  appendTableRow(tbody, 'TIN / TAE', offers.map(o => o.isCash ? '0%' : `${o.nominalTin}% / ${o.effectiveApr}% TAE`));
  appendTableRow(tbody, 'Intereses Bancarios', offers.map(o => o.totalInterest > 0 ? `+${o.totalInterest.toLocaleString('es-ES')} €` : '0 €'), { isBold: true, highlightClass: 'highlight-trap' });
  appendTableRow(tbody, 'Comisión Apertura', offers.map(o => o.openingFeeAmount > 0 ? `${o.openingFeeAmount.toLocaleString('es-ES')} €` : '0 €'));
  appendTableRow(tbody, 'Seguros / Extras', offers.map(o => o.costBreakdown.linkedProducts > 0 ? `+${o.costBreakdown.linkedProducts.toLocaleString('es-ES')} €` : '0 €'));
  appendTableRow(tbody, 'Coste Total Real', offers.map(o => `${o.totalOutOfPocketCost.toLocaleString('es-ES')} €`), { isBold: true, isLargeText: true });
  
  // Fila especial de diferencia
  const diffTr = document.createElement('tr');
  const diffLabelTd = document.createElement('td');
  diffLabelTd.textContent = 'Diferencia vs Contado';
  diffLabelTd.className = 'table-cell--label';
  diffTr.appendChild(diffLabelTd);

  offers.forEach(o => {
    const td = document.createElement('td');
    if (o.isCash) {
      td.textContent = 'Referencia';
      td.className = 'table-cell--data table-cell--bold table-cell--muted';
    } else {
      const sign = o.netDifferenceVsCashRef > 0 ? '+' : '';
      td.textContent = `${sign}${o.netDifferenceVsCashRef.toLocaleString('es-ES')} €`;
      td.className = `table-cell--data table-cell--bold ${o.netDifferenceVsCashRef > 0 ? 'highlight-trap' : 'highlight-save'}`;
    }
    diffTr.appendChild(td);
  });
  tbody.appendChild(diffTr);

  // Fila de veredicto
  const verdictTr = document.createElement('tr');
  const verdictLabelTd = document.createElement('td');
  verdictLabelTd.textContent = 'Veredicto';
  verdictLabelTd.className = 'table-cell--label';
  verdictTr.appendChild(verdictLabelTd);

  offers.forEach(o => {
    const td = document.createElement('td');
    td.className = 'table-cell--data';
    const badge = document.createElement('span');
    badge.className = `badge ${o.verdict.status === 'danger' ? 'badge-trap' : (o.verdict.status === 'success' ? 'badge-winner' : 'badge-neutral')}`;
    badge.textContent = o.verdict.badge;
    td.appendChild(badge);
    verdictTr.appendChild(td);
  });
  tbody.appendChild(verdictTr);

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}
