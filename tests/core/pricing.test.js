import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isProductFinanced, sumLinkedProducts, resolvePrices, resolveDownPayment } from '../../src/core/pricing.js';
import { OFFER_MODALITIES } from '../../src/core/types.js';
import { DEFAULTS } from '../../src/core/constants.js';

describe('Resolución de precios y productos vinculados (pricing.js)', () => {
  test('isProductFinanced: indefinido y true se financian; solo false es al contado', () => {
    assert.equal(isProductFinanced({ cost: 100 }), true);
    assert.equal(isProductFinanced({ cost: 100, financed: true }), true);
    assert.equal(isProductFinanced({ cost: 100, financed: false }), false);
  });

  test('sumLinkedProducts separa financiados y al contado', () => {
    const result = sumLinkedProducts([
      { cost: 500 },
      { cost: '300', financed: true },
      { cost: 200, financed: false },
      { cost: 'abc', financed: false }
    ]);
    assert.deepEqual(result, { financed: 800, upfront: 200, total: 1000 });
    assert.deepEqual(sumLinkedProducts(undefined), { financed: 0, upfront: 0, total: 0 });
  });

  test('resolvePrices: contado usa el precio de oferta como referencia y sin descuento', () => {
    const prices = resolvePrices({ modality: OFFER_MODALITIES.CASH, vehiclePrice: 21000, financeDiscount: 999 });
    assert.deepEqual(prices, { offerPrice: 21000, vehiclePrice: 21000, cashPriceReference: 21000, financeDiscount: 0 });
  });

  test('resolvePrices: prioridad offerPrice → vehiclePrice → cashPriceReference', () => {
    assert.deepEqual(
      resolvePrices({ offerPrice: 20000, financeDiscount: 2000 }),
      { offerPrice: 20000, vehiclePrice: 22000, cashPriceReference: 22000, financeDiscount: 2000 }
    );
    assert.deepEqual(
      resolvePrices({ vehiclePrice: 30000, advertisedDiscount: 3500 }),
      { offerPrice: 26500, vehiclePrice: 30000, cashPriceReference: 30000, financeDiscount: 3500 }
    );
    assert.deepEqual(
      resolvePrices({ cashPriceReference: 25000, financeDiscount: 1000 }),
      { offerPrice: 24000, vehiclePrice: 25000, cashPriceReference: 25000, financeDiscount: 1000 }
    );
  });

  test('resolvePrices: sin precios usa los valores por defecto solo si se piden', () => {
    assert.deepEqual(resolvePrices({}), { offerPrice: 0, vehiclePrice: 0, cashPriceReference: 0, financeDiscount: 0 });
    assert.deepEqual(resolvePrices({}, { defaults: DEFAULTS }), {
      offerPrice: DEFAULTS.offerPrice,
      vehiclePrice: DEFAULTS.cashPriceReference,
      cashPriceReference: DEFAULTS.cashPriceReference,
      financeDiscount: DEFAULTS.cashPriceReference - DEFAULTS.offerPrice
    });
  });

  test('resolveDownPayment: la entrada manda sobre el capital informado', () => {
    const result = resolveDownPayment({ offerPrice: 20000, tradeInValue: 1000, productsFinanced: 500, downPayment: 4000, financedAmount: 99999 });
    assert.equal(result.downPayment, 4000);
    assert.equal(result.netVehicleToFinance, 15000);
    assert.equal(result.principal, 15500);
    assert.equal(result.financedAmount, 99999, 'Se respeta el capital informado');
  });

  test('resolveDownPayment: deduce la entrada a partir del capital a financiar', () => {
    const result = resolveDownPayment({ offerPrice: 22000, productsFinanced: 500, financedAmount: 18000 });
    assert.equal(result.downPayment, 4500); // 22000 + 500 - 18000
    assert.equal(result.principal, 18000);
  });

  test('resolveDownPayment: sin entrada ni capital usa la entrada por defecto', () => {
    assert.equal(resolveDownPayment({ offerPrice: 20000 }).downPayment, 0);
    const withDefault = resolveDownPayment({ offerPrice: 20000, defaultDownPayment: 4000 });
    assert.equal(withDefault.downPayment, 4000);
    assert.equal(withDefault.principal, 16000);
    assert.equal(withDefault.financedAmount, 16000);
  });
});
