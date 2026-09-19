/**
 * Motor de Renderizado Unificado (renderEngine).
 * Gestiona el ciclo completo de renderizado para ambas pestañas:
 * - Pestaña 1: Mismo Vehículo (selector de coche, tarjetas/tabla, veredicto mono-vehículo y desglose).
 * - Pestaña 2: Coches Diferentes (selector de modalidad cruzada, veredicto comparativo, tarjetas/matriz y comparativa).
 */

import { normalizeOffer, rankOffers } from '../core/normalizer.js';
import { getOfferVehicle, MODALITY_LABELS } from '../core/types.js';
import {
  getUniqueVehicles,
  filterOffersByVehicle,
  getCrossVehicleOffers,
  rankCrossVehicleOffers
} from '../core/multiVehicle.js';
import { getVehicleImageUrl } from '../core/vehicleCatalog.js';

// VerdictBanner eliminado — el veredicto se muestra en cada tarjeta individual
import { initTrapGuideModal } from '../components/TrapGuideModal.js';
import { createOfferCardElement } from '../components/OfferCard.js';
import { createComparisonTableElement } from '../components/ComparisonTable.js';
import { createCrossVehicleCardElement } from '../components/CrossVehicleCard.js';
import { createCrossVehicleTableElement } from '../components/CrossVehicleTable.js';
import { renderCostBreakdownChart } from '../components/CostBreakdownChart.js';

/**
 * Crea el motor de renderizado configurado para la aplicación.
 * @param {object} config
 */
export function createAppRenderer({
  getOffers,
  getTheme,
  getActiveTab,
  getView,
  getCrossView,
  getSelectedVehicle,
  setSelectedVehicle,
  getSelectedCrossModality,
  setSelectedCrossModality,
  // Elementos Pestaña 1
  vehicleChipsList,
  offersDisplaySlot,
  offersCountLabel,
  btnAddForVehicle,
  // Elementos Pestaña 2
  crossModalitySelector,
  crossDisplaySlot,
  crossCountLabel,
  // Elementos Compartidos
  analyticsSection,
  analyticsHeading,
  analyticsSubtext,
  costBreakdownCanvas,
  getCardHandlers,
  onCardCreated,
  onInspectVehicle,
  onAddOfferForVehicle,
  renderEmptyState
}) {
  const trapGuideCtrl = initTrapGuideModal();

  /**
   * Genera el elemento de respaldo visual cuando un vehículo no tiene imagen o falla la red.
   * @returns {HTMLElement}
   */
  function createVehicleCardFallback() {
    const fallback = document.createElement('div');
    fallback.className = 'vehicle-card-fallback';
    fallback.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
    return fallback;
  }

  /**
   * Renderiza el selector de vehículos activos como carrusel fotográfico en la Pestaña 1.
   * @param {Array<{ name: string, count: number }>} uniqueVehicles
   * @param {string} currentVehicle
   */
  function renderVehicleChips(uniqueVehicles, currentVehicle) {
    if (!vehicleChipsList) return;
    vehicleChipsList.replaceChildren();

    if (uniqueVehicles.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'vehicle-carousel-empty';
      emptyEl.innerHTML = '<span style="font-size: 1.3rem;">🚗</span><span>Sin vehículos registrados todavía</span>';
      vehicleChipsList.appendChild(emptyEl);
      return;
    }

    // Configurar botones de desplazamiento del carrusel (prev / next)
    const prevBtn = document.getElementById('btn-vehicle-carousel-prev');
    const nextBtn = document.getElementById('btn-vehicle-carousel-next');

    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = 'true';
      prevBtn.addEventListener('click', () => {
        vehicleChipsList.scrollBy({ left: -240, behavior: 'smooth' });
      });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = 'true';
      nextBtn.addEventListener('click', () => {
        vehicleChipsList.scrollBy({ left: 240, behavior: 'smooth' });
      });
    }

    let activeCardEl = null;

    uniqueVehicles.forEach(v => {
      const card = document.createElement('button');
      card.type = 'button';
      const isActive = v.name.toLowerCase() === (currentVehicle || '').toLowerCase();
      card.className = `vehicle-carousel-card ${isActive ? 'active' : ''}`;
      card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      card.title = `Seleccionar ${v.name} (${v.count} ${v.count === 1 ? 'oferta' : 'ofertas'})`;

      // Contenedor de fotografía ampliada
      const media = document.createElement('div');
      media.className = 'vehicle-card-media';

      const imgUrl = getVehicleImageUrl(v.name);
      if (imgUrl) {
        const img = document.createElement('img');
        img.className = 'vehicle-card-img';
        img.src = imgUrl;
        img.alt = v.name;
        img.loading = 'lazy';
        img.onerror = () => {
          img.replaceWith(createVehicleCardFallback());
        };
        media.appendChild(img);
      } else {
        media.appendChild(createVehicleCardFallback());
      }

      if (isActive) {
        const activePill = document.createElement('span');
        activePill.className = 'vehicle-card-active-pill';
        activePill.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Activo';
        media.appendChild(activePill);
      }

      // Contenedor de información
      const info = document.createElement('div');
      info.className = 'vehicle-card-info';

      const nameEl = document.createElement('h4');
      nameEl.className = 'vehicle-card-name';
      nameEl.textContent = v.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'vehicle-card-meta';

      const countBadge = document.createElement('span');
      countBadge.className = 'vehicle-card-count';
      countBadge.textContent = `${v.count} ${v.count === 1 ? 'oferta' : 'ofertas'}`;

      metaEl.appendChild(countBadge);
      info.appendChild(nameEl);
      info.appendChild(metaEl);

      card.appendChild(media);
      card.appendChild(info);

      card.addEventListener('click', () => {
        setSelectedVehicle(v.name);
        renderApp();
      });

      if (isActive) {
        activeCardEl = card;
      }

      vehicleChipsList.appendChild(card);
    });

    // Auto-desplazamiento suave para mantener visible el coche activo
    if (activeCardEl) {
      setTimeout(() => {
        activeCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 40);
    }
  }

  /**
   * Renderiza la vista de la Pestaña 1: Ofertas del mismo vehículo.
   * @param {Array<import('../core/normalizer.js').NormalizedOffer>} normalizedList
   * @param {string} activeVehicle
   * @returns {Array<import('../core/normalizer.js').NormalizedOffer>}
   */
  function renderSameVehicleView(normalizedList, activeVehicle) {
    if (!offersDisplaySlot) return [];

    if (normalizedList.length === 0) {
      if (typeof renderEmptyState === 'function') {
        const emptyEl = renderEmptyState();
        if (emptyEl) {
          offersDisplaySlot.replaceChildren(emptyEl);
        }
      } else {
        offersDisplaySlot.replaceChildren();
      }

      if (offersCountLabel) {
        offersCountLabel.innerHTML = 'Mostrando <strong>0</strong> ofertas';
      }
      if (btnAddForVehicle) btnAddForVehicle.style.display = 'none';
      return [];
    }

    if (btnAddForVehicle) {
      btnAddForVehicle.style.display = 'inline-flex';
      btnAddForVehicle.onclick = () => {
        if (typeof onAddOfferForVehicle === 'function') {
          onAddOfferForVehicle(activeVehicle);
        }
      };
    }

    const vehicleOffers = filterOffersByVehicle(normalizedList, activeVehicle);
    const rankedVehicleOffers = rankOffers(vehicleOffers);
    const bestOffer = rankedVehicleOffers.find(o => o.highlights && o.highlights.includes('🏆 Menor Coste Total'));

    // Actualizar contador
    if (offersCountLabel) {
      offersCountLabel.replaceChildren();
      const txtPre = document.createTextNode('Mostrando ');
      const strongCount = document.createElement('strong');
      strongCount.textContent = String(rankedVehicleOffers.length);
      const txtFor = document.createTextNode(' ofertas para ');
      const strongVehicle = document.createElement('strong');
      strongVehicle.textContent = activeVehicle || 'este vehículo';
      const txtTotal = document.createTextNode(` (de ${normalizedList.length} en total)`);

      offersCountLabel.appendChild(txtPre);
      offersCountLabel.appendChild(strongCount);
      offersCountLabel.appendChild(txtFor);
      offersCountLabel.appendChild(strongVehicle);
      offersCountLabel.appendChild(txtTotal);
    }

    // Actualizar modal de trampa (sin banner global; el link está en cada tarjeta)
    trapGuideCtrl?.update(rankedVehicleOffers);

    // Renderizar tarjetas o tabla
    if (rankedVehicleOffers.length === 0) {
      offersDisplaySlot.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No hay ofertas registradas para este coche.
        </div>
      `;
      return [];
    }

    if (getView() === 'cards') {
      const grid = document.createElement('div');
      grid.className = 'offers-grid';

      rankedVehicleOffers.forEach(offer => {
        const isWinner = Boolean(bestOffer && offer.id === bestOffer.id);
        const handlers = typeof getCardHandlers === 'function' ? getCardHandlers(offer) : {};
        const card = createOfferCardElement(offer, isWinner, handlers);

        if (typeof onCardCreated === 'function') {
          onCardCreated(card, offer);
        }

        grid.appendChild(card);
      });

      offersDisplaySlot.replaceChildren(grid);
    } else {
      const tableElement = createComparisonTableElement(rankedVehicleOffers);
      offersDisplaySlot.replaceChildren(tableElement);
    }

    return rankedVehicleOffers;
  }

  /**
   * Renderiza la vista de la Pestaña 2: Comparativa entre coches diferentes.
   * @param {Array<import('../core/normalizer.js').NormalizedOffer>} normalizedList
   * @param {string} modality
   * @returns {Array<import('../core/normalizer.js').NormalizedOffer>}
   */
  function renderCrossVehicleView(normalizedList, modality) {
    if (!crossDisplaySlot) return [];

    // Actualizar botones de modalidad
    if (crossModalitySelector) {
      crossModalitySelector.querySelectorAll('.segmented-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.modality === modality);
      });
    }

    if (normalizedList.length === 0) {
      if (typeof renderEmptyState === 'function') {
        const emptyEl = renderEmptyState();
        if (emptyEl) {
          crossDisplaySlot.replaceChildren(emptyEl);
        }
      } else {
        crossDisplaySlot.replaceChildren();
      }

      if (crossCountLabel) {
        crossCountLabel.innerHTML = 'Comparando <strong>0</strong> vehículos';
      }
      return [];
    }

    const crossOffers = getCrossVehicleOffers(normalizedList, modality);
    const { rankedOffers } = rankCrossVehicleOffers(crossOffers);

    // Actualizar contador
    const modLabel = MODALITY_LABELS[modality] || modality;

    if (crossCountLabel) {
      crossCountLabel.innerHTML = `Comparando <strong>${rankedOffers.length}</strong> vehículos bajo modalidad <em>${modLabel}</em>`;
    }


    if (rankedOffers.length === 0) {
      crossDisplaySlot.innerHTML = `
        <div class="cross-empty-banner">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;" aria-hidden="true">🔍</div>
          <h4 style="font-size: 1.15rem; margin-bottom: 0.4rem; color: var(--text-primary);">
            Sin ofertas de ${modLabel} entre tus coches
          </h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 520px; margin: 0 auto 1.25rem auto;">
            Ninguno de tus vehículos registrados tiene actualmente una oferta bajo esta modalidad.
            Selecciona otra modalidad (como <strong>Al Contado</strong> o <strong>Financiación Lineal</strong>) o añade un presupuesto para evaluarlo.
          </p>
        </div>
      `;
      return [];
    }

    const crossView = typeof getCrossView === 'function' ? getCrossView() : 'cards';

    if (crossView === 'cards') {
      const grid = document.createElement('div');
      grid.className = 'offers-grid';

      rankedOffers.forEach((offer, idx) => {
        const isWinner = idx === 0 && rankedOffers.length > 1;
        const card = createCrossVehicleCardElement(offer, isWinner, {
          allRankedOffers: rankedOffers,
          onInspectVehicle: (vName) => {
            if (typeof onInspectVehicle === 'function') {
              onInspectVehicle(vName);
            }
          },
          onEditOffer: (target) => {
            const handlers = typeof getCardHandlers === 'function' ? getCardHandlers(target) : {};
            handlers.onEdit?.(target);
          }
        });
        grid.appendChild(card);
      });

      crossDisplaySlot.replaceChildren(grid);
    } else {
      const tableEl = createCrossVehicleTableElement(rankedOffers);
      crossDisplaySlot.replaceChildren(tableEl);
    }

    return rankedOffers;
  }

  /**
   * Ciclo completo de renderizado sincronizado.
   */
  function renderApp() {
    const rawOffers = getOffers();
    const normalizedList = rawOffers.map(o => normalizeOffer(o));
    const uniqueVehicles = getUniqueVehicles(rawOffers);

    // 1. Determinar y sincronizar vehículo activo para Pestaña 1
    let activeVehicle = getSelectedVehicle?.();
    const vehicleExists = activeVehicle && uniqueVehicles.some(v => v.name.toLowerCase() === activeVehicle.toLowerCase());
    if (!vehicleExists && uniqueVehicles.length > 0) {
      activeVehicle = uniqueVehicles[0].name;
      setSelectedVehicle?.(activeVehicle);
    }

    // 2. Renderizar chips de vehículos
    renderVehicleChips(uniqueVehicles, activeVehicle);

    // 3. Renderizar vista de Pestaña 1
    const rankedVehicleOffers = renderSameVehicleView(normalizedList, activeVehicle);

    // 4. Renderizar vista de Pestaña 2
    const currentModality = getSelectedCrossModality?.() || 'cash';
    const rankedCrossOffers = renderCrossVehicleView(normalizedList, currentModality);

    // 5. Actualizar sección de analítica y gráfico según la pestaña activa
    const activeTab = getActiveTab?.() || 'same_vehicle';
    const offersForChart = activeTab === 'same_vehicle' ? rankedVehicleOffers : rankedCrossOffers;

    if (offersForChart && offersForChart.length > 0) {
      if (analyticsSection) analyticsSection.style.display = 'block';

      if (analyticsHeading) {
        analyticsHeading.textContent = activeTab === 'same_vehicle'
          ? `Desglose financiero — ${activeVehicle || 'Vehículo'}`
          : `Comparativa de desembolso entre vehículos (${MODALITY_LABELS[currentModality] || currentModality})`;
      }

      if (analyticsSubtext) {
        analyticsSubtext.textContent = activeTab === 'same_vehicle'
          ? `Compara qué parte del importe final de cada oferta de ${activeVehicle} corresponde al precio neto y cuánto se pierde en intereses bancarios o comisiones.`
          : `Comparación visual directa del coste total real y su composición para cada modelo evaluado bajo las mismas condiciones.`;
      }

      if (costBreakdownCanvas) {
        renderCostBreakdownChart(costBreakdownCanvas, offersForChart, getTheme(), activeTab);
      }
    } else {
      if (analyticsSection) analyticsSection.style.display = 'none';
    }

    return {
      uniqueVehicles,
      rankedVehicleOffers,
      rankedCrossOffers
    };
  }

  // Configurar listeners de la botonera de modalidad cruzada
  if (crossModalitySelector) {
    crossModalitySelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented-btn');
      if (btn && btn.dataset.modality) {
        setSelectedCrossModality?.(btn.dataset.modality);
        renderApp();
      }
    });
  }

  return {
    renderApp,
    renderSameVehicleView,
    renderCrossVehicleView
  };
}
