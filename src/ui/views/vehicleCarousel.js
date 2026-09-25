/**
 * Fila compacta de coches: un chip por vehículo (miniatura, nombre y nº de ofertas)
 * más el chip "Todos los coches", que abre la comparativa entre modelos.
 */

import { getVehicleImageUrl } from '../../core/vehicleCatalog.js';
import { el, createIcon } from '../dom.js';

/**
 * Crea la miniatura del chip (foto del catálogo o icono de respaldo).
 * @param {string} name
 * @returns {HTMLElement}
 */
function createChipThumb(name) {
  const thumb = el('span', { className: 'vehicle-chip-thumb', attrs: { 'aria-hidden': 'true' } });
  const imgUrl = getVehicleImageUrl(name);
  if (imgUrl) {
    const img = el('img', { attrs: { src: imgUrl, alt: '', loading: 'lazy' } });
    img.onerror = () => img.replaceWith(createIcon('car'));
    thumb.appendChild(img);
  } else {
    thumb.appendChild(createIcon('car'));
  }
  return thumb;
}

/**
 * Crea un chip seleccionable.
 * @param {object} options
 * @param {string} options.label
 * @param {number} options.count
 * @param {boolean} options.isActive
 * @param {HTMLElement} options.thumb
 * @param {string} options.title
 * @param {() => void} options.onClick
 * @param {string} [options.extraClass]
 * @returns {HTMLButtonElement}
 */
function createChip({ label, count, isActive, thumb, title, onClick, extraClass = '' }) {
  const chip = el(
    'button',
    {
      className: `vehicle-chip ${extraClass} ${isActive ? 'active' : ''}`.replace(/\s+/g, ' ').trim(),
      attrs: { type: 'button', 'aria-pressed': isActive ? 'true' : 'false', title }
    },
    [
      thumb,
      el('span', { className: 'vehicle-chip-name', text: label }),
      el('span', { className: 'vehicle-chip-count', text: String(count) })
    ]
  );
  chip.addEventListener('click', onClick);
  return /** @type {HTMLButtonElement} */ (chip);
}

/**
 * Renderiza la fila de chips de coches.
 * @param {HTMLElement|null} track Contenedor de los chips
 * @param {Array<{ name: string, count: number }>} uniqueVehicles
 * @param {string|null} currentVehicle
 * @param {object} options
 * @param {boolean} [options.isAllActive=false] La comparativa entre coches está abierta
 * @param {(name: string) => void} options.onSelect
 * @param {() => void} [options.onSelectAll]
 */
export function renderVehicleCarousel(
  track,
  uniqueVehicles,
  currentVehicle,
  { isAllActive = false, onSelect, onSelectAll }
) {
  if (!track) return;
  track.replaceChildren();

  if (uniqueVehicles.length === 0) {
    track.appendChild(
      el('span', { className: 'vehicle-chips-empty', text: 'Aún no hay coches: añade tu primera oferta' })
    );
    return;
  }

  const current = (currentVehicle || '').toLowerCase();
  let activeChip = null;

  uniqueVehicles.forEach(vehicle => {
    const isActive = !isAllActive && vehicle.name.toLowerCase() === current;
    const offersLabel = `${vehicle.count} ${vehicle.count === 1 ? 'oferta' : 'ofertas'}`;
    const chip = createChip({
      label: vehicle.name,
      count: vehicle.count,
      isActive,
      thumb: createChipThumb(vehicle.name),
      title: `Ver las ${offersLabel} del ${vehicle.name}`,
      onClick: () => onSelect(vehicle.name)
    });
    if (isActive) activeChip = chip;
    track.appendChild(chip);
  });

  // Comparar entre modelos solo tiene sentido con más de un coche
  if (uniqueVehicles.length > 1 && onSelectAll) {
    const allChip = createChip({
      label: 'Todos los coches',
      count: uniqueVehicles.length,
      isActive: isAllActive,
      thumb: el('span', {
        className: 'vehicle-chip-thumb vehicle-chip-thumb--all',
        text: '⇄',
        attrs: { 'aria-hidden': 'true' }
      }),
      title: 'Comparar los coches entre sí en la misma modalidad de pago',
      onClick: onSelectAll,
      extraClass: 'vehicle-chip--all'
    });
    if (isAllActive) activeChip = allChip;
    track.appendChild(allChip);
  }

  // Mantener visible el chip activo cuando la fila tiene scroll horizontal
  if (activeChip && typeof activeChip.scrollIntoView === 'function') {
    const chipToShow = activeChip;
    setTimeout(() => chipToShow.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }), 40);
  }
}
