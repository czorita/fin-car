/**
 * Controlador del Modal de Oferta (Creación y Edición) como asistente en 3 pasos:
 * 1. Coche · 2. Pago · 3. Letra pequeña (opcional), con un resumen en vivo del coste real.
 *
 * Los datos se introducen tal cual los da el concesionario y el resto se calcula:
 * - Escenario "Entrada + cuotas" o "Importe a financiar + cuotas" (par entrada ↔ capital financiado).
 * - Cuota mensual o TIN (par TIN ↔ cuota), con o sin cuota final.
 * La modalidad guardada se deduce (deriveModality): contado, lineal, flexible (hay cuota final)
 * o cancelación anticipada (interruptor "Pienso cancelar antes de tiempo").
 *
 * Reutiliza sin cambios el motor de cálculo del formulario:
 * - Pares enlazados (offerModal/derivedPair.js), cancelación anticipada (offerModal/earlyCancellationPanel.js),
 *   listas editables (offerModal/editableList.js) y serialización pura (offerModal/formSerializer.js).
 * Admite comas decimales en todos los campos numéricos mediante parseLocaleNumber.
 */

import { OFFER_MODALITIES, createDefaultOffer } from '../core/types.js';
import {
  parseLocaleNumber,
  parseLocaleRate,
  formatLocaleNumber,
  formatMonthsDuration,
  formatAprPercent
} from '../core/formatters.js';
import { generateId, ID_PREFIX_PRODUCT, ID_PREFIX_SERVICE, DEFAULTS } from '../core/constants.js';
import { getVehicleImageUrl } from '../core/vehicleCatalog.js';
import { calculateMonthlyPayment, reverseEngineerInterestRate } from '../core/finance.js';
import { normalizeOffer } from '../core/normalizer.js';
import { setVisible, el } from '../ui/dom.js';
import { createDerivedPair } from './offerModal/derivedPair.js';
import { createEarlyCancellationPanel } from './offerModal/earlyCancellationPanel.js';
import { createEditableList } from './offerModal/editableList.js';
import {
  computeFinancedPrincipal,
  computeNetBeforeDownPayment,
  deriveModality,
  formValuesToOffer,
  modalityToPaymentChoice,
  offerToFormValues,
  parseMonths
} from './offerModal/formSerializer.js';

/** Plazo que se propone al activar la cancelación anticipada si el campo está vacío */
const EARLY_CANCELLATION_DEFAULT_MONTHS = '84';

/** Producto vinculado y servicio incluido que se añaden por defecto */
const NEW_LINKED_PRODUCT = { name: 'Seguro de protección de pagos', cost: 350, financed: true };
const NEW_CUSTOM_SERVICE = { name: 'Mantenimiento / Seguro oficial', marketValue: 500 };

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const TOTAL_STEPS = 3;

/** @param {number} value */
const euros = value => `${Number(value || 0).toLocaleString('es-ES')} €`;

/**
 * Localiza los elementos del formulario de oferta.
 * @returns {Record<string, any>}
 */
function queryElements() {
  const byId = id => document.getElementById(id);
  return {
    dialog: byId('modal-offer'),
    form: byId('form-offer'),
    modalTitle: byId('modal-offer-title'),
    btnClose: byId('btn-close-offer-modal'),
    btnCancel: byId('btn-cancel-offer'),
    // Asistente
    wizardProgress: byId('wizard-progress'),
    btnPrev: byId('btn-wizard-prev'),
    btnNext: byId('btn-wizard-next'),
    // Paso 1
    idInput: byId('offer-id'),
    vehicleInput: byId('offer-vehicle'),
    vehiclesDatalist: byId('vehicles-datalist'),
    vehicleAutoPreview: byId('vehicle-auto-preview'),
    imageThumb: byId('vehicle-image-thumb'),
    imagePlaceholder: byId('vehicle-image-placeholder'),
    dealerInput: byId('offer-dealer'),
    notesInput: byId('offer-notes'),
    notesDisclosure: byId('notes-disclosure'),
    // Paso 2
    paymentType: byId('payment-type'),
    offerPriceLabel: byId('offer-price-label'),
    offerPriceHelp: byId('offer-price-help'),
    groupFinanceDiscount: byId('group-finance-discount'),
    offerPriceInput: byId('offer-price'),
    financeDiscountInput: byId('finance-discount'),
    cashRefSummaryText: byId('cash-ref-summary-text'),
    tradeInDisclosure: byId('trade-in-disclosure'),
    tradeInValueInput: byId('trade-in-value'),
    financeFieldsContainer: byId('finance-fields-container'),
    financingScenario: byId('financing-scenario'),
    groupDownPayment: byId('group-down-payment'),
    groupFinancedAmount: byId('group-financed-amount'),
    downPaymentInput: byId('down-payment'),
    financedAmountInput: byId('financed-amount'),
    downPaymentHelper: byId('down-payment-helper'),
    financedAmountHelper: byId('financed-amount-helper'),
    loanMonthsInput: byId('loan-months'),
    loanMonthsBadge: byId('loan-months-badge'),
    loanMonthsPills: byId('loan-months-pills'),
    groupManualMonthly: byId('group-manual-monthly'),
    groupLoanTin: byId('group-loan-tin'),
    loanTinInput: byId('loan-tin'),
    manualMonthlyInput: byId('manual-monthly'),
    loanTinHelper: byId('loan-tin-helper'),
    manualMonthlyHelper: byId('manual-monthly-helper'),
    toggleRateModeBtn: byId('toggle-rate-mode'),
    balloonPaymentInput: byId('balloon-payment'),
    financeCalcFeedback: byId('finance-calc-feedback'),
    financeCalcFeedbackText: byId('finance-calc-feedback-text'),
    scenarioDerivedText: byId('scenario-derived-text'),
    cancelEarlyToggle: byId('cancel-early-toggle'),
    earlyCancellationContainer: byId('early-cancellation-container'),
    earlyCancelMonthInput: byId('early-cancel-month'),
    cancelMonthsPills: byId('cancel-months-pills'),
    earlyCancelPenaltyInput: byId('early-cancel-penalty'),
    penaltyQuickPills: byId('penalty-quick-pills'),
    cancelSummaryMonth: byId('cancel-summary-month'),
    cancelSummaryCapital: byId('cancel-summary-capital'),
    cancelSummaryRate: byId('cancel-summary-rate'),
    cancelSummaryPenalty: byId('cancel-summary-penalty'),
    cancelSummarySettlement: byId('cancel-summary-settlement'),
    cancelSummarySaved: byId('cancel-summary-saved'),
    // Paso 3
    linkedProductsSection: byId('linked-products-section'),
    productsListContainer: byId('linked-products-list'),
    btnAddProduct: byId('btn-add-product'),
    tmplProduct: byId('tmpl-linked-product'),
    includedServicesContainer: byId('included-services-list'),
    includedServicesTotalBadge: byId('included-services-total-badge'),
    btnAddCustomService: byId('btn-add-custom-service'),
    tmplIncludedService: byId('tmpl-included-service'),
    // Resumen en vivo
    liveSummaryEmpty: byId('live-summary-empty'),
    liveSummaryList: byId('live-summary-list'),
    liveTotal: byId('live-total'),
    liveMonthly: byId('live-monthly'),
    liveDown: byId('live-down'),
    liveFinanced: byId('live-financed'),
    liveRates: byId('live-rates'),
    liveInterest: byId('live-interest'),
    liveVsCash: byId('live-vs-cash'),
    liveVerdict: byId('live-verdict')
  };
}

/**
 * Inicializa el modal de formulario de oferta.
 * @param {object} options
 * @param {Function} options.onSave
 * @param {() => Array<string>} [options.getKnownVehicles]
 * @returns {{
 *   open: (offer?: any, defaultVehicle?: string|null, openOptions?: { rateMode?: 'tin'|'monthly', step?: number }) => void,
 *   close: () => void
 * }}
 */
export function initOfferModal({ onSave, getKnownVehicles }) {
  const els = queryElements();
  const { dialog, form } = els;

  /** @type {'cash'|'finance'} */
  let payType = 'finance';
  /** Campo del par entrada ↔ capital financiado que introduce el usuario */
  let scenario = 'down';
  /** Campo del par TIN ↔ cuota que introduce el usuario */
  let rateMode = 'monthly';
  let currentModality = OFFER_MODALITIES.STANDARD_FINANCE;
  let currentStep = 1;

  // ---------------------------------------------------------------------------
  // Lectura de valores del formulario
  // ---------------------------------------------------------------------------

  /** @returns {import('./offerModal/formSerializer.js').OfferFormValues} */
  function readFormValues() {
    return {
      id: els.idInput.value,
      vehicle: els.vehicleInput?.value || '',
      dealer: els.dealerInput.value,
      notes: els.notesInput.value,
      offerPrice: els.offerPriceInput.value,
      financeDiscount: els.financeDiscountInput.value,
      downPayment: els.downPaymentInput.value,
      financedAmount: els.financedAmountInput?.value || '',
      tradeInValue: els.tradeInValueInput.value,
      months: els.loanMonthsInput.value,
      tin: els.loanTinInput.value,
      manualMonthly: els.manualMonthlyInput.value,
      balloonPayment: els.balloonPaymentInput.value,
      cancelEarly: isCancelEarly(),
      earlyCancelMonth: els.earlyCancelMonthInput?.value || '',
      earlyCancelPenalty: els.earlyCancelPenaltyInput?.value || ''
    };
  }

  const isCancelEarly = () => payType === 'finance' && Boolean(els.cancelEarlyToggle?.checked);
  const getLinkedProducts = () => productsList.getItems();
  const getFinancedPrincipal = () =>
    computeFinancedPrincipal({ ...readFormValues(), linkedProducts: getLinkedProducts() });
  const getMonths = () => parseMonths(els.loanMonthsInput?.value);
  const getBalloon = () =>
    currentModality === OFFER_MODALITIES.FLEXIBLE_FINANCE ? parseLocaleNumber(els.balloonPaymentInput?.value || 0) : 0;

  // ---------------------------------------------------------------------------
  // Paneles de cálculo (motor sin cambios)
  // ---------------------------------------------------------------------------

  const downPaymentPair = createDerivedPair({
    first: {
      mode: 'down',
      input: els.downPaymentInput,
      unlockBtn: null,
      helper: els.downPaymentHelper,
      activeHelperText: '',
      derive: () => {
        const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
        if (!(price > 0 && els.downPaymentInput.value.trim() !== '')) return null;
        const netBeforeDown = computeNetBeforeDownPayment({ ...readFormValues(), linkedProducts: getLinkedProducts() });
        const fin = Math.max(0, netBeforeDown - parseLocaleNumber(els.downPaymentInput.value));
        return { value: formatLocaleNumber(fin), helperText: '' };
      }
    },
    second: {
      mode: 'financed',
      input: els.financedAmountInput,
      unlockBtn: null,
      helper: els.financedAmountHelper,
      activeHelperText: '',
      derive: () => {
        const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
        if (!(price > 0 && els.financedAmountInput.value.trim() !== '')) return null;
        const netBeforeDown = computeNetBeforeDownPayment({ ...readFormValues(), linkedProducts: getLinkedProducts() });
        const down = Math.max(0, netBeforeDown - parseLocaleNumber(els.financedAmountInput.value));
        return { value: formatLocaleNumber(down), helperText: '' };
      }
    },
    onChange: () => recalculate()
  });

  const financingPair = createDerivedPair({
    first: {
      mode: 'tin',
      input: els.loanTinInput,
      unlockBtn: null,
      helper: els.loanTinHelper,
      activeHelperText: '',
      derive: () => {
        const principal = getFinancedPrincipal();
        const months = getMonths();
        const tin = parseLocaleRate(els.loanTinInput.value);
        if (!(principal > 0 && months > 0 && tin >= 0 && els.loanTinInput.value.trim() !== '')) return null;
        const cuota = calculateMonthlyPayment(principal, tin, months, getBalloon());
        const cuotaText = cuota.toLocaleString('es-ES', TWO_DECIMALS);
        return {
          value: formatLocaleNumber(cuota),
          helperText: '',
          feedback: `Cuota calculada: ${cuotaText} €/mes al ${formatLocaleNumber(tin)} % TIN.`
        };
      }
    },
    second: {
      mode: 'monthly',
      input: els.manualMonthlyInput,
      unlockBtn: null,
      helper: els.manualMonthlyHelper,
      activeHelperText: '',
      derive: () => {
        const principal = getFinancedPrincipal();
        const months = getMonths();
        const cuota = parseLocaleNumber(els.manualMonthlyInput.value);
        if (!(principal > 0 && months > 0 && cuota > 0 && els.manualMonthlyInput.value.trim() !== '')) return null;
        const deduced = reverseEngineerInterestRate(principal, cuota, months, getBalloon());
        return {
          value: formatLocaleNumber(deduced.tin),
          helperText: '',
          feedback: `Interés deducido de la cuota: TIN ${deduced.tin.toLocaleString('es-ES', TWO_DECIMALS)} % · TAE ≈ ${deduced.apr.toLocaleString('es-ES', TWO_DECIMALS)} %.`
        };
      }
    },
    onChange: () => recalculate()
  });

  const earlyCancellationPanel = createEarlyCancellationPanel(els, {
    getMode: () => ({
      isEarlyCancel: currentModality === OFFER_MODALITIES.EARLY_CANCELLATION,
      isFlexibleEarly: currentModality === OFFER_MODALITIES.FLEXIBLE_FINANCE && isCancelEarly()
    }),
    getPrincipal: getFinancedPrincipal,
    getFinancingMode: () => financingPair.getMode(),
    onChange: () => recalculate()
  });

  const productsList = createEditableList({
    container: els.productsListContainer,
    template: els.tmplProduct,
    rowSelector: '.linked-product-row',
    removeSelector: '.btn-remove-prod, .btn-remove-product',
    emptyText: 'Nada obligatorio.',
    fields: [
      { selector: '.prod-name, .product-name', prop: 'name', kind: 'text' },
      { selector: '.prod-cost, .product-cost', prop: 'cost', kind: 'number' },
      { selector: '.prod-financed, .product-financed', prop: 'financed', kind: 'checkbox' }
    ],
    onChange: () => recalculate()
  });

  const servicesList = createEditableList({
    container: els.includedServicesContainer,
    template: els.tmplIncludedService,
    rowSelector: '.included-service-row',
    removeSelector: '.btn-remove-service',
    emptyText: 'Nada incluido de regalo.',
    fields: [
      { selector: '.service-name', prop: 'name', kind: 'text' },
      { selector: '.service-value', prop: 'marketValue', kind: 'number' }
    ],
    onChange: () => {
      updateIncludedServicesTotalBadge();
      updateLiveSummary();
    }
  });

  // ---------------------------------------------------------------------------
  // Actualizaciones de la UI
  // ---------------------------------------------------------------------------

  function updateIncludedServicesTotalBadge() {
    const badge = els.includedServicesTotalBadge;
    if (!badge) return;
    const totalVal = servicesList.getItems().reduce((sum, s) => sum + (Number(s.marketValue) || 0), 0);
    setVisible(badge, totalVal > 0, 'inline-flex');
    if (totalVal > 0) badge.textContent = `🎁 ${totalVal.toLocaleString('es-ES')} € en servicios`;
  }

  /**
   * Marca la opción activa de un grupo de botones.
   * @param {HTMLElement|null} group
   * @param {string} attr Atributo data-* que identifica cada opción
   * @param {string} value
   */
  function markActive(group, attr, value) {
    group?.querySelectorAll(`[data-${attr}]`).forEach(btn => {
      const isActive = btn.getAttribute(`data-${attr}`) === value;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  function updatePriceUI() {
    const isCash = payType === 'cash';
    if (els.offerPriceLabel) {
      els.offerPriceLabel.textContent = isCash ? 'Precio al contado *' : 'Precio final financiado *';
    }
    if (els.offerPriceHelp) {
      els.offerPriceHelp.textContent = isCash
        ? 'Lo que pagas por el coche.'
        : 'El que te da el concesionario, con el descuento por financiar ya aplicado.';
    }
    setVisible(els.groupFinanceDiscount, !isCash);
    if (isCash || !els.cashRefSummaryText) return;

    const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
    const discount = parseLocaleNumber(els.financeDiscountInput?.value || 0);
    els.cashRefSummaryText.textContent =
      discount > 0 && price > 0
        ? `Equivalente al contado: ${euros(price + discount)} (+${euros(discount)} de descuento por financiar)`
        : 'Sirve para calcular el precio equivalente al contado.';
  }

  /**
   * @param {string|number} val Plazo en meses ('' limpia la selección)
   */
  function updateMonthsUI(val) {
    const months = val === '' ? null : parseMonths(val);
    if (els.loanMonthsBadge) els.loanMonthsBadge.textContent = months ? formatMonthsDuration(months) : '';
    els.loanMonthsPills?.querySelectorAll('.months-pill-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.months) === months);
    });
  }

  /** Muestra solo el campo que introduce el usuario en cada par; el otro se calcula. */
  function updateScenarioUI() {
    markActive(els.financingScenario, 'scenario', scenario);
    setVisible(els.groupDownPayment, scenario === 'down');
    setVisible(els.groupFinancedAmount, scenario === 'financed');

    setVisible(els.groupManualMonthly, rateMode === 'monthly');
    setVisible(els.groupLoanTin, rateMode === 'tin');
    if (els.toggleRateModeBtn) {
      els.toggleRateModeBtn.textContent =
        rateMode === 'monthly' ? '¿Te han dado el TIN en vez de la cuota?' : '¿Te han dado la cuota en vez del TIN?';
    }
  }

  /**
   * Texto con lo que se ha calculado a partir de lo introducido.
   * @param {{ feedback?: string }|null} financingResult
   */
  function updateDerivedFeedback(financingResult) {
    const derivedValue = scenario === 'down' ? els.financedAmountInput?.value : els.downPaymentInput?.value;
    const derivedText = derivedValue
      ? scenario === 'down'
        ? `→ Financias ${euros(parseLocaleNumber(derivedValue))}.`
        : `→ Entrada ${euros(parseLocaleNumber(derivedValue))}.`
      : '';
    if (els.scenarioDerivedText) els.scenarioDerivedText.textContent = derivedText;
    if (els.financeCalcFeedbackText) els.financeCalcFeedbackText.textContent = financingResult?.feedback || '';
    setVisible(els.financeCalcFeedback, Boolean(derivedText || financingResult?.feedback), 'flex');
  }

  function updatePaymentUI() {
    const isCash = payType === 'cash';
    markActive(els.paymentType, 'pay', payType);
    setVisible(els.financeFieldsContainer, !isCash);
    setVisible(els.linkedProductsSection, !isCash);
    // Un campo oculto no puede ser obligatorio: bloquearía el envío del formulario en contado
    els.loanMonthsInput.required = !isCash;
    setVisible(els.earlyCancellationContainer, isCancelEarly());
    updateScenarioUI();
  }

  /**
   * Recalcula la modalidad, los campos derivados y los resúmenes.
   */
  function recalculate() {
    currentModality = deriveModality({
      payType,
      balloonPayment: els.balloonPaymentInput.value,
      cancelEarly: isCancelEarly()
    });
    updatePriceUI();
    if (payType === 'cash') {
      updateDerivedFeedback(null);
    } else {
      downPaymentPair.sync(scenario);
      updateDerivedFeedback(financingPair.sync(rateMode));
      earlyCancellationPanel.update();
    }
    updateLiveSummary();
  }

  /**
   * Resumen en vivo: normaliza la oferta tal y como se guardaría.
   */
  function updateLiveSummary() {
    const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
    let offer = null;
    if (price > 0) {
      try {
        offer = normalizeOffer(createDefaultOffer(buildOffer()));
      } catch {
        offer = null;
      }
    }

    setVisible(els.liveSummaryEmpty, !offer);
    if (els.liveSummaryList) els.liveSummaryList.hidden = !offer;
    if (!offer) {
      if (els.liveVerdict) els.liveVerdict.hidden = true;
      return;
    }

    const isCash = payType === 'cash';
    els.liveSummaryList.querySelectorAll('[data-finance-only]').forEach(row => {
      /** @type {HTMLElement} */ (row).hidden = isCash;
    });
    const setText = (node, text) => {
      if (node) node.textContent = text;
    };
    setText(els.liveTotal, euros(offer.totalOutOfPocketCost));
    if (!isCash) {
      setText(els.liveMonthly, offer.monthlyPayment > 0 ? euros(offer.monthlyPayment) : '—');
      setText(els.liveDown, euros(offer.downPayment));
      setText(els.liveFinanced, euros(offer.principalFinanced));
      setText(els.liveRates, `${formatLocaleNumber(offer.nominalTin)} % / ${formatAprPercent(offer.effectiveApr)}`);
      setText(els.liveInterest, euros(offer.totalInterest));
      const diff = offer.netDifferenceVsCashRef;
      setText(els.liveVsCash, `${diff > 0 ? '+' : ''}${euros(diff)}`);
      els.liveVsCash?.classList.toggle('highlight-trap', diff > 0);
      els.liveVsCash?.classList.toggle('highlight-save', diff < 0);
    }

    const verdict = offer.verdict;
    if (els.liveVerdict) {
      els.liveVerdict.hidden = !verdict || isCash;
      if (verdict && !isCash) {
        els.liveVerdict.className = `live-summary-verdict ${verdict.status || ''}`.trim();
        els.liveVerdict.replaceChildren(el('strong', { text: verdict.badge }), ` ${verdict.message || ''}`);
      }
    }
  }

  /** @returns {Partial<import('../core/types.js').Offer>} */
  function buildOffer() {
    return formValuesToOffer(readFormValues(), {
      modality: currentModality,
      financingMode: financingPair.getMode(),
      linkedProducts: productsList.getItems(),
      includedServices: servicesList.getItems()
    });
  }

  /**
   * Cambia la forma de pago (contado o financiado).
   * @param {'cash'|'finance'} type
   */
  function setPayType(type) {
    payType = type === 'cash' ? 'cash' : 'finance';
    if (payType === 'cash') {
      els.downPaymentInput.value = '0';
      if (els.financedAmountInput) els.financedAmountInput.value = '0';
    } else if (
      (els.downPaymentInput.value === '0' || !els.downPaymentInput.value) &&
      (!els.financedAmountInput?.value || els.financedAmountInput.value === '0')
    ) {
      scenario = 'down';
      els.downPaymentInput.value = String(DEFAULTS.downPayment);
      if (els.financedAmountInput) els.financedAmountInput.value = '';
    }
    updatePaymentUI();
    recalculate();
  }

  /**
   * Cambia qué dato del par entrada ↔ importe financiado introduce el usuario.
   * Conserva el valor ya calculado del nuevo campo para no perder datos.
   * @param {'down'|'financed'} next
   */
  function setScenario(next) {
    scenario = next === 'financed' ? 'financed' : 'down';
    updateScenarioUI();
    recalculate();
  }

  /**
   * Cambia qué dato del par TIN ↔ cuota introduce el usuario.
   * @param {'tin'|'monthly'} next
   */
  function setRateMode(next) {
    rateMode = next === 'tin' ? 'tin' : 'monthly';
    updateScenarioUI();
    recalculate();
  }

  function updateImagePreview(url) {
    const { vehicleAutoPreview, imageThumb, imagePlaceholder } = els;
    vehicleAutoPreview?.classList.toggle('has-image', Boolean(url));
    if (!url) {
      if (imageThumb) {
        setVisible(imageThumb, false);
        imageThumb.src = '';
      }
      setVisible(imagePlaceholder, true, 'flex');
      return;
    }

    if (imageThumb) {
      imageThumb.src = url;
      imageThumb.onload = () => {
        setVisible(imageThumb, true);
        setVisible(imagePlaceholder, false);
      };
      imageThumb.onerror = () => {
        setVisible(imageThumb, false);
        setVisible(imagePlaceholder, true, 'flex');
      };
    }
  }

  function fillKnownVehicles() {
    if (!els.vehiclesDatalist || typeof getKnownVehicles !== 'function') return;
    els.vehiclesDatalist.replaceChildren(...(getKnownVehicles() || []).map(v => el('option', { attrs: { value: v } })));
  }

  // ---------------------------------------------------------------------------
  // Navegación entre pasos
  // ---------------------------------------------------------------------------

  /**
   * Muestra el paso indicado del asistente.
   * @param {number} step
   */
  function goToStep(step) {
    currentStep = Math.min(TOTAL_STEPS, Math.max(1, Number(step) || 1));
    form.querySelectorAll('.wizard-step').forEach(section => {
      /** @type {HTMLElement} */ (section).hidden =
        Number(/** @type {HTMLElement} */ (section).dataset.step) !== currentStep;
    });
    els.wizardProgress?.querySelectorAll('[data-go-step]').forEach(btn => {
      const n = Number(/** @type {HTMLElement} */ (btn).dataset.goStep);
      btn.classList.toggle('active', n === currentStep);
      btn.classList.toggle('done', n < currentStep);
      if (n === currentStep) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    setVisible(els.btnPrev, currentStep > 1, 'inline-flex');
    setVisible(els.btnNext, currentStep < TOTAL_STEPS, 'inline-flex');
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------

  [els.offerPriceInput, els.financeDiscountInput, els.tradeInValueInput, els.balloonPaymentInput].forEach(input =>
    input?.addEventListener('input', () => recalculate())
  );

  els.paymentType?.addEventListener('click', e => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('[data-pay]');
    if (btn) setPayType(/** @type {'cash'|'finance'} */ (btn.getAttribute('data-pay')));
  });

  els.financingScenario?.addEventListener('click', e => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('[data-scenario]');
    if (btn) setScenario(/** @type {'down'|'financed'} */ (btn.getAttribute('data-scenario')));
  });

  els.toggleRateModeBtn?.addEventListener('click', () => setRateMode(rateMode === 'monthly' ? 'tin' : 'monthly'));

  els.cancelEarlyToggle?.addEventListener('change', () => {
    if (els.cancelEarlyToggle.checked && !els.loanMonthsInput.value && !els.balloonPaymentInput.value) {
      els.loanMonthsInput.value = EARLY_CANCELLATION_DEFAULT_MONTHS;
      updateMonthsUI(EARLY_CANCELLATION_DEFAULT_MONTHS);
    }
    setVisible(els.earlyCancellationContainer, isCancelEarly());
    recalculate();
  });

  els.vehicleInput?.addEventListener('input', () => {
    updateImagePreview(getVehicleImageUrl(els.vehicleInput.value.trim()));
  });

  els.loanMonthsInput.addEventListener('input', () => {
    updateMonthsUI(els.loanMonthsInput.value);
    recalculate();
  });

  els.loanMonthsPills?.addEventListener('click', e => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn?.dataset.months) {
      els.loanMonthsInput.value = btn.dataset.months;
      updateMonthsUI(btn.dataset.months);
      recalculate();
    }
  });

  els.btnAddProduct?.addEventListener('click', () => {
    productsList.add({ id: generateId(ID_PREFIX_PRODUCT), ...NEW_LINKED_PRODUCT });
  });

  dialog.querySelectorAll('.btn-add-preset-service').forEach(btn => {
    btn.addEventListener('click', () => {
      servicesList.add({
        id: generateId(ID_PREFIX_SERVICE),
        name: btn.dataset.name || 'Servicio incluido',
        marketValue: parseLocaleNumber(btn.dataset.value || 0)
      });
    });
  });

  els.btnAddCustomService?.addEventListener('click', () => {
    servicesList.add({ id: generateId(ID_PREFIX_SERVICE), ...NEW_CUSTOM_SERVICE });
  });

  els.btnPrev?.addEventListener('click', () => goToStep(currentStep - 1));
  els.btnNext?.addEventListener('click', () => goToStep(currentStep + 1));
  els.wizardProgress?.addEventListener('click', e => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('[data-go-step]');
    if (btn) goToStep(Number(btn.getAttribute('data-go-step')));
  });

  // Un campo obligatorio vacío en otro paso: mostrar ese paso antes de que el navegador lo señale
  form.addEventListener(
    'invalid',
    e => {
      const step = /** @type {HTMLElement} */ (e.target).closest?.('.wizard-step');
      if (step && /** @type {HTMLElement} */ (step).hidden)
        goToStep(Number(/** @type {HTMLElement} */ (step).dataset.step));
    },
    true
  );

  // Intro en un campo avanza al siguiente paso en lugar de guardar
  form.addEventListener('keydown', e => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (e.key === 'Enter' && target.tagName === 'INPUT' && currentStep < TOTAL_STEPS) {
      e.preventDefault();
      goToStep(currentStep + 1);
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    recalculate();
    onSave(buildOffer());
    dialog.close();
  });

  els.btnClose?.addEventListener('click', () => dialog.close());
  els.btnCancel?.addEventListener('click', () => dialog.close());

  // ---------------------------------------------------------------------------
  // Apertura
  // ---------------------------------------------------------------------------

  /**
   * Rellena el formulario con una oferta existente.
   * @param {import('../core/types.js').Offer} offer
   */
  function fillFromOffer(offer) {
    const { values, modality, downPaymentMode, financingMode, linkedProducts, includedServices } =
      offerToFormValues(offer);
    const choice = modalityToPaymentChoice(modality, values.cancelEarly);

    els.modalTitle.textContent = 'Editar oferta';
    els.idInput.value = values.id;
    if (els.vehicleInput) els.vehicleInput.value = values.vehicle;
    els.dealerInput.value = values.dealer;
    els.notesInput.value = values.notes;
    els.offerPriceInput.value = values.offerPrice;
    els.financeDiscountInput.value = values.financeDiscount;
    updateImagePreview(getVehicleImageUrl(values.vehicle, offer.imageUrl));

    payType = choice.payType;
    scenario = downPaymentMode === 'financed' ? 'financed' : 'down';
    rateMode = financingMode === 'monthly' ? 'monthly' : 'tin';
    if (els.cancelEarlyToggle) els.cancelEarlyToggle.checked = choice.cancelEarly;

    downPaymentPair.setValues(values.downPayment, values.financedAmount, downPaymentMode);
    els.tradeInValueInput.value = values.tradeInValue;
    els.loanMonthsInput.value = values.months;
    updateMonthsUI(values.months);
    // En contado o cancelación lineal la cuota final no aplica
    els.balloonPaymentInput.value = modality === OFFER_MODALITIES.FLEXIBLE_FINANCE ? values.balloonPayment : '';
    financingPair.setValues(values.tin, values.manualMonthly, financingMode);

    earlyCancellationPanel.setValues(values.earlyCancelMonth, values.earlyCancelPenalty);
    productsList.setItems(linkedProducts);
    servicesList.setItems(includedServices);

    if (els.notesDisclosure) els.notesDisclosure.open = Boolean(values.notes);
    if (els.tradeInDisclosure) els.tradeInDisclosure.open = parseLocaleNumber(values.tradeInValue || 0) > 0;
    updatePaymentUI();
    recalculate();
  }

  /**
   * Prepara el formulario vacío para una nueva oferta.
   * @param {string} vehicle Vehículo propuesto
   * @param {'tin'|'monthly'} initialRateMode
   */
  function fillEmpty(vehicle, initialRateMode) {
    els.modalTitle.textContent = 'Nueva oferta';
    els.idInput.value = '';
    if (els.cancelEarlyToggle) els.cancelEarlyToggle.checked = false;
    if (els.vehicleInput) els.vehicleInput.value = vehicle;
    els.offerPriceInput.value = '';
    els.financeDiscountInput.value = '';
    downPaymentPair.setValues('', '', null);
    els.loanMonthsInput.value = '';
    updateMonthsUI('');
    els.tradeInValueInput.value = '';
    els.balloonPaymentInput.value = '';
    financingPair.setValues('', '', null);
    earlyCancellationPanel.setValues(String(DEFAULTS.earlyCancellationMonth), '1,0');
    productsList.setItems([]);
    servicesList.setItems([]);
    if (els.notesDisclosure) els.notesDisclosure.open = false;
    if (els.tradeInDisclosure) els.tradeInDisclosure.open = false;
    updateImagePreview(getVehicleImageUrl(vehicle));
    scenario = 'down';
    rateMode = initialRateMode;
    setPayType('finance');
  }

  return {
    open(offer = null, defaultVehicle = null, { rateMode: initialRateMode = 'monthly', step } = {}) {
      form.reset();
      fillKnownVehicles();
      if (offer) {
        fillFromOffer(offer);
      } else {
        fillEmpty(defaultVehicle || '', initialRateMode);
      }
      updateIncludedServicesTotalBadge();
      // Al editar se va directamente a los datos del pago; todos los pasos siguen accesibles
      goToStep(step || (offer ? 2 : 1));
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
