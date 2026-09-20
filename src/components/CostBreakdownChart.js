/**
 * Gráfico interactivo de barras apiladas con Chart.js para comparar el desglose de costes.
 * Reutiliza la instancia existente mediante .update() para maximizar el rendimiento.
 */

import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { CHART_TITLE_MAX_LENGTH } from '../core/constants.js';
import { getOfferDisplayTitle, getOfferFinanceSubtitle, getOfferVehicle } from '../core/types.js';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

let chartInstance = null;

/**
 * Renderiza o actualiza el gráfico de barras apiladas.
 * @param {HTMLCanvasElement} canvas 
 * @param {Array<import('../core/normalizer.js').NormalizedOffer>} offers 
 * @param {string} theme - 'dark' | 'light'
 * @param {string} [activeTab='same_vehicle'] - 'same_vehicle' | 'cross_vehicle'
 */
export function renderCostBreakdownChart(canvas, offers, theme = 'dark', activeTab = 'same_vehicle') {
  if (!canvas || !offers || offers.length === 0) return;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // Si estamos en el desglose financiero del mismo vehículo (o todas las ofertas corresponden al mismo modelo),
  // se elimina el nombre del modelo de cada línea para evitar ruido visual redundante.
  const uniqueVehicles = new Set(offers.map(o => getOfferVehicle(o)).filter(Boolean));
  const isSingleVehicle = activeTab === 'same_vehicle' || uniqueVehicles.size <= 1;

  const labels = offers.map(o => {
    let rawLabel;
    if (isSingleVehicle) {
      rawLabel = getOfferFinanceSubtitle(o);
    } else {
      const uniqueModalities = new Set(offers.map(x => x.modality));
      rawLabel = uniqueModalities.size <= 1 ? getOfferVehicle(o) : getOfferDisplayTitle(o);
    }
    return rawLabel.length > CHART_TITLE_MAX_LENGTH
      ? rawLabel.substring(0, CHART_TITLE_MAX_LENGTH - 2) + '...'
      : rawLabel;
  });

  const vehicleData = offers.map(o => o.costBreakdown.vehicleNet);
  const interestData = offers.map(o => o.costBreakdown.interests);
  const productsData = offers.map(o => o.costBreakdown.linkedProducts);

  const datasets = [
    {
      label: 'Coche neto (€)',
      data: vehicleData,
      backgroundColor: '#3b82f6',
      borderRadius: 4
    },
    {
      label: 'Intereses bancarios (€)',
      data: interestData,
      backgroundColor: '#f43f5e',
      borderRadius: 4
    },
    {
      label: 'Seguros y extras vinculados (€)',
      data: productsData,
      backgroundColor: '#f59e0b',
      borderRadius: 4
    }
  ];

  // Si ya existe instancia activa sobre el mismo canvas, actualizar in-place
  if (chartInstance && chartInstance.ctx && chartInstance.canvas === canvas) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets = datasets;
    chartInstance.options.scales.x.grid.color = gridColor;
    chartInstance.options.scales.x.ticks.color = textColor;
    chartInstance.options.scales.y.ticks.color = textColor;
    chartInstance.options.plugins.legend.labels.color = textColor;
    chartInstance.update();
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      indexAxis: 'y', // Barras horizontales para facilitar la lectura de nombres de coches
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            callback: (val) => `${Number(val).toLocaleString('es-ES')} €`
          }
        },
        y: {
          stacked: true,
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            font: {
              weight: 'bold',
              size: 12
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor,
            usePointStyle: true,
            boxWidth: 10,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = Number(context.raw) || 0;
              return ` ${context.dataset.label}: ${val.toLocaleString('es-ES')} €`;
            },
            footer: (tooltipItems) => {
              let sum = 0;
              tooltipItems.forEach(item => {
                sum += Number(item.raw) || 0;
              });
              return `Total desembolso: ${sum.toLocaleString('es-ES')} €`;
            }
          }
        }
      }
    }
  });
}
