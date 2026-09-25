/**
 * Componente Tarjeta de Vehículo en Comparativa Cruzada (CrossVehicleCard).
 * Muestra el resumen financiero de un vehículo bajo una modalidad dada y su posición comparativa.
 */

import { getOfferVehicle } from '../core/types.js';
import { formatAprPercent } from '../core/formatters.js';
import { getVehicleImageUrl, FALLBACK_CAR_SVG } from '../core/vehicleCatalog.js';
import { createIcon, el } from '../ui/dom.js';

/**
 * Crea una de las cifras clave de la tarjeta.
 * @param {string} label
 * @param {string} value
 * @param {string} [extraClass]
 * @param {string} [valueClass]
 * @returns {HTMLElement}
 */
function createKpi(label, value, extraClass = '', valueClass = '') {
  return el('div', { className: `offer-kpi ${extraClass}`.trim() }, [
    el('span', { className: 'offer-kpi-label', text: label }),
    el('span', { className: `offer-kpi-value ${valueClass}`.trim(), text: value })
  ]);
}

/**
 * Crea una fila de especificación para la tarjeta de coche.
 * @param {string} label
 * @param {string} value
 * @param {object} [options]
 * @returns {HTMLDivElement}
 */
function createSpecRow(label, value, options = {}) {
  const row = document.createElement('div');
  row.className = options.isEmphasized ? 'spec-row spec-row--emphasized' : 'spec-row';

  const lblSpan = document.createElement('span');
  lblSpan.className = 'spec-label';
  lblSpan.textContent = label;

  const valSpan = document.createElement('span');
  valSpan.className = `spec-val ${options.highlightClass || ''}`.trim();
  valSpan.textContent = value;

  row.appendChild(lblSpan);
  row.appendChild(valSpan);
  return row;
}

/**
 * Genera el elemento DOM para la tarjeta de un vehículo en comparativa cruzada.
 * @param {import('../core/normalizer.js').NormalizedOffer & { vehicleName: string, crossDiffVsWinner: number, crossHighlight: string }} offer
 * @param {boolean} isWinner
 * @param {object} handlers
 * @param {(vehicleName: string) => void} [handlers.onInspectVehicle]
 * @param {(offer: object) => void} [handlers.onEditOffer]
 * @returns {HTMLElement}
 */
export function createCrossVehicleCardElement(
  offer,
  isWinner,
  { onInspectVehicle, onEditOffer, allRankedOffers = [] } = {}
) {
  const card = document.createElement('article');
  card.className = `offer-card cross-vehicle-card ${isWinner ? 'is-winner' : ''}`;
  card.dataset.id = offer.id;
  // Imagen del modelo
  const imgUrl = offer.imageUrl || getVehicleImageUrl(offer.vehicle);
  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'cross-card-media';

  const img = document.createElement('img');
  img.className = 'cross-card-img';
  img.src = imgUrl || FALLBACK_CAR_SVG;
  img.alt = offer.vehicle || offer.title;
  img.loading = 'lazy';
  img.onerror = () => {
    img.src = FALLBACK_CAR_SVG;
    img.classList.add('is-fallback');
  };

  const overlay = document.createElement('div');
  overlay.className = 'cross-card-media-overlay';

  mediaContainer.appendChild(img);
  mediaContainer.appendChild(overlay);
  card.appendChild(mediaContainer);

  // Header
  const header = document.createElement('div');
  header.className = 'offer-header';

  const badges = document.createElement('div');
  badges.className = 'offer-badges';

  if (offer.isTcoWinner && !isWinner) {
    const b = document.createElement('span');
    b.className = 'badge badge-winner';
    b.textContent = '💎 Mejor TCO equiparado';
    badges.appendChild(b);
  }

  if (offer.includedServicesValue > 0) {
    const b = document.createElement('span');
    b.className = 'badge badge-info';
    b.textContent = `🎁 +${offer.includedServicesValue.toLocaleString('es-ES')} € servicios`;
    badges.appendChild(b);
  }

  const title = document.createElement('h3');
  title.className = 'offer-title';
  title.textContent = offer.vehicle || offer.title;

  const dealer = document.createElement('div');
  dealer.className = 'offer-dealer';
  dealer.textContent = offer.dealer || 'Concesionario sin especificar';

  const headerMain = document.createElement('div');
  headerMain.className = 'offer-header-main';
  headerMain.appendChild(title);
  headerMain.appendChild(dealer);
  header.appendChild(headerMain);
  header.appendChild(badges);
  card.appendChild(header);

  // Cifras clave: coste total, cuota y diferencia con el coche más barato de la comparativa
  const cheapest = allRankedOffers.reduce(
    (min, o) => (!min || o.totalOutOfPocketCost < min.totalOutOfPocketCost ? o : min),
    null
  );
  const diffVsBest = cheapest ? Number((offer.totalOutOfPocketCost - cheapest.totalOutOfPocketCost).toFixed(2)) : 0;
  let vsBestText = '—';
  let vsBestClass = '';
  if (cheapest && cheapest.id === offer.id) {
    vsBestText = '🏆 Mejor';
    vsBestClass = 'highlight-save';
  } else if (cheapest) {
    vsBestText = `+${diffVsBest.toLocaleString('es-ES')} €`;
    vsBestClass = diffVsBest > 0 ? 'highlight-trap' : '';
  }

  card.appendChild(
    el('div', { className: 'offer-kpis' }, [
      createKpi('Coste total real', `${offer.totalOutOfPocketCost.toLocaleString('es-ES')} €`, 'offer-kpi--total'),
      offer.isCash
        ? createKpi('Pago', 'Único')
        : createKpi('Cuota/mes', `${offer.monthlyPayment.toLocaleString('es-ES')} €`),
      createKpi('vs. el mejor', vsBestText, '', vsBestClass)
    ])
  );

  if (!offer.isCash) {
    const upfront = `Entrada ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} cuotas`;
    let planText = upfront;
    if (offer.isEarlyCancellation) {
      planText = `${upfront} + finiquito en el mes ${offer.earlyCancellationMonth} de ${offer.finalSettlementPayment.toLocaleString('es-ES')} €`;
    } else if (offer.balloonPayment > 0) {
      planText = `${upfront} + cuota final de ${offer.balloonPayment.toLocaleString('es-ES')} €`;
    }
    card.appendChild(el('p', { className: 'cost-hero-sub', text: planText }));
  }

  // Specs
  const specs = document.createElement('div');
  specs.className = 'offer-specs-list';

  const vPrice = offer.vehiclePrice || offer.cashPriceReference || offer.offerPrice;
  specs.appendChild(createSpecRow('Precio vehículo:', `${vPrice.toLocaleString('es-ES')} €`));

  const disc = offer.financeDiscount !== undefined ? offer.financeDiscount : offer.advertisedDiscount || 0;
  if (!offer.isCash && disc > 0) {
    specs.appendChild(
      createSpecRow('Descuento financiar:', `-${disc.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' })
    );
    specs.appendChild(
      createSpecRow('Base de cálculo:', `${offer.offerPrice.toLocaleString('es-ES')} €`, { isEmphasized: true })
    );
  }

  if (!offer.isCash) {
    specs.appendChild(createSpecRow('Entrada aportada:', `${offer.downPayment.toLocaleString('es-ES')} €`));
    specs.appendChild(createSpecRow('Cuota mensual:', `${offer.monthlyPayment.toLocaleString('es-ES')} €/mes`));
    specs.appendChild(createSpecRow('TIN / TAE:', `${offer.nominalTin}% / ${formatAprPercent(offer.effectiveApr)}`));
    specs.appendChild(
      createSpecRow('Total intereses:', `+${offer.totalInterest.toLocaleString('es-ES')} €`, {
        highlightClass: 'highlight-trap'
      })
    );
    if (offer.isEarlyCancellation) {
      if (offer.isFlexible && offer.balloonPayment > 0) {
        specs.appendChild(
          createSpecRow('Cuota final evitada (VFG):', `${offer.balloonPayment.toLocaleString('es-ES')} €`, {
            highlightClass: 'highlight-save'
          })
        );
      }
      specs.appendChild(
        createSpecRow(
          `Finiquito mes ${offer.earlyCancellationMonth}:`,
          `${offer.finalSettlementPayment.toLocaleString('es-ES')} €`
        )
      );
      if (offer.futureInterestSaved > 0) {
        specs.appendChild(
          createSpecRow('Ahorro intereses:', `-${offer.futureInterestSaved.toLocaleString('es-ES')} €`, {
            highlightClass: 'highlight-save',
            isEmphasized: true
          })
        );
      }
    } else if (offer.balloonPayment > 0) {
      specs.appendChild(createSpecRow('Cuota final (VFG):', `${offer.balloonPayment.toLocaleString('es-ES')} €`));
    }
  }

  if (offer.includedServicesValue > 0) {
    specs.appendChild(
      createSpecRow('Servicios incluidos (valor):', `-${offer.includedServicesValue.toLocaleString('es-ES')} €`, {
        highlightClass: 'highlight-save'
      })
    );
    specs.appendChild(
      createSpecRow('Coste equiparado (TCO):', `${offer.adjustedTcoCost.toLocaleString('es-ES')} €`, {
        isEmphasized: true,
        highlightClass: 'highlight-save'
      })
    );
  }

  if (Array.isArray(allRankedOffers) && allRankedOffers.length > 1) {
    allRankedOffers.forEach(other => {
      if (other.id !== offer.id) {
        const otherModel = getOfferVehicle(other);
        const diff = Number((offer.totalOutOfPocketCost - other.totalOutOfPocketCost).toFixed(2));
        if (diff > 0) {
          specs.appendChild(
            createSpecRow(`Diferencia vs ${otherModel}:`, `+${diff.toLocaleString('es-ES')} €`, {
              highlightClass: 'highlight-trap',
              isEmphasized: true
            })
          );
        } else if (diff < 0) {
          specs.appendChild(
            createSpecRow(`Diferencia vs ${otherModel}:`, `${diff.toLocaleString('es-ES')} €`, {
              highlightClass: 'highlight-save',
              isEmphasized: true
            })
          );
        } else {
          specs.appendChild(createSpecRow(`Diferencia vs ${otherModel}:`, '0 €', { isEmphasized: true }));
        }
      }
    });
  }

  const breakdown = el('details', { className: 'offer-breakdown' }, [
    el('summary', { className: 'offer-breakdown-toggle', text: 'Ver desglose' }),
    specs
  ]);
  card.appendChild(breakdown);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  if (typeof onInspectVehicle === 'function') {
    const btnInspect = document.createElement('button');
    btnInspect.type = 'button';
    btnInspect.className = 'btn btn-secondary btn-sm btn-flex-1';
    btnInspect.append(createIcon('externalLink'), ' Ver este coche');
    btnInspect.addEventListener('click', () => onInspectVehicle(offer.vehicle));
    actions.appendChild(btnInspect);
  }

  if (typeof onEditOffer === 'function') {
    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn btn-ghost btn-sm';
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => onEditOffer(offer));
    actions.appendChild(btnEdit);
  }

  card.appendChild(actions);

  return card;
}
