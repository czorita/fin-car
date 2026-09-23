/**
 * Vista del carrusel fotográfico de vehículos (Pestaña 1: Mismo Vehículo).
 */

import { getVehicleImageUrl } from '../../core/vehicleCatalog.js';
import { el, createIcon } from '../dom.js';

/** Desplazamiento horizontal (px) de los botones anterior/siguiente */
const CAROUSEL_SCROLL_STEP = 240;

/**
 * Genera el elemento de respaldo visual cuando un vehículo no tiene imagen o falla la red.
 * @returns {HTMLElement}
 */
function createVehicleCardFallback() {
  return el('div', { className: 'vehicle-card-fallback' }, [createIcon('car')]);
}

/**
 * Enlaza una sola vez los botones de desplazamiento del carrusel.
 * @param {HTMLElement} track
 */
function bindCarouselNav(track) {
  const buttons = [
    [document.getElementById('btn-vehicle-carousel-prev'), -CAROUSEL_SCROLL_STEP],
    [document.getElementById('btn-vehicle-carousel-next'), CAROUSEL_SCROLL_STEP]
  ];
  buttons.forEach(([btn, step]) => {
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => track.scrollBy({ left: step, behavior: 'smooth' }));
    }
  });
}

/**
 * Crea la tarjeta de un vehículo del carrusel.
 * @param {{ name: string, count: number }} vehicle
 * @param {boolean} isActive
 * @param {(name: string) => void} onSelect
 * @returns {HTMLButtonElement}
 */
function createVehicleCard(vehicle, isActive, onSelect) {
  const offersLabel = `${vehicle.count} ${vehicle.count === 1 ? 'oferta' : 'ofertas'}`;

  const media = el('div', { className: 'vehicle-card-media' });
  const imgUrl = getVehicleImageUrl(vehicle.name);
  if (imgUrl) {
    const img = el('img', {
      className: 'vehicle-card-img',
      attrs: { src: imgUrl, alt: vehicle.name, loading: 'lazy' }
    });
    img.onerror = () => img.replaceWith(createVehicleCardFallback());
    media.appendChild(img);
  } else {
    media.appendChild(createVehicleCardFallback());
  }

  if (isActive) {
    media.appendChild(el('span', { className: 'vehicle-card-active-pill' }, [createIcon('check'), ' Activo']));
  }

  const info = el('div', { className: 'vehicle-card-info' }, [
    el('h4', { className: 'vehicle-card-name', text: vehicle.name }),
    el('div', { className: 'vehicle-card-meta' }, [el('span', { className: 'vehicle-card-count', text: offersLabel })])
  ]);

  const card = el(
    'button',
    {
      className: `vehicle-carousel-card ${isActive ? 'active' : ''}`,
      attrs: {
        type: 'button',
        'aria-pressed': isActive ? 'true' : 'false',
        title: `Seleccionar ${vehicle.name} (${offersLabel})`
      }
    },
    [media, info]
  );

  card.addEventListener('click', () => onSelect(vehicle.name));
  return /** @type {HTMLButtonElement} */ (card);
}

/**
 * Renderiza el selector de vehículos activos como carrusel fotográfico.
 * @param {HTMLElement|null} track Contenedor del carrusel
 * @param {Array<{ name: string, count: number }>} uniqueVehicles
 * @param {string|null} currentVehicle
 * @param {(name: string) => void} onSelect
 */
export function renderVehicleCarousel(track, uniqueVehicles, currentVehicle, onSelect) {
  if (!track) return;
  track.replaceChildren();

  if (uniqueVehicles.length === 0) {
    track.appendChild(
      el('div', { className: 'vehicle-carousel-empty' }, [
        el('span', { className: 'vehicle-carousel-empty-icon', text: '🚗' }),
        el('span', { text: 'Sin vehículos registrados todavía' })
      ])
    );
    return;
  }

  bindCarouselNav(track);

  const current = (currentVehicle || '').toLowerCase();
  let activeCardEl = null;

  uniqueVehicles.forEach(vehicle => {
    const isActive = vehicle.name.toLowerCase() === current;
    const card = createVehicleCard(vehicle, isActive, onSelect);
    if (isActive) activeCardEl = card;
    track.appendChild(card);
  });

  // Auto-desplazamiento suave para mantener visible el coche activo
  if (activeCardEl) {
    setTimeout(() => {
      activeCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 40);
  }
}
