/**
 * Vista de Matriz Tabla Comparativa Detallada.
 * Genera la estructura DOM completa usando la API nativa de DOM y clases CSS sin estilos inline.
 */

import { MODALITY_LABELS, getOfferFinanceSubtitle } from '../core/types.js';
import { formatMonthsDuration, formatAprPercent } from '../core/formatters.js';

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
    titleDiv.textContent = getOfferFinanceSubtitle(o);

    const isWinner = o.highlights && o.highlights.length > 0;
    if (isWinner) {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'badge badge-winner badge--small';
      badgeSpan.textContent = o.highlights[0];
      th.appendChild(badgeSpan);
    }

    th.appendChild(titleDiv);
    headerTr.appendChild(th);
  });

  thead.appendChild(headerTr);
  table.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');

  appendTableRow(tbody, 'Modalidad', offers.map(o => MODALITY_LABELS[o.modality] || o.modality));
  appendTableRow(tbody, 'Concesionario', offers.map(o => o.dealer || '—'));
  appendTableRow(tbody, 'Precio del vehículo', offers.map(o => `${(o.vehiclePrice || o.cashPriceReference || o.offerPrice).toLocaleString('es-ES')} €`), { isBold: true });

  const hasAnyDiscount = offers.some(o => !o.isCash && ((o.financeDiscount && o.financeDiscount > 0) || (o.advertisedDiscount && o.advertisedDiscount > 0)));
  if (hasAnyDiscount) {
    appendTableRow(tbody, 'Descuento por financiar', offers.map(o => {
      const disc = o.financeDiscount !== undefined ? o.financeDiscount : (o.advertisedDiscount || 0);
      return (!o.isCash && disc > 0) ? `-${disc.toLocaleString('es-ES')} €` : '—';
    }), { highlightClass: 'highlight-save' });
    appendTableRow(tbody, 'Precio base de cálculo', offers.map(o => `${o.offerPrice.toLocaleString('es-ES')} €`), { isBold: true });
  }
  appendTableRow(tbody, 'Entrada inicial', offers.map(o => o.isCash ? '—' : (o.downPayment > 0 ? `${o.downPayment.toLocaleString('es-ES')} €` : '0 €')));
  appendTableRow(tbody, 'Plazo', offers.map(o => {
    if (o.isCash) return 'Contado';
    if (o.isEarlyCancellation) return `Mes ${o.earlyCancellationMonth} (de ${o.contractMonths}m)`;
    return `${o.totalMonths} meses (${formatMonthsDuration(o.totalMonths)})`;
  }));
  appendTableRow(tbody, 'Cuota mensual', offers.map(o => o.isCash ? '—' : `${o.monthlyPayment.toLocaleString('es-ES')} €/mes`), { isBold: true });
  appendTableRow(tbody, 'Cuota final / Finiquito', offers.map(o => {
    if (o.isEarlyCancellation) return `${o.finalSettlementPayment.toLocaleString('es-ES')} € (finiquito)`;
    return o.balloonPayment > 0 ? `${o.balloonPayment.toLocaleString('es-ES')} €` : '—';
  }));

  const hasAnyEarlyCancellation = offers.some(o => o.isEarlyCancellation);
  if (hasAnyEarlyCancellation) {
    appendTableRow(tbody, 'Comisión de cancelación', offers.map(o => {
      return o.isEarlyCancellation ? `+${o.cancellationPenalty.toLocaleString('es-ES')} € (${o.earlyCancellationPenaltyRate}%)` : '—';
    }));
    appendTableRow(tbody, 'Intereses futuros ahorrados', offers.map(o => {
      return (o.isEarlyCancellation && o.futureInterestSaved > 0) ? `-${o.futureInterestSaved.toLocaleString('es-ES')} €` : '—';
    }), { highlightClass: 'highlight-save' });
  }

  appendTableRow(tbody, 'TIN / TAE', offers.map(o => o.isCash ? '0%' : `${o.nominalTin}% / ${formatAprPercent(o.effectiveApr)} TAE`));
  appendTableRow(tbody, 'Intereses bancarios', offers.map(o => o.totalInterest > 0 ? `+${o.totalInterest.toLocaleString('es-ES')} €` : '0 €'), { isBold: true, highlightClass: 'highlight-trap' });
  appendTableRow(tbody, 'Seguros / extras cobrados', offers.map(o => o.costBreakdown.linkedProducts > 0 ? `+${o.costBreakdown.linkedProducts.toLocaleString('es-ES')} €` : '0 €'));
  appendTableRow(tbody, 'Coste financiero compra', offers.map(o => `${o.totalOutOfPocketCost.toLocaleString('es-ES')} €`), { isBold: true, isLargeText: true });
  
  const hasIncludedServices = offers.some(o => (o.includedServicesValue || 0) > 0);
  if (hasIncludedServices) {
    appendTableRow(tbody, 'Servicios bonificados (valor)', offers.map(o => {
      if (!o.includedServicesValue) return '—';
      const srvNames = (o.includedServices || []).map(s => s.name).join(', ');
      return `🎁 +${o.includedServicesValue.toLocaleString('es-ES')} €${srvNames ? ` (${srvNames})` : ''}`;
    }), { highlightClass: 'highlight-save' });

    appendTableRow(tbody, 'Coste equiparado (TCO)', offers.map(o => `${(o.adjustedTcoCost ?? o.totalOutOfPocketCost).toLocaleString('es-ES')} €`), { isBold: true, highlightClass: 'highlight-save' });
  }

  // Fila de diferencia financiera
  const diffTr = document.createElement('tr');
  const diffLabelTd = document.createElement('td');
  diffLabelTd.textContent = hasIncludedServices ? 'Diferencia financiera vs contado' : 'Diferencia vs contado';
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

  // Fila de diferencia real equiparada (si hay servicios incluidos)
  if (hasIncludedServices) {
    const eqTr = document.createElement('tr');
    const eqLabelTd = document.createElement('td');
    eqLabelTd.textContent = 'Diferencia real equiparada (TCO)';
    eqLabelTd.className = 'table-cell--label table-cell--bold';
    eqTr.appendChild(eqLabelTd);

    offers.forEach(o => {
      const td = document.createElement('td');
      if (o.isCash) {
        td.textContent = 'Referencia';
        td.className = 'table-cell--data table-cell--bold table-cell--muted';
      } else {
        const eqDiff = o.netEquatedDifferenceVsCashRef !== undefined ? o.netEquatedDifferenceVsCashRef : o.netDifferenceVsCashRef;
        const sign = eqDiff > 0 ? '+' : '';
        td.textContent = `${sign}${eqDiff.toLocaleString('es-ES')} €`;
        td.className = `table-cell--data table-cell--bold ${eqDiff > 0 ? 'highlight-trap' : 'highlight-save'}`;
      }
      eqTr.appendChild(td);
    });
    tbody.appendChild(eqTr);
  }

  // Fila de veredicto
  const verdictTr = document.createElement('tr');
  const verdictLabelTd = document.createElement('td');
  verdictLabelTd.textContent = 'Veredicto';
  verdictLabelTd.className = 'table-cell--label';
  verdictTr.appendChild(verdictLabelTd);

  offers.forEach(o => {
    const td = document.createElement('td');
    td.className = 'table-cell--data';
    if (o.isCash || o.verdict.status === 'warning' || o.verdict.status === 'neutral' || o.verdict.badge === 'Sin ventajas') {
      td.textContent = '—';
      td.className = 'table-cell--data table-cell--muted';
    } else {
      const badge = document.createElement('span');
      badge.className = `badge ${o.verdict.status === 'danger' ? 'badge-trap' : (o.verdict.status === 'success' ? 'badge-winner' : 'badge-neutral')}`;
      badge.textContent = o.verdict.badge;
      td.appendChild(badge);
    }
    verdictTr.appendChild(td);
  });
  tbody.appendChild(verdictTr);

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}
