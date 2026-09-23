/**
 * Controlador del Modal de Oferta (Creación y Edición).
 * Orquesta los paneles del formulario declarado en partials/modal-offer.html:
 * - Pares enlazados entrada ↔ capital financiado y TIN ↔ cuota (offerModal/derivedPair.js).
 * - Cancelación anticipada (offerModal/earlyCancellationPanel.js).
 * - Productos vinculados y servicios incluidos (offerModal/editableList.js).
 * - Serialización pura del formulario (offerModal/formSerializer.js).
 * Admite comas decimales en todos los campos numéricos mediante parseLocaleNumber.
 */

import { OFFER_MODALITIES } from '../core/types.js';
import { parseLocaleNumber, formatLocaleNumber, formatMonthsDuration } from '../core/formatters.js';
import { generateId, ID_PREFIX_PRODUCT, ID_PREFIX_SERVICE, DEFAULTS } from '../core/constants.js';
import { getVehicleImageUrl } from '../core/vehicleCatalog.js';
import { calculateMonthlyPayment, reverseEngineerInterestRate } from '../core/finance.js';
import { setVisible, el } from '../ui/dom.js';
import { createDerivedPair } from './offerModal/derivedPair.js';
import { createEarlyCancellationPanel } from './offerModal/earlyCancellationPanel.js';
import { createEditableList } from './offerModal/editableList.js';
import {
  computeFinancedPrincipal,
  computeNetBeforeDownPayment,
  formValuesToOffer,
  offerToFormValues,
  parseMonths
} from './offerModal/formSerializer.js';

/** Plazos que se proponen al cambiar de modalidad si el campo está vacío o con el plazo por defecto */
const EARLY_CANCELLATION_DEFAULT_MONTHS = '84';
const FLEXIBLE_DEFAULT_MONTHS = '48';

/** Producto vinculado y servicio incluido que se añaden por defecto */
const NEW_LINKED_PRODUCT = { name: 'Seguro de protección de pagos', cost: 350, financed: true };
const NEW_CUSTOM_SERVICE = { name: 'Mantenimiento / Seguro oficial', marketValue: 500 };

const TWO_DECIMALS = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

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
    modalitySelector: byId('modality-selector'),
    financeFieldsContainer: byId('finance-fields-container'),
    flexibleBalloonContainer: byId('flexible-balloon-container'),
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
    productsListContainer: byId('linked-products-list'),
    groupDownPayment: byId('group-down-payment'),
    btnAddProduct: byId('btn-add-product'),
    tmplProduct: byId('tmpl-linked-product'),
    includedServicesContainer: byId('included-services-list'),
    includedServicesTotalBadge: byId('included-services-total-badge'),
    btnAddCustomService: byId('btn-add-custom-service'),
    tmplIncludedService: byId('tmpl-included-service'),
    idInput: byId('offer-id'),
    vehicleInput: byId('offer-vehicle'),
    vehiclesDatalist: byId('vehicles-datalist'),
    vehicleAutoPreview: byId('vehicle-auto-preview'),
    imageThumb: byId('vehicle-image-thumb'),
    imagePlaceholder: byId('vehicle-image-placeholder'),
    dealerInput: byId('offer-dealer'),
    notesInput: byId('offer-notes'),
    priceFieldsContainer: byId('price-fields-container'),
    groupFinanceDiscount: byId('group-finance-discount'),
    offerPriceInput: byId('offer-price'),
    financeDiscountInput: byId('finance-discount'),
    netCalcPriceIndicator: byId('net-calc-price-indicator'),
    netCalcPriceLabel: byId('net-calc-price-label'),
    netCalcPriceVal: byId('net-calc-price-val'),
    cashRefSummaryBox: byId('cash-ref-summary-box'),
    cashRefSummaryText: byId('cash-ref-summary-text'),
    downPaymentFieldsContainer: byId('down-payment-fields-container'),
    downPaymentInput: byId('down-payment'),
    financedAmountInput: byId('financed-amount'),
    btnUnlockDown: byId('btn-unlock-down'),
    btnUnlockFinanced: byId('btn-unlock-financed'),
    downPaymentHelper: byId('down-payment-helper'),
    financedAmountHelper: byId('financed-amount-helper'),
    tradeInValueInput: byId('trade-in-value'),
    loanMonthsInput: byId('loan-months'),
    loanMonthsBadge: byId('loan-months-badge'),
    loanMonthsPills: byId('loan-months-pills'),
    loanTinInput: byId('loan-tin'),
    manualMonthlyInput: byId('manual-monthly'),
    balloonPaymentInput: byId('balloon-payment'),
    flexibleCancelEarly: byId('flexible-cancel-early'),
    btnUnlockTin: byId('btn-unlock-tin'),
    btnUnlockMonthly: byId('btn-unlock-monthly'),
    loanTinHelper: byId('loan-tin-helper'),
    manualMonthlyHelper: byId('manual-monthly-helper'),
    financeCalcFeedback: byId('finance-calc-feedback'),
    financeCalcFeedbackText: byId('finance-calc-feedback-text')
  };
}

/**
 * Inicializa el modal de formulario de oferta.
 * @param {object} options
 * @param {Function} options.onSave
 * @param {() => Array<string>} [options.getKnownVehicles]
 * @returns {{ open: (offer?: any, defaultVehicle?: string) => void, close: () => void }}
 */
export function initOfferModal({ onSave, getKnownVehicles }) {
  const els = queryElements();
  const { dialog, form } = els;

  let currentModality = OFFER_MODALITIES.STANDARD_FINANCE;

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
      cancelEarly: Boolean(els.flexibleCancelEarly?.checked),
      earlyCancelMonth: els.earlyCancelMonthInput?.value || '',
      earlyCancelPenalty: els.earlyCancelPenaltyInput?.value || ''
    };
  }

  const getLinkedProducts = () => productsList.getItems();
  const getFinancedPrincipal = () => computeFinancedPrincipal({ ...readFormValues(), linkedProducts: getLinkedProducts() });
  const getMonths = () => parseMonths(els.loanMonthsInput?.value);
  const getBalloon = () => (currentModality === OFFER_MODALITIES.FLEXIBLE_FINANCE
    ? parseLocaleNumber(els.balloonPaymentInput?.value || 0)
    : 0);

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------

  const downPaymentPair = createDerivedPair({
    first: {
      mode: 'down',
      input: els.downPaymentInput,
      unlockBtn: els.btnUnlockDown,
      helper: els.downPaymentHelper,
      activeHelperText: 'Modo activo: Calculando capital financiado',
      derive: () => {
        const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
        if (!(price > 0 && els.downPaymentInput.value.trim() !== '')) return null;
        const netBeforeDown = computeNetBeforeDownPayment({ ...readFormValues(), linkedProducts: getLinkedProducts() });
        const fin = Math.max(0, netBeforeDown - parseLocaleNumber(els.downPaymentInput.value));
        return { value: formatLocaleNumber(fin), helperText: `Capital a financiar: ${fin.toLocaleString('es-ES')} €` };
      }
    },
    second: {
      mode: 'financed',
      input: els.financedAmountInput,
      unlockBtn: els.btnUnlockFinanced,
      helper: els.financedAmountHelper,
      activeHelperText: 'Modo activo: Calculando entrada requerida',
      derive: () => {
        const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
        if (!(price > 0 && els.financedAmountInput.value.trim() !== '')) return null;
        const netBeforeDown = computeNetBeforeDownPayment({ ...readFormValues(), linkedProducts: getLinkedProducts() });
        const down = Math.max(0, netBeforeDown - parseLocaleNumber(els.financedAmountInput.value));
        return { value: formatLocaleNumber(down), helperText: `Entrada calculada: ${down.toLocaleString('es-ES')} €` };
      }
    },
    onChange: () => recalculate({ skipDownPayment: true })
  });

  const financingPair = createDerivedPair({
    first: {
      mode: 'tin',
      input: els.loanTinInput,
      unlockBtn: els.btnUnlockTin,
      helper: els.loanTinHelper,
      activeHelperText: 'Modo activo: Calculando cuota a partir de este TIN',
      derive: () => {
        const principal = getFinancedPrincipal();
        const months = getMonths();
        const tin = parseLocaleNumber(els.loanTinInput.value);
        if (!(principal > 0 && months > 0 && tin >= 0 && els.loanTinInput.value.trim() !== '')) return null;
        const cuota = calculateMonthlyPayment(principal, tin, months, getBalloon());
        const cuotaText = cuota.toLocaleString('es-ES', TWO_DECIMALS);
        return {
          value: formatLocaleNumber(cuota),
          helperText: `Cuota estimada: ${cuotaText} €/mes`,
          feedback: `Calculando cuota (${cuotaText} €/mes) para ${principal.toLocaleString('es-ES')} € al ${formatLocaleNumber(tin)}% TIN.`
        };
      }
    },
    second: {
      mode: 'monthly',
      input: els.manualMonthlyInput,
      unlockBtn: els.btnUnlockMonthly,
      helper: els.manualMonthlyHelper,
      activeHelperText: 'Modo activo: Deduciendo TIN a partir de esta cuota',
      derive: () => {
        const principal = getFinancedPrincipal();
        const months = getMonths();
        const cuota = parseLocaleNumber(els.manualMonthlyInput.value);
        if (!(principal > 0 && months > 0 && cuota > 0 && els.manualMonthlyInput.value.trim() !== '')) return null;
        const deduced = reverseEngineerInterestRate(principal, cuota, months, getBalloon());
        return {
          value: formatLocaleNumber(deduced.tin),
          helperText: `TIN deducido: ${deduced.tin.toLocaleString('es-ES', TWO_DECIMALS)}% (TAE ~ ${deduced.apr.toFixed(2)}%)`,
          feedback: `Interés deducido: TIN ${deduced.tin.toFixed(2)}% | TAE aprox. ${deduced.apr.toFixed(2)}% para cuota de ${cuota.toLocaleString('es-ES', TWO_DECIMALS)} €/mes.`
        };
      }
    },
    onChange: () => recalculate({ skipFinancing: true })
  });

  const earlyCancellationPanel = createEarlyCancellationPanel(els, {
    getMode: () => ({
      isEarlyCancel: currentModality === OFFER_MODALITIES.EARLY_CANCELLATION,
      isFlexibleEarly: currentModality === OFFER_MODALITIES.FLEXIBLE_FINANCE && Boolean(els.flexibleCancelEarly?.checked)
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
    emptyText: 'No hay productos vinculados obligatorios.',
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
    emptyText: 'Sin servicios bonificados añadidos (ej. mantenimiento, seguro o garantía).',
    fields: [
      { selector: '.service-name', prop: 'name', kind: 'text' },
      { selector: '.service-value', prop: 'marketValue', kind: 'number' }
    ],
    onChange: updateIncludedServicesTotalBadge
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

  function updateNetCalcPriceUI() {
    const isCash = currentModality === OFFER_MODALITIES.CASH;
    setVisible(els.groupFinanceDiscount, !isCash);
    setVisible(els.netCalcPriceIndicator, !isCash, 'flex');
    els.priceFieldsContainer?.classList.toggle('price-fields--single', isCash);
    if (isCash) return;

    const price = parseLocaleNumber(els.offerPriceInput?.value || 0);
    const discount = parseLocaleNumber(els.financeDiscountInput?.value || 0);

    if (els.netCalcPriceVal) els.netCalcPriceVal.textContent = `${price.toLocaleString('es-ES')} €`;
    if (els.netCalcPriceLabel) els.netCalcPriceLabel.textContent = 'Precio final financiado:';
    if (els.cashRefSummaryBox && els.cashRefSummaryText) {
      setVisible(els.cashRefSummaryBox, discount > 0);
      if (discount > 0) {
        els.cashRefSummaryText.textContent = `Equivalente al contado: ${(price + discount).toLocaleString('es-ES')} € (+${discount.toLocaleString('es-ES')} € descuento prometido)`;
      }
    }
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

  /**
   * Muestra el resultado del par TIN/cuota en la caja de feedback.
   * @param {{ feedback?: string }|null} result
   */
  function updateFinanceFeedback(result) {
    setVisible(els.financeCalcFeedback, Boolean(result));
    if (result && els.financeCalcFeedbackText) els.financeCalcFeedbackText.textContent = result.feedback;
  }

  /**
   * Recalcula todos los campos derivados y resúmenes.
   * @param {object} [options]
   * @param {boolean} [options.skipDownPayment] El usuario acaba de editar el par entrada/financiado
   * @param {boolean} [options.skipFinancing] El usuario acaba de editar el par TIN/cuota
   */
  function recalculate({ skipDownPayment = false, skipFinancing = false } = {}) {
    updateNetCalcPriceUI();
    if (!skipDownPayment) downPaymentPair.sync();
    const financingResult = skipFinancing ? financingPair.sync(financingPair.getMode()) : financingPair.sync();
    updateFinanceFeedback(financingResult);
    earlyCancellationPanel.update();
  }

  function updateModalityUI(modality) {
    currentModality = modality;
    const isCash = modality === OFFER_MODALITIES.CASH;
    els.modalitySelector.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === modality);
    });

    setVisible(els.financeFieldsContainer, !isCash);
    setVisible(els.downPaymentFieldsContainer, !isCash, 'grid');
    setVisible(els.groupDownPayment, !isCash);
    // Un campo oculto no puede ser obligatorio: bloquearía el envío del formulario en contado
    els.loanMonthsInput.required = !isCash;

    if (isCash) {
      els.downPaymentInput.value = '0';
      if (els.financedAmountInput) els.financedAmountInput.value = '0';
    } else {
      if ((els.downPaymentInput.value === '0' || !els.downPaymentInput.value) && !els.financedAmountInput?.value) {
        els.downPaymentInput.value = String(DEFAULTS.downPayment);
      }

      setVisible(els.flexibleBalloonContainer, modality === OFFER_MODALITIES.FLEXIBLE_FINANCE);
      const showEarlyContainer = modality === OFFER_MODALITIES.EARLY_CANCELLATION ||
        (modality === OFFER_MODALITIES.FLEXIBLE_FINANCE && Boolean(els.flexibleCancelEarly?.checked));
      setVisible(els.earlyCancellationContainer, showEarlyContainer);

      const monthsValue = els.loanMonthsInput.value;
      if (modality === OFFER_MODALITIES.EARLY_CANCELLATION && (!monthsValue || monthsValue === String(DEFAULTS.months))) {
        els.loanMonthsInput.value = EARLY_CANCELLATION_DEFAULT_MONTHS;
        updateMonthsUI(EARLY_CANCELLATION_DEFAULT_MONTHS);
      } else if (modality === OFFER_MODALITIES.FLEXIBLE_FINANCE && (!monthsValue || monthsValue === EARLY_CANCELLATION_DEFAULT_MONTHS)) {
        els.loanMonthsInput.value = FLEXIBLE_DEFAULT_MONTHS;
        updateMonthsUI(FLEXIBLE_DEFAULT_MONTHS);
      }
    }
    recalculate();
  }

  function updateImagePreview(url) {
    const { vehicleAutoPreview, imageThumb, imagePlaceholder } = els;
    if (!url) {
      setVisible(vehicleAutoPreview, false);
      if (imageThumb) {
        setVisible(imageThumb, false);
        imageThumb.src = '';
      }
      return;
    }

    setVisible(vehicleAutoPreview, true, 'flex');
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
  // Eventos
  // ---------------------------------------------------------------------------

  [els.offerPriceInput, els.financeDiscountInput, els.tradeInValueInput, els.balloonPaymentInput]
    .forEach(input => input?.addEventListener('input', () => recalculate()));

  els.flexibleCancelEarly?.addEventListener('change', () => {
    setVisible(els.earlyCancellationContainer, els.flexibleCancelEarly.checked);
    recalculate();
  });

  els.vehicleInput?.addEventListener('input', () => {
    updateImagePreview(getVehicleImageUrl(els.vehicleInput.value.trim()));
  });

  els.loanMonthsInput.addEventListener('input', () => {
    updateMonthsUI(els.loanMonthsInput.value);
    recalculate();
  });

  els.loanMonthsPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn?.dataset.months) {
      els.loanMonthsInput.value = btn.dataset.months;
      updateMonthsUI(btn.dataset.months);
      recalculate();
    }
  });

  els.modalitySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (btn) updateModalityUI(btn.dataset.val);
  });

  els.btnAddProduct?.addEventListener('click', () => {
    productsList.add({ id: generateId(ID_PREFIX_PRODUCT), ...NEW_LINKED_PRODUCT });
  });

  // Presets de 1 clic (calibrados con RAV4 y Tucson)
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onSave(formValuesToOffer(readFormValues(), {
      modality: currentModality,
      financingMode: financingPair.getMode(),
      linkedProducts: productsList.getItems(),
      includedServices: servicesList.getItems()
    }));
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
    const { values, modality, downPaymentMode, financingMode, linkedProducts, includedServices } = offerToFormValues(offer);

    els.modalTitle.textContent = 'Editar oferta';
    els.idInput.value = values.id;
    if (els.vehicleInput) els.vehicleInput.value = values.vehicle;
    els.dealerInput.value = values.dealer;
    els.notesInput.value = values.notes;
    els.offerPriceInput.value = values.offerPrice;
    els.financeDiscountInput.value = values.financeDiscount;
    updateImagePreview(getVehicleImageUrl(values.vehicle, offer.imageUrl));

    downPaymentPair.setValues(values.downPayment, values.financedAmount, downPaymentMode);
    els.tradeInValueInput.value = values.tradeInValue;
    els.loanMonthsInput.value = values.months;
    updateMonthsUI(values.months);
    els.balloonPaymentInput.value = values.balloonPayment;
    financingPair.setValues(values.tin, values.manualMonthly, financingMode);

    earlyCancellationPanel.setValues(values.earlyCancelMonth, values.earlyCancelPenalty);
    productsList.setItems(linkedProducts);
    servicesList.setItems(includedServices);
    if (els.flexibleCancelEarly) els.flexibleCancelEarly.checked = values.cancelEarly;
    updateModalityUI(modality);
  }

  /**
   * Prepara el formulario vacío para una nueva oferta.
   * @param {string} vehicle Vehículo propuesto
   */
  function fillEmpty(vehicle) {
    els.modalTitle.textContent = 'Nueva oferta de concesionario';
    els.idInput.value = '';
    if (els.flexibleCancelEarly) els.flexibleCancelEarly.checked = false;
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
    updateImagePreview(getVehicleImageUrl(vehicle));
    updateModalityUI(OFFER_MODALITIES.STANDARD_FINANCE);
  }

  return {
    open(offer = null, defaultVehicle = null) {
      form.reset();
      fillKnownVehicles();
      if (offer) {
        fillFromOffer(offer);
      } else {
        fillEmpty(defaultVehicle || '');
      }
      updateIncludedServicesTotalBadge();
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
