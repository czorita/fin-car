/**
 * Vista de la sección de analítica (gráfico de desglose de costes) compartida por ambas pestañas.
 */

import { MODALITY_LABELS } from '../../core/types.js';
import { renderCostBreakdownChart } from '../../components/CostBreakdownChart.js';
import { MAIN_TABS } from '../../components/MainTabsNav.js';
import { setVisible } from '../dom.js';

/**
 * Renderiza el encabezado y el gráfico de la sección de analítica.
 * @param {object} params
 * @param {object} params.dom
 * @param {HTMLElement|null} params.dom.section
 * @param {HTMLElement|null} params.dom.heading
 * @param {HTMLElement|null} params.dom.subtext
 * @param {HTMLCanvasElement|null} params.dom.canvas
 * @param {string} params.activeTab
 * @param {Array<object>} params.offers Ofertas a representar
 * @param {string|null} params.activeVehicle
 * @param {string} params.modality
 * @param {string} params.theme
 */
export function renderAnalyticsView({ dom, activeTab, offers, activeVehicle, modality, theme }) {
  const { section, heading, subtext, canvas } = dom;

  if (!offers || offers.length === 0) {
    setVisible(section, false);
    return;
  }

  setVisible(section, true);
  const isSameVehicle = activeTab === MAIN_TABS.SAME_VEHICLE;

  if (heading) {
    heading.textContent = isSameVehicle
      ? `Desglose financiero — ${activeVehicle || 'Vehículo'}`
      : `Comparativa de desembolso entre vehículos (${MODALITY_LABELS[modality] || modality})`;
  }

  if (subtext) {
    subtext.textContent = isSameVehicle
      ? `Compara qué parte del importe final de cada oferta de ${activeVehicle} corresponde al precio neto y cuánto se pierde en intereses bancarios o comisiones.`
      : 'Comparación visual directa del coste total real y su composición para cada modelo evaluado bajo las mismas condiciones.';
  }

  if (canvas) {
    renderCostBreakdownChart(canvas, offers, theme, activeTab);
  }
}
