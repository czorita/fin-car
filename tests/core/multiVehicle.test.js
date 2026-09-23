import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultOffer, OFFER_MODALITIES } from '../../src/core/types.js';
import { normalizeOffer } from '../../src/core/normalizer.js';
import {
  getUniqueVehicles,
  filterOffersByVehicle,
  getCrossVehicleOffers,
  rankCrossVehicleOffers
} from '../../src/core/multiVehicle.js';

describe('Gestión Multi-Vehículo (multiVehicle.js)', () => {
  const offerCorollaCash = createDefaultOffer({
    vehicle: 'Toyota Corolla',
    title: 'Al contado',
    modality: OFFER_MODALITIES.CASH,
    offerPrice: 26000,
    cashPriceReference: 26000
  });

  const offerCorollaFin = createDefaultOffer({
    vehicle: 'Toyota Corolla',
    title: 'Financiación lineal',
    modality: OFFER_MODALITIES.STANDARD_FINANCE,
    offerPrice: 23500,
    cashPriceReference: 26000,
    downPayment: 4000,
    months: 60,
    tin: 8.5
  });

  const offerTucsonCash = createDefaultOffer({
    vehicle: 'Hyundai Tucson',
    title: 'Al contado oficial',
    modality: OFFER_MODALITIES.CASH,
    offerPrice: 32000,
    cashPriceReference: 32000
  });

  const offerTucsonFin = createDefaultOffer({
    vehicle: 'Hyundai Tucson',
    title: 'Financiación flexible',
    modality: OFFER_MODALITIES.FLEXIBLE_FINANCE,
    offerPrice: 29000,
    cashPriceReference: 32000,
    downPayment: 5000,
    months: 48,
    balloonPayment: 14000,
    tin: 7.9
  });

  const legacyOfferRAV4 = createDefaultOffer({
    title: 'RAV4 fin cancelando',
    modality: OFFER_MODALITIES.FLEXIBLE_FINANCE,
    offerPrice: 42000,
    cashPriceReference: 45000,
    downPayment: 15000,
    months: 36,
    balloonPayment: 20000,
    tin: 8.0
  });

  const rawList = [offerCorollaCash, offerCorollaFin, offerTucsonCash, offerTucsonFin, legacyOfferRAV4];
  const normalizedList = rawList.map(o => normalizeOffer(o));

  test('getUniqueVehicles devuelve la lista ordenada de vehículos con sus recuentos', () => {
    const vehicles = getUniqueVehicles(rawList);
    assert.equal(vehicles.length, 3);
    assert.deepEqual(
      vehicles.map(v => v.name),
      ['Hyundai Tucson', 'RAV4', 'Toyota Corolla']
    );

    const corolla = vehicles.find(v => v.name === 'Toyota Corolla');
    assert.equal(corolla.count, 2);

    const rav4 = vehicles.find(v => v.name === 'RAV4');
    assert.equal(rav4.count, 1);
  });

  test('filterOffersByVehicle filtra correctamente por nombre de vehículo', () => {
    const corollaOffers = filterOffersByVehicle(rawList, 'Toyota Corolla');
    assert.equal(corollaOffers.length, 2);

    const tucsonOffers = filterOffersByVehicle(rawList, 'Hyundai Tucson');
    assert.equal(tucsonOffers.length, 2);

    const rav4Offers = filterOffersByVehicle(rawList, 'RAV4');
    assert.equal(rav4Offers.length, 1);

    const nonExistent = filterOffersByVehicle(rawList, 'Ferrari');
    assert.equal(nonExistent.length, 0);
  });

  test('getCrossVehicleOffers selecciona una oferta por cada coche para la modalidad dada', () => {
    const cashCross = getCrossVehicleOffers(normalizedList, OFFER_MODALITIES.CASH);
    // Solo Corolla y Tucson tienen oferta al contado
    assert.equal(cashCross.length, 2);
    // Debe estar ordenado por menor coste total: Corolla (26.000 €) < Tucson (32.000 €)
    assert.equal(cashCross[0].vehicle, 'Toyota Corolla');
    assert.equal(cashCross[1].vehicle, 'Hyundai Tucson');

    const flexibleCross = getCrossVehicleOffers(normalizedList, OFFER_MODALITIES.FLEXIBLE_FINANCE);
    // Tucson y RAV4 tienen ofertas flexibles
    assert.equal(flexibleCross.length, 2);
    assert.equal(flexibleCross[0].vehicle, 'Hyundai Tucson');
    assert.equal(flexibleCross[1].vehicle, 'RAV4');
  });

  test('rankCrossVehicleOffers detecta el coche ganador y calcula diferencias relativas', () => {
    const cashCross = getCrossVehicleOffers(normalizedList, OFFER_MODALITIES.CASH);
    const result = rankCrossVehicleOffers(cashCross);

    assert.equal(result.rankedOffers.length, 2);
    assert.equal(result.winnerOffer.vehicle, 'Toyota Corolla');
    assert.equal(result.maxDiff, 6000); // 32000 - 26000
    assert.equal(result.rankedOffers[0].crossHighlight, '');
    assert.equal(result.rankedOffers[1].crossDiffVsWinner, 6000);
    assert.ok(result.rankedOffers[1].crossHighlight.includes('Toyota Corolla'));
  });

  test('rankCrossVehicleOffers maneja caso de un solo vehículo', () => {
    const single = [normalizedList[0]];
    const result = rankCrossVehicleOffers(single);
    assert.equal(result.rankedOffers.length, 1);
    assert.equal(result.maxDiff, 0);
    assert.ok(result.summaryMessage.includes('Solo hay 1 vehículo disponible'));
  });

  test('rankCrossVehicleOffers detecta ganador TCO equiparado con servicios incluidos entre RAV4 y Tucson', () => {
    // Tucson: financiado cuesta 30.000 € (sin servicios incluidos, TCO = 30.000 €)
    const tucson = normalizeOffer(
      createDefaultOffer({
        id: 'tucson_1',
        vehicle: 'Hyundai Tucson',
        modality: OFFER_MODALITIES.STANDARD_FINANCE,
        vehiclePrice: 30000,
        offerPrice: 30000,
        downPayment: 30000, // para fijar totalOutOfPocketCost = 30.000
        months: 60,
        tin: 0,
        includedServices: []
      })
    );

    // RAV4: financiado cuesta 31.000 € (1.000 € más en desembolso financiero), pero incluye 1.950 € en servicios
    // TCO RAV4 = 31.000 - 1.950 = 29.050 € (¡menor coste a igualdad de condiciones!)
    const rav4 = normalizeOffer(
      createDefaultOffer({
        id: 'rav4_1',
        vehicle: 'Toyota RAV4',
        modality: OFFER_MODALITIES.STANDARD_FINANCE,
        vehiclePrice: 31000,
        offerPrice: 31000,
        downPayment: 31000,
        months: 60,
        tin: 0,
        includedServices: [
          { id: 's1', name: 'Mantenimiento 4 años', marketValue: 1200 },
          { id: 's2', name: 'Seguro todo riesgo', marketValue: 750 }
        ]
      })
    );

    const result = rankCrossVehicleOffers([tucson, rav4]);
    // Ganador financiero en caja: Tucson (30.000 € < 31.000 €)
    assert.equal(result.winnerOffer.id, 'tucson_1');
    // Ganador TCO equiparado: RAV4 (29.050 € < 30.000 €)
    assert.equal(result.winnerTcoOffer.id, 'rav4_1');

    const rav4Ranked = result.rankedOffers.find(o => o.id === 'rav4_1');
    assert.equal(rav4Ranked.isTcoWinner, true, 'El RAV4 debe marcarse como ganador de TCO');
    assert.ok(
      result.summaryMessage.includes('TCO equiparado'),
      'El resumen debe explicar que el RAV4 resulta más rentable en TCO'
    );
  });

  test('getCrossVehicleOffers selecciona correctamente ofertas bajo modalidad early_cancellation', () => {
    const corollaEC = normalizeOffer(
      createDefaultOffer({
        id: 'corolla_ec',
        vehicle: 'Toyota Corolla',
        modality: OFFER_MODALITIES.EARLY_CANCELLATION,
        vehiclePrice: 27000,
        financeDiscount: 3000,
        downPayment: 4000,
        months: 84,
        earlyCancellationMonth: 24,
        tin: 8.5
      })
    );

    const corollaStd = normalizeOffer(
      createDefaultOffer({
        id: 'corolla_std',
        vehicle: 'Toyota Corolla',
        modality: OFFER_MODALITIES.STANDARD_FINANCE,
        vehiclePrice: 27000,
        financeDiscount: 3000,
        downPayment: 4000,
        months: 60,
        tin: 8.5
      })
    );

    const cross = getCrossVehicleOffers([corollaEC, corollaStd], OFFER_MODALITIES.EARLY_CANCELLATION);
    assert.equal(cross.length, 1);
    assert.equal(cross[0].id, 'corolla_ec');
  });
});
