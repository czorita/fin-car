/**
 * Matriz Comparativa entre Coches Diferentes (CrossVehicleTable).
 * Permite visualizar lado a lado las ofertas de cada vehículo evaluadas bajo la misma modalidad.
 */

import { MODALITY_LABELS, getOfferVehicle } from '../core/types.js';
import { formatMonthsDuration, formatAprPercent } from '../core/formatters.js';
import { getVehicleImageUrl } from '../core/vehicleCatalog.js';

/**
 * Añade una fila a la tabla comparativa de vehículos.
 * @param {HTMLTableSectionElement} tbody 
 * @param {string} labelText 
 * @param {Array<string|number>} values 
 * @param {object} [options]
 * @param {boolean} [options.isBold]
 * @param {string} [options.highlightClass]
 * @param {boolean} [options.isLargeText]
 */
function appendRow(tbody, labelText, values, options = {}) {
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
 * Genera la matriz comparativa enfrentando vehículos diferentes columna a columna.
 * @param {Array<import('../core/normalizer.js').NormalizedOffer & { vehicleName: string, crossDiffVsWinner: number, crossHighlight: string }>} rankedCrossOffers
 * @returns {HTMLDivElement}
 */
export function createCrossVehicleTableElement(rankedCrossOffers) {
  const wrapper = document.createElement('div');
  wrapper.className = 'comparison-table-wrapper';

  if (!rankedCrossOffers || rankedCrossOffers.length === 0) {
    return wrapper;
  }

  const table = document.createElement('table');
  table.className = 'data-table comparison-matrix-table cross-vehicle-table';

  // Thead
  const thead = document.createElement('thead');
  const headerTr = document.createElement('tr');

  const firstTh = document.createElement('th');
  firstTh.textContent = 'Métrica / Coche';
  firstTh.className = 'table-th--label';
  headerTr.appendChild(firstTh);

  rankedCrossOffers.forEach((o, index) => {
    const th = document.createElement('th');
    th.className = 'table-th--offer';
    if (index === 0) {
      th.classList.add('table-th--winner');
    }

    const imgUrl = o.imageUrl || getVehicleImageUrl(o.vehicle);
    if (imgUrl) {
      const thumb = document.createElement('img');
      thumb.className = 'table-th-thumb';
      thumb.src = imgUrl;
      thumb.alt = o.vehicle || o.title;
      thumb.loading = 'lazy';
      thumb.onerror = () => { thumb.style.display = 'none'; };
      th.appendChild(thumb);
    }

    const vehicleTitle = document.createElement('div');
    vehicleTitle.className = 'table-th-title';
    vehicleTitle.textContent = o.vehicle || o.title;

    const offerSub = document.createElement('div');
    offerSub.className = 'table-th-subtitle';
    th.appendChild(vehicleTitle);
    th.appendChild(offerSub);

    if (index > 0 && o.crossDiffVsWinner !== undefined) {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'badge badge-neutral badge--small';
      badgeSpan.textContent = `+${o.crossDiffVsWinner.toLocaleString('es-ES')} €`;
      th.appendChild(badgeSpan);
    }

    headerTr.appendChild(th);
  });

  thead.appendChild(headerTr);
  table.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');

  appendRow(tbody, 'Modalidad evaluada', rankedCrossOffers.map(o => MODALITY_LABELS[o.modality] || o.modality));
  appendRow(tbody, 'Concesionario', rankedCrossOffers.map(o => o.dealer || '—'));
  appendRow(tbody, 'Precio del vehículo', rankedCrossOffers.map(o => `${(o.vehiclePrice || o.cashPriceReference || o.offerPrice).toLocaleString('es-ES')} €`), { isBold: true });

  const hasCrossDiscounts = rankedCrossOffers.some(o => !o.isCash && ((o.financeDiscount && o.financeDiscount > 0) || (o.advertisedDiscount && o.advertisedDiscount > 0)));
  if (hasCrossDiscounts) {
    appendRow(tbody, 'Descuento por financiar', rankedCrossOffers.map(o => {
      const disc = o.financeDiscount !== undefined ? o.financeDiscount : (o.advertisedDiscount || 0);
      return (!o.isCash && disc > 0) ? `-${disc.toLocaleString('es-ES')} €` : '—';
    }), { highlightClass: 'highlight-save' });
    appendRow(tbody, 'Precio base de cálculo', rankedCrossOffers.map(o => `${o.offerPrice.toLocaleString('es-ES')} €`), { isBold: true });
  }
  appendRow(tbody, 'Entrada aportada', rankedCrossOffers.map(o => o.isCash ? '—' : (o.downPayment > 0 ? `${o.downPayment.toLocaleString('es-ES')} €` : '0 €')));
  appendRow(tbody, 'Plazo', rankedCrossOffers.map(o => {
    if (o.isCash) return 'Al contado';
    if (o.isEarlyCancellation) return `Mes ${o.earlyCancellationMonth} (de ${o.contractMonths}m)`;
    return `${o.totalMonths} meses (${formatMonthsDuration(o.totalMonths)})`;
  }));
  appendRow(tbody, 'Cuota mensual', rankedCrossOffers.map(o => o.isCash ? '—' : `${o.monthlyPayment.toLocaleString('es-ES')} €/mes`), { isBold: true });
  appendRow(tbody, 'Cuota final / Finiquito', rankedCrossOffers.map(o => {
    if (o.isEarlyCancellation) return `${o.finalSettlementPayment.toLocaleString('es-ES')} € (finiquito)`;
    return o.balloonPayment > 0 ? `${o.balloonPayment.toLocaleString('es-ES')} €` : '—';
  }));

  const hasCrossEarlyCancel = rankedCrossOffers.some(o => o.isEarlyCancellation);
  if (hasCrossEarlyCancel) {
    appendRow(tbody, 'Comisión cancelación', rankedCrossOffers.map(o => o.isEarlyCancellation ? `+${o.cancellationPenalty.toLocaleString('es-ES')} € (${o.earlyCancellationPenaltyRate}%)` : '—'));
    appendRow(tbody, 'Intereses futuros ahorrados', rankedCrossOffers.map(o => (o.isEarlyCancellation && o.futureInterestSaved > 0) ? `-${o.futureInterestSaved.toLocaleString('es-ES')} €` : '—'), { highlightClass: 'highlight-save' });
  }

  appendRow(tbody, 'TIN / TAE real', rankedCrossOffers.map(o => o.isCash ? '0%' : `${o.nominalTin}% / ${formatAprPercent(o.effectiveApr)} TAE`));
  appendRow(tbody, 'Total intereses pagados', rankedCrossOffers.map(o => o.totalInterest > 0 ? `+${o.totalInterest.toLocaleString('es-ES')} €` : '0 €'), { isBold: true, highlightClass: 'highlight-trap' });
  appendRow(tbody, 'Coste financiero compra', rankedCrossOffers.map(o => `${o.totalOutOfPocketCost.toLocaleString('es-ES')} €`), { isBold: true, isLargeText: true });

  const hasCrossServices = rankedCrossOffers.some(o => (o.includedServicesValue || 0) > 0);
  if (hasCrossServices) {
    appendRow(tbody, 'Servicios bonificados (valor)', rankedCrossOffers.map(o => {
      if (!o.includedServicesValue) return '—';
      const srvNames = (o.includedServices || []).map(s => s.name).join(', ');
      return `🎁 +${o.includedServicesValue.toLocaleString('es-ES')} €${srvNames ? ` (${srvNames})` : ''}`;
    }), { highlightClass: 'highlight-save' });

    appendRow(tbody, 'Coste equiparado (TCO)', rankedCrossOffers.map(o => `${(o.adjustedTcoCost ?? o.totalOutOfPocketCost).toLocaleString('es-ES')} €`), { isBold: true, highlightClass: 'highlight-save' });
  }

  // Filas de diferencia frente a cada vehículo (si hay más de 1 vehículo)
  if (rankedCrossOffers.length > 1) {
    rankedCrossOffers.forEach(refOffer => {
      const refModel = getOfferVehicle(refOffer);
      const diffTr = document.createElement('tr');
      const diffLabelTd = document.createElement('td');
      diffLabelTd.textContent = `Diferencia vs ${refModel}`;
      diffLabelTd.className = 'table-cell--label';
      diffTr.appendChild(diffLabelTd);

      rankedCrossOffers.forEach(colOffer => {
        const td = document.createElement('td');
        if (colOffer.id === refOffer.id) {
          td.textContent = '—';
          td.className = 'table-cell--data table-cell--muted';
        } else {
          const diff = Number((colOffer.totalOutOfPocketCost - refOffer.totalOutOfPocketCost).toFixed(2));
          if (diff > 0) {
            td.textContent = `+${diff.toLocaleString('es-ES')} €`;
            td.className = 'table-cell--data table-cell--bold highlight-trap';
          } else if (diff < 0) {
            td.textContent = `${diff.toLocaleString('es-ES')} €`;
            td.className = 'table-cell--data table-cell--bold highlight-save';
          } else {
            td.textContent = '0 €';
            td.className = 'table-cell--data table-cell--bold';
          }
        }
        diffTr.appendChild(td);
      });
      tbody.appendChild(diffTr);
    });
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}
