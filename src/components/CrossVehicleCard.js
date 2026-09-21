/**
 * Componente Tarjeta de Vehículo en Comparativa Cruzada (CrossVehicleCard).
 * Muestra el resumen financiero de un vehículo bajo una modalidad dada y su posición comparativa.
 */

import { getOfferVehicle } from '../core/types.js';
import { getVehicleImageUrl, FALLBACK_CAR_SVG } from '../core/vehicleCatalog.js';

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
export function createCrossVehicleCardElement(offer, isWinner, { onInspectVehicle, onEditOffer, allRankedOffers = [] } = {}) {
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

  header.appendChild(badges);
  header.appendChild(title);
  header.appendChild(dealer);
  card.appendChild(header);

  // Hero Cost
  const hero = document.createElement('div');
  hero.className = 'offer-cost-hero';

  const heroLabel = document.createElement('div');
  heroLabel.className = 'cost-hero-label';
  heroLabel.textContent = 'Coste total real';

  const heroAmount = document.createElement('div');
  heroAmount.className = 'cost-hero-amount';
  heroAmount.textContent = `${offer.totalOutOfPocketCost.toLocaleString('es-ES')} €`;

  hero.appendChild(heroLabel);
  hero.appendChild(heroAmount);

  if (!offer.isCash) {
    const heroSub = document.createElement('div');
    heroSub.className = 'cost-hero-sub';
    heroSub.textContent = `Entrada: ${offer.upfrontPayment.toLocaleString('es-ES')} € + ${offer.totalMonths} meses a ${offer.monthlyPayment.toLocaleString('es-ES')} €/mes`;
    hero.appendChild(heroSub);
  }

  card.appendChild(hero);

  // Specs
  const specs = document.createElement('div');
  specs.className = 'offer-specs-list';

  const vPrice = offer.vehiclePrice || offer.cashPriceReference || offer.offerPrice;
  specs.appendChild(createSpecRow('Precio vehículo:', `${vPrice.toLocaleString('es-ES')} €`));

  const disc = offer.financeDiscount !== undefined ? offer.financeDiscount : (offer.advertisedDiscount || 0);
  if (!offer.isCash && disc > 0) {
    specs.appendChild(createSpecRow('Descuento financiar:', `-${disc.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
    specs.appendChild(createSpecRow('Base de cálculo:', `${offer.offerPrice.toLocaleString('es-ES')} €`, { isEmphasized: true }));
  }

  if (!offer.isCash) {
    specs.appendChild(createSpecRow('Entrada aportada:', `${offer.downPayment.toLocaleString('es-ES')} €`));
    specs.appendChild(createSpecRow('Cuota mensual:', `${offer.monthlyPayment.toLocaleString('es-ES')} €/mes`));
    specs.appendChild(createSpecRow('TIN / TAE:', `${offer.nominalTin}% / ${offer.effectiveApr}%`));
    specs.appendChild(createSpecRow('Total intereses:', `+${offer.totalInterest.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-trap' }));
    if (offer.balloonPayment > 0) {
      specs.appendChild(createSpecRow('Cuota final (VFG):', `${offer.balloonPayment.toLocaleString('es-ES')} €`));
    }
  }

  if (offer.includedServicesValue > 0) {
    specs.appendChild(createSpecRow('Servicios incluidos (valor):', `-${offer.includedServicesValue.toLocaleString('es-ES')} €`, { highlightClass: 'highlight-save' }));
    specs.appendChild(createSpecRow('Coste equiparado (TCO):', `${offer.adjustedTcoCost.toLocaleString('es-ES')} €`, { isEmphasized: true, highlightClass: 'highlight-save' }));
  }

  if (Array.isArray(allRankedOffers) && allRankedOffers.length > 1) {
    allRankedOffers.forEach(other => {
      if (other.id !== offer.id) {
        const otherModel = getOfferVehicle(other);
        const diff = Number((offer.totalOutOfPocketCost - other.totalOutOfPocketCost).toFixed(2));
        if (diff > 0) {
          specs.appendChild(createSpecRow(
            `Diferencia vs ${otherModel}:`,
            `+${diff.toLocaleString('es-ES')} €`,
            { highlightClass: 'highlight-trap', isEmphasized: true }
          ));
        } else if (diff < 0) {
          specs.appendChild(createSpecRow(
            `Diferencia vs ${otherModel}:`,
            `${diff.toLocaleString('es-ES')} €`,
            { highlightClass: 'highlight-save', isEmphasized: true }
          ));
        } else {
          specs.appendChild(createSpecRow(
            `Diferencia vs ${otherModel}:`,
            '0 €',
            { isEmphasized: true }
          ));
        }
      }
    });
  }

  card.appendChild(specs);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  if (typeof onInspectVehicle === 'function') {
    const btnInspect = document.createElement('button');
    btnInspect.type = 'button';
    btnInspect.className = 'btn btn-secondary btn-sm';
    btnInspect.style.flex = '1';
    btnInspect.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
      Ver este coche
    `;
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
