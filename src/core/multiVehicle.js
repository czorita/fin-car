/**
 * Utilidades Core para Comparación Multi-Vehículo.
 * Gestiona la separación y agrupación por modelo de coche, así como
 * el emparejamiento y ranking cruzado entre diferentes vehículos bajo una misma modalidad.
 */

import { getOfferVehicle } from './types.js';

/**
 * Devuelve la lista única de nombres de vehículos disponibles en las ofertas,
 * junto con el número de ofertas asociadas a cada uno.
 * @param {Array<object>} offers
 * @returns {Array<{ name: string, count: number }>}
 */
export function getUniqueVehicles(offers) {
  if (!Array.isArray(offers) || offers.length === 0) {
    return [];
  }

  const map = new Map();
  for (const offer of offers) {
    const vName = getOfferVehicle(offer);
    map.set(vName, (map.get(vName) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

/**
 * Filtra las ofertas pertenecientes a un vehículo específico.
 * @param {Array<object>} offers
 * @param {string} vehicleName
 * @returns {Array<object>}
 */
export function filterOffersByVehicle(offers, vehicleName) {
  if (!Array.isArray(offers) || !vehicleName) {
    return [];
  }
  const target = vehicleName.trim().toLowerCase();
  return offers.filter(o => getOfferVehicle(o).toLowerCase() === target);
}

/**
 * Selecciona una oferta representativa por cada vehículo para una modalidad determinada.
 * Si un vehículo tiene varias ofertas de esa modalidad, selecciona la de menor coste total.
 * @param {Array<import('./normalizer.js').NormalizedOffer>} normalizedOffers
 * @param {'cash' | 'standard_finance' | 'flexible_finance' | 'early_cancellation' | 'best_overall'} modality
 * @returns {Array<import('./normalizer.js').NormalizedOffer>}
 */
export function getCrossVehicleOffers(normalizedOffers, modality = 'cash') {
  if (!Array.isArray(normalizedOffers) || normalizedOffers.length === 0) {
    return [];
  }

  // Agrupar por vehículo
  const vehiclesMap = new Map();
  for (const offer of normalizedOffers) {
    const vName = getOfferVehicle(offer);
    if (!vehiclesMap.has(vName)) {
      vehiclesMap.set(vName, []);
    }
    vehiclesMap.get(vName).push(offer);
  }

  const selectedOffers = [];

  for (const [, vehicleOffers] of vehiclesMap.entries()) {
    let candidate = null;

    if (modality === 'best_overall') {
      // El de menor coste total del coche sin importar modalidad
      candidate = [...vehicleOffers].sort((a, b) => a.totalOutOfPocketCost - b.totalOutOfPocketCost)[0];
    } else {
      const matching = vehicleOffers.filter(o => {
        if (modality === 'early_cancellation') {
          return o.modality === 'early_cancellation' || o.isEarlyCancellation;
        }
        return o.modality === modality;
      });
      if (matching.length > 0) {
        // El de menor coste de esa modalidad
        candidate = [...matching].sort((a, b) => a.totalOutOfPocketCost - b.totalOutOfPocketCost)[0];
      }
    }

    if (candidate) {
      selectedOffers.push(candidate);
    }
  }

  // Ordenar los vehículos seleccionados por menor coste total
  return selectedOffers.sort((a, b) => a.totalOutOfPocketCost - b.totalOutOfPocketCost);
}

/**
 * Clasifica y analiza las ofertas entre distintos vehículos bajo una misma modalidad.
 * Determina el coche ganador y las diferencias de desembolso entre ellos.
 * @param {Array<import('./normalizer.js').NormalizedOffer>} crossOffers
 * @returns {{
 *   rankedOffers: Array<import('./normalizer.js').NormalizedOffer & { crossDiffVsWinner: number, crossHighlight: string }>,
 *   winnerOffer: import('./normalizer.js').NormalizedOffer | null,
 *   maxDiff: number,
 *   summaryMessage: string
 * }}
 */
export function rankCrossVehicleOffers(crossOffers) {
  if (!Array.isArray(crossOffers) || crossOffers.length === 0) {
    return {
      rankedOffers: [],
      winnerOffer: null,
      maxDiff: 0,
      summaryMessage: 'No hay ofertas de esta modalidad para comparar entre vehículos.'
    };
  }

  const sorted = [...crossOffers].sort((a, b) => a.totalOutOfPocketCost - b.totalOutOfPocketCost);
  const winner = sorted[0];
  const maxDiff = sorted.length > 1
    ? Number((sorted[sorted.length - 1].totalOutOfPocketCost - winner.totalOutOfPocketCost).toFixed(2))
    : 0;

  // Análisis por coste equiparado (TCO) considerando servicios incluidos
  const sortedByTco = [...crossOffers].sort((a, b) => (a.adjustedTcoCost ?? a.totalOutOfPocketCost) - (b.adjustedTcoCost ?? b.totalOutOfPocketCost));
  const winnerTco = sortedByTco[0];
  const hasIncludedServices = crossOffers.some(o => (o.includedServicesValue || 0) > 0);

  const rankedOffers = sorted.map((offer, index) => {
    const diffVsWinner = Number((offer.totalOutOfPocketCost - winner.totalOutOfPocketCost).toFixed(2));
    const vehicleName = getOfferVehicle(offer);
    const offerTco = offer.adjustedTcoCost !== undefined ? offer.adjustedTcoCost : offer.totalOutOfPocketCost;
    const winnerTcoVal = winnerTco.adjustedTcoCost !== undefined ? winnerTco.adjustedTcoCost : winnerTco.totalOutOfPocketCost;
    const crossTcoDiffVsWinner = Number((offerTco - winnerTcoVal).toFixed(2));

    let crossHighlight;
    if (index === 0) {
      crossHighlight = '';
    } else if (index === 1 && sorted.length > 2) {
      crossHighlight = '🥈 2º más económico';
    } else {
      crossHighlight = `+${diffVsWinner.toLocaleString('es-ES')} € vs ${getOfferVehicle(winner)}`;
    }

    return {
      ...offer,
      vehicleName,
      crossDiffVsWinner: diffVsWinner,
      crossHighlight,
      crossTcoDiffVsWinner,
      isTcoWinner: hasIncludedServices && offer.id === winnerTco.id
    };
  });

  let summaryMessage;
  if (sorted.length === 1) {
    summaryMessage = `Solo hay 1 vehículo disponible con esta modalidad (${getOfferVehicle(winner)}: ${winner.totalOutOfPocketCost.toLocaleString('es-ES')} €). Añade ofertas de otros coches para ver la comparativa.`;
  } else {
    summaryMessage = `🏆 ${getOfferVehicle(winner)} es el coche más económico con un desembolso financiero de ${winner.totalOutOfPocketCost.toLocaleString('es-ES')} €, ahorrando ${maxDiff.toLocaleString('es-ES')} € frente a ${getOfferVehicle(sorted[sorted.length - 1])}.`;
    if (hasIncludedServices && winnerTco.id !== winner.id) {
      summaryMessage += ` No obstante, a igualdad de condiciones (TCO equiparado con servicios incluidos), ${getOfferVehicle(winnerTco)} resulta más rentable (${(winnerTco.adjustedTcoCost || winnerTco.totalOutOfPocketCost).toLocaleString('es-ES')} €).`;
    }
  }

  return {
    rankedOffers,
    winnerOffer: winner,
    winnerTcoOffer: hasIncludedServices ? winnerTco : null,
    maxDiff,
    summaryMessage
  };
}
