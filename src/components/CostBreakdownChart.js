/**
 * Gráfico interactivo de barras apiladas con Chart.js para comparar el desglose de costes.
 */

import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

let chartInstance = null;

/**
 * Renderiza o actualiza el gráfico de barras apiladas.
 * @param {HTMLCanvasElement} canvas 
 * @param {Array<import('../core/normalizer.js').NormalizedOffer>} offers 
 * @param {string} theme - 'dark' | 'light'
 */
export function renderCostBreakdownChart(canvas, offers, theme = 'dark') {
  if (!canvas || !offers || offers.length === 0) return;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  const labels = offers.map(o => {
    // Abreviar el título si es largo
    return o.title.length > 28 ? o.title.substring(0, 26) + '...' : o.title;
  });

  const vehicleData = offers.map(o => o.costBreakdown.vehicleNet);
  const interestData = offers.map(o => o.costBreakdown.interests);
  const feeData = offers.map(o => o.costBreakdown.openingFee);
  const productsData = offers.map(o => o.costBreakdown.linkedProducts);

  const datasets = [
    {
      label: 'Coche Neto (€)',
      data: vehicleData,
      backgroundColor: '#3b82f6',
      borderRadius: 4
    },
    {
      label: 'Intereses Bancarios (€)',
      data: interestData,
      backgroundColor: '#f43f5e',
      borderRadius: 4
    },
    {
      label: 'Comisión de Apertura (€)',
      data: feeData,
      backgroundColor: '#8b5cf6',
      borderRadius: 4
    },
    {
      label: 'Seguros y Extras Vinculados (€)',
      data: productsData,
      backgroundColor: '#f59e0b',
      borderRadius: 4
    }
  ];

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
              return `Total Desembolso: ${sum.toLocaleString('es-ES')} €`;
            }
          }
        }
      }
    }
  });
}
