import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFinancedPrincipal,
  computeNetBeforeDownPayment,
  deriveModality,
  formValuesToOffer,
  modalityToPaymentChoice,
  offerToFormValues,
  parseMonths
} from '../../src/components/offerModal/formSerializer.js';
import { OFFER_MODALITIES, createDefaultOffer } from '../../src/core/types.js';
import { normalizeOffer } from '../../src/core/normalizer.js';

/** Valores de formulario vacíos (como tras form.reset()) */
const EMPTY_VALUES = {
  id: '',
  vehicle: '',
  dealer: '',
  notes: '',
  offerPrice: '',
  financeDiscount: '',
  downPayment: '',
  financedAmount: '',
  tradeInValue: '',
  months: '',
  tin: '',
  manualMonthly: '',
  balloonPayment: '',
  cancelEarly: false,
  earlyCancelMonth: '24',
  earlyCancelPenalty: '1,0'
};

const NO_LISTS = { linkedProducts: [], includedServices: [] };

describe('Serialización del formulario de oferta (formSerializer.js)', () => {
  test('parseMonths redondea, aplica mínimo 1 y usa el valor por defecto', () => {
    assert.equal(parseMonths('48'), 48);
    assert.equal(parseMonths('47.6'), 48);
    assert.equal(parseMonths(''), 60);
    assert.equal(parseMonths('', 24), 24);
    assert.equal(parseMonths('-5'), 1);
  });

  test('El capital financiado incluye los productos financiados (financed indefinido = financiado)', () => {
    const linkedProducts = [{ cost: 350, financed: true }, { cost: 200 }, { cost: 500, financed: false }];
    assert.equal(
      computeFinancedPrincipal({ offerPrice: '30000', downPayment: '5000', tradeInValue: '1000', linkedProducts }),
      24550
    );
    assert.equal(computeNetBeforeDownPayment({ offerPrice: '30000', tradeInValue: '1000', linkedProducts }), 29550);
  });

  test('Financiación estándar con TIN: descarta la cuota derivada y calcula precios de referencia', () => {
    const offer = formValuesToOffer(
      {
        ...EMPTY_VALUES,
        vehicle: ' Toyota RAV4 ',
        offerPrice: '30000',
        financeDiscount: '2000,00',
        downPayment: '5000',
        financedAmount: '25.000,00',
        months: '48',
        tin: '6,5',
        manualMonthly: '592,87'
      },
      { modality: OFFER_MODALITIES.STANDARD_FINANCE, financingMode: 'tin', ...NO_LISTS }
    );

    assert.equal(offer.vehicle, 'Toyota RAV4');
    assert.equal(offer.offerPrice, 30000);
    assert.equal(offer.cashPriceReference, 32000);
    assert.equal(offer.financeDiscount, 2000);
    assert.equal(offer.downPayment, 5000);
    assert.equal(offer.financedAmount, 25000);
    assert.equal(offer.tin, 6.5);
    assert.equal(offer.manualMonthlyPayment, null, 'En modo TIN la cuota es derivada y no se guarda');
    assert.equal(offer.months, 48);
    assert.equal(offer.earlyCancellationMonth, 0);
    assert.ok(offer.id.startsWith('offer_'));
  });

  test('Modo cuota: guarda la cuota manual y deduce el TIN', () => {
    const offer = formValuesToOffer(
      {
        ...EMPTY_VALUES,
        offerPrice: '25000',
        downPayment: '5000',
        months: '60',
        manualMonthly: '400'
      },
      { modality: OFFER_MODALITIES.STANDARD_FINANCE, financingMode: 'monthly', ...NO_LISTS }
    );

    assert.equal(offer.manualMonthlyPayment, 400);
    assert.ok(offer.tin > 7 && offer.tin < 8, `TIN deducido razonable: ${offer.tin}`);
    assert.equal(offer.financedAmount, 20000, 'Sin capital informado se usa el principal calculado');
  });

  test('Contado: sin entrada, financiación ni descuento', () => {
    const offer = formValuesToOffer(
      {
        ...EMPTY_VALUES,
        offerPrice: '26000',
        financeDiscount: '1500',
        downPayment: '0',
        financedAmount: '0'
      },
      { modality: OFFER_MODALITIES.CASH, financingMode: null, ...NO_LISTS }
    );

    assert.equal(offer.financeDiscount, 0);
    assert.equal(offer.cashPriceReference, 26000);
    assert.equal(offer.downPayment, 0);
    assert.equal(offer.financedAmount, 0);
    assert.equal(offer.months, 60, 'Plazo vacío en contado: se usa el valor por defecto');
  });

  test('Flexible con cancelación anticipada: cuota final, mes y comisión', () => {
    const offer = formValuesToOffer(
      {
        ...EMPTY_VALUES,
        offerPrice: '28000',
        downPayment: '4000',
        months: '48',
        tin: '7,9',
        balloonPayment: '12.000,00',
        cancelEarly: true,
        earlyCancelMonth: '18',
        earlyCancelPenalty: '0,5'
      },
      { modality: OFFER_MODALITIES.FLEXIBLE_FINANCE, financingMode: 'tin', ...NO_LISTS }
    );

    assert.equal(offer.balloonPayment, 12000);
    assert.equal(offer.cancelEarly, true);
    assert.equal(offer.earlyCancellationMonth, 18);
    assert.equal(offer.earlyCancellationPenaltyRate, 0.5);
  });

  test('La cuota final y la cancelación se ignoran fuera de su modalidad', () => {
    const offer = formValuesToOffer(
      {
        ...EMPTY_VALUES,
        offerPrice: '20000',
        downPayment: '0',
        tin: '5',
        balloonPayment: '9000',
        cancelEarly: true
      },
      { modality: OFFER_MODALITIES.STANDARD_FINANCE, financingMode: 'tin', ...NO_LISTS }
    );

    assert.equal(offer.balloonPayment, 0);
    assert.equal(offer.cancelEarly, false);
    assert.equal(offer.earlyCancellationPenaltyRate, 0);
  });

  test('Ida y vuelta: offerToFormValues → formValuesToOffer conserva la oferta', () => {
    const original = createDefaultOffer({
      id: 'offer_test_1',
      vehicle: 'Hyundai Tucson',
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      offerPrice: 31500,
      financeDiscount: 2500,
      downPayment: 6000,
      tradeInValue: 1500,
      months: 72,
      tin: 7.49,
      linkedProducts: [{ id: 'p1', name: 'Seguro', cost: 420, financed: true }],
      includedServices: [{ id: 's1', name: 'Mantenimiento', marketValue: 900 }]
    });

    const form = offerToFormValues(original);
    assert.equal(form.downPaymentMode, 'down');
    assert.equal(form.financingMode, 'tin');

    const rebuilt = formValuesToOffer(form.values, {
      modality: form.modality,
      financingMode: form.financingMode,
      linkedProducts: form.linkedProducts,
      includedServices: form.includedServices
    });

    for (const key of [
      'id',
      'vehicle',
      'modality',
      'offerPrice',
      'financeDiscount',
      'cashPriceReference',
      'downPayment',
      'tradeInValue',
      'months',
      'tin'
    ]) {
      assert.deepEqual(rebuilt[key], original[key], `Campo ${key}`);
    }
    assert.deepEqual(rebuilt.linkedProducts, original.linkedProducts);
    assert.deepEqual(rebuilt.includedServices, original.includedServices);

    const a = normalizeOffer(original);
    const b = normalizeOffer(createDefaultOffer(rebuilt));
    assert.equal(b.totalOutOfPocketCost, a.totalOutOfPocketCost, 'Mismo coste total tras editar sin cambios');
  });

  test('offerToFormValues: cuota manual, solo capital financiado y contado', () => {
    const monthly = offerToFormValues({
      modality: OFFER_MODALITIES.STANDARD_FINANCE,
      manualMonthlyPayment: 345.5,
      tin: 7
    });
    assert.equal(monthly.financingMode, 'monthly');
    assert.equal(monthly.values.manualMonthly, '345,5');
    assert.equal(monthly.values.tin, '');

    const financedOnly = offerToFormValues({ modality: OFFER_MODALITIES.STANDARD_FINANCE, financedAmount: 20000 });
    assert.equal(financedOnly.downPaymentMode, 'financed');
    assert.equal(financedOnly.values.financedAmount, '20000');
    assert.equal(financedOnly.values.tin, '8,5', 'TIN por defecto');

    const cash = offerToFormValues({ modality: OFFER_MODALITIES.CASH, offerPrice: 24800 });
    assert.equal(cash.downPaymentMode, null);
    assert.equal(cash.values.downPayment, '0');
    assert.equal(cash.values.financedAmount, '0');
  });
});

describe('Modalidad deducida del formulario (deriveModality / modalityToPaymentChoice)', () => {
  test('Contado, lineal, flexible (hay cuota final) y cancelación anticipada', () => {
    assert.equal(deriveModality({ payType: 'cash', balloonPayment: '9000', cancelEarly: true }), OFFER_MODALITIES.CASH);
    assert.equal(deriveModality({ payType: 'finance' }), OFFER_MODALITIES.STANDARD_FINANCE);
    assert.equal(
      deriveModality({ payType: 'finance', balloonPayment: '12.000,50' }),
      OFFER_MODALITIES.FLEXIBLE_FINANCE
    );
    assert.equal(
      deriveModality({ payType: 'finance', balloonPayment: '12000', cancelEarly: true }),
      OFFER_MODALITIES.FLEXIBLE_FINANCE,
      'Con cuota final y cancelación: flexible con cancelEarly'
    );
    assert.equal(deriveModality({ payType: 'finance', cancelEarly: true }), OFFER_MODALITIES.EARLY_CANCELLATION);
    assert.equal(deriveModality({ payType: 'finance', balloonPayment: '0' }), OFFER_MODALITIES.STANDARD_FINANCE);
  });

  test('Inversa: cómo se presenta cada modalidad guardada', () => {
    assert.deepEqual(modalityToPaymentChoice(OFFER_MODALITIES.CASH), { payType: 'cash', cancelEarly: false });
    assert.deepEqual(modalityToPaymentChoice(OFFER_MODALITIES.STANDARD_FINANCE), {
      payType: 'finance',
      cancelEarly: false
    });
    assert.deepEqual(modalityToPaymentChoice(OFFER_MODALITIES.EARLY_CANCELLATION), {
      payType: 'finance',
      cancelEarly: true
    });
    assert.deepEqual(modalityToPaymentChoice(OFFER_MODALITIES.FLEXIBLE_FINANCE, true), {
      payType: 'finance',
      cancelEarly: true
    });
  });

  test('Ida y vuelta: toda modalidad guardada se vuelve a deducir igual', () => {
    const cases = [
      [OFFER_MODALITIES.CASH, false, ''],
      [OFFER_MODALITIES.STANDARD_FINANCE, false, ''],
      [OFFER_MODALITIES.EARLY_CANCELLATION, false, ''],
      [OFFER_MODALITIES.FLEXIBLE_FINANCE, false, '12000'],
      [OFFER_MODALITIES.FLEXIBLE_FINANCE, true, '12000']
    ];
    for (const [modality, cancelEarly, balloonPayment] of cases) {
      const choice = modalityToPaymentChoice(modality, cancelEarly);
      assert.equal(deriveModality({ ...choice, balloonPayment }), modality, modality);
    }
  });
});
