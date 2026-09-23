/**
 * Controlador del Modal de Oferta (Creación y Edición).
 * Conecta con el formulario semántico declarado en index.html y usa plantillas para productos vinculados.
 * Admite comas decimales en todos los campos numéricos mediante parseLocaleNumber.
 * Soporta unificación de precio en un único campo y asignación automática de imágenes del modelo.
 */

import { OFFER_MODALITIES, getOfferVehicle, getOfferDisplayTitle } from '../core/types.js';
import { parseLocaleNumber, formatLocaleNumber, formatMonthsDuration } from '../core/formatters.js';
import { generateId, ID_PREFIX_OFFER, ID_PREFIX_PRODUCT, ID_PREFIX_SERVICE } from '../core/constants.js';
import { getVehicleImageUrl, findVehicleInCatalog } from '../core/vehicleCatalog.js';
import { calculateEarlyCancellationSettlement, calculateMonthlyPayment, reverseEngineerInterestRate } from '../core/finance.js';

/**
 * Inicializa el modal de formulario de oferta.
 * @param {object} options
 * @param {Function} options.onSave
 * @param {() => Array<string>} [options.getKnownVehicles]
 * @returns {{ open: (offer?: any, defaultVehicle?: string) => void, close: () => void }}
 */
export function initOfferModal({ onSave, getKnownVehicles }) {
  const dialog = document.getElementById('modal-offer');
  const form = document.getElementById('form-offer');
  const modalTitle = document.getElementById('modal-offer-title');
  const btnClose = document.getElementById('btn-close-offer-modal');
  const btnCancel = document.getElementById('btn-cancel-offer');
  const modalitySelector = document.getElementById('modality-selector');
  const financeFieldsContainer = document.getElementById('finance-fields-container');
  const flexibleBalloonContainer = document.getElementById('flexible-balloon-container');
  const earlyCancellationContainer = document.getElementById('early-cancellation-container');
  const earlyCancelMonthInput = document.getElementById('early-cancel-month');
  const cancelMonthsPills = document.getElementById('cancel-months-pills');
  const earlyCancelPenaltyInput = document.getElementById('early-cancel-penalty');
  const penaltyQuickPills = document.getElementById('penalty-quick-pills');
  const cancelSummaryMonth = document.getElementById('cancel-summary-month');
  const cancelSummaryCapital = document.getElementById('cancel-summary-capital');
  const cancelSummaryRate = document.getElementById('cancel-summary-rate');
  const cancelSummaryPenalty = document.getElementById('cancel-summary-penalty');
  const cancelSummarySettlement = document.getElementById('cancel-summary-settlement');
  const cancelSummarySaved = document.getElementById('cancel-summary-saved');

  const productsListContainer = document.getElementById('linked-products-list');
  const groupDownPayment = document.getElementById('group-down-payment');
  const btnAddProduct = document.getElementById('btn-add-product');
  const tmplProduct = document.getElementById('tmpl-linked-product');

  // Contenedores y plantilla de servicios incluidos (TCO)
  const includedServicesContainer = document.getElementById('included-services-list');
  const includedServicesTotalBadge = document.getElementById('included-services-total-badge');
  const btnAddCustomService = document.getElementById('btn-add-custom-service');
  const tmplIncludedService = document.getElementById('tmpl-included-service');

  // Campos del formulario
  const idInput = document.getElementById('offer-id');
  const vehicleInput = document.getElementById('offer-vehicle');
  const vehiclesDatalist = document.getElementById('vehicles-datalist');
  const vehicleAutoPreview = document.getElementById('vehicle-auto-preview');
  const imageThumb = document.getElementById('vehicle-image-thumb');
  const imagePlaceholder = document.getElementById('vehicle-image-placeholder');
  const imageStatus = document.getElementById('vehicle-image-status');

  const dealerInput = document.getElementById('offer-dealer');
  const notesInput = document.getElementById('offer-notes');
  const priceFieldsContainer = document.getElementById('price-fields-container');
  const groupFinanceDiscount = document.getElementById('group-finance-discount');
  const offerPriceInput = document.getElementById('offer-price');
  const financeDiscountInput = document.getElementById('finance-discount');
  const netCalcPriceIndicator = document.getElementById('net-calc-price-indicator');
  const netCalcPriceLabel = document.getElementById('net-calc-price-label');
  const netCalcPriceVal = document.getElementById('net-calc-price-val');
  const cashRefSummaryBox = document.getElementById('cash-ref-summary-box');
  const cashRefSummaryText = document.getElementById('cash-ref-summary-text');

  const downPaymentFieldsContainer = document.getElementById('down-payment-fields-container');
  const downPaymentInput = document.getElementById('down-payment');
  const financedAmountInput = document.getElementById('financed-amount');
  const btnUnlockDown = document.getElementById('btn-unlock-down');
  const btnUnlockFinanced = document.getElementById('btn-unlock-financed');
  const downPaymentHelper = document.getElementById('down-payment-helper');
  const financedAmountHelper = document.getElementById('financed-amount-helper');

  const tradeInValueInput = document.getElementById('trade-in-value');
  const loanMonthsInput = document.getElementById('loan-months');
  const loanMonthsBadge = document.getElementById('loan-months-badge');
  const loanMonthsPills = document.getElementById('loan-months-pills');
  const loanTinInput = document.getElementById('loan-tin');
  const manualMonthlyInput = document.getElementById('manual-monthly');
  const balloonPaymentInput = document.getElementById('balloon-payment');
  const btnUnlockTin = document.getElementById('btn-unlock-tin');
  const btnUnlockMonthly = document.getElementById('btn-unlock-monthly');
  const loanTinHelper = document.getElementById('loan-tin-helper');
  const manualMonthlyHelper = document.getElementById('manual-monthly-helper');
  const financeCalcFeedback = document.getElementById('finance-calc-feedback');
  const financeCalcFeedbackText = document.getElementById('finance-calc-feedback-text');

  let currentModality = OFFER_MODALITIES.STANDARD_FINANCE;
  let activeFinancingMode = null; // 'tin' | 'monthly' | null
  let activeDownPaymentMode = null; // 'down' | 'financed' | null
  let linkedProductsState = [];
  let includedServicesState = [];

  function updateNetCalcPriceUI() {
    const isCash = currentModality === OFFER_MODALITIES.CASH;
    if (isCash) {
      if (groupFinanceDiscount) groupFinanceDiscount.style.display = 'none';
      if (priceFieldsContainer) priceFieldsContainer.style.gridTemplateColumns = '1fr';
      if (netCalcPriceIndicator) netCalcPriceIndicator.style.display = 'none';
      return;
    }

    if (groupFinanceDiscount) groupFinanceDiscount.style.display = 'block';
    if (priceFieldsContainer) priceFieldsContainer.style.gridTemplateColumns = '1fr 1fr';
    if (netCalcPriceIndicator) netCalcPriceIndicator.style.display = 'flex';

    const price = parseLocaleNumber(offerPriceInput?.value || 0);
    const discount = parseLocaleNumber(financeDiscountInput?.value || 0);
    const cashRef = price + discount;

    if (netCalcPriceVal) {
      netCalcPriceVal.textContent = `${price.toLocaleString('es-ES')} €`;
    }
    if (netCalcPriceLabel) {
      netCalcPriceLabel.textContent = 'Precio final financiado:';
    }
    if (cashRefSummaryBox && cashRefSummaryText) {
      if (discount > 0) {
        cashRefSummaryBox.style.display = 'block';
        cashRefSummaryText.textContent = `Equivalente al contado: ${cashRef.toLocaleString('es-ES')} € (+${discount.toLocaleString('es-ES')} € descuento prometido)`;
      } else {
        cashRefSummaryBox.style.display = 'none';
      }
    }
  }

  function updateMonthsUI(val) {
    const months = Math.max(1, Math.round(Number(val) || 60));
    if (loanMonthsBadge) {
      loanMonthsBadge.textContent = formatMonthsDuration(months);
    }
    if (loanMonthsPills) {
      loanMonthsPills.querySelectorAll('.months-pill-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.months) === months);
      });
    }
  }

  function getFinancedPrincipal() {
    const price = parseLocaleNumber(offerPriceInput?.value || 0);
    const downPayment = parseLocaleNumber(downPaymentInput?.value || 0);
    const tradeIn = parseLocaleNumber(tradeInValueInput?.value || 0);
    const productsFinanced = linkedProductsState
      .filter(p => p.financed !== false)
      .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const netVehicle = Math.max(0, price - downPayment - tradeIn);
    return netVehicle + productsFinanced;
  }

  function syncDownPaymentInputs(forcedMode = null) {
    if (forcedMode !== null) {
      activeDownPaymentMode = forcedMode;
    } else {
      const downVal = downPaymentInput?.value.trim();
      const finVal = financedAmountInput?.value.trim();

      if (activeDownPaymentMode === 'down') {
        if (!downVal) activeDownPaymentMode = null;
      } else if (activeDownPaymentMode === 'financed') {
        if (!finVal) activeDownPaymentMode = null;
      } else {
        if (downVal && !finVal) {
          activeDownPaymentMode = 'down';
        } else if (finVal && !downVal) {
          activeDownPaymentMode = 'financed';
        } else {
          activeDownPaymentMode = null;
        }
      }
    }

    const price = parseLocaleNumber(offerPriceInput?.value || 0);
    const tradeIn = parseLocaleNumber(tradeInValueInput?.value || 0);
    const productsFinanced = linkedProductsState
      .filter(p => p.financed !== false)
      .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const netBeforeDown = Math.max(0, price - tradeIn) + productsFinanced;

    if (activeDownPaymentMode === 'down') {
      downPaymentInput.disabled = false;
      downPaymentInput.classList.remove('input-derived');
      if (financedAmountInput) {
        financedAmountInput.disabled = true;
        financedAmountInput.classList.add('input-derived');
      }
      if (btnUnlockDown) btnUnlockDown.style.display = 'none';
      if (btnUnlockFinanced) btnUnlockFinanced.style.display = 'inline-block';

      if (downPaymentHelper) {
        downPaymentHelper.textContent = 'Modo activo: Calculando capital financiado';
      }

      const down = parseLocaleNumber(downPaymentInput.value);
      if (price > 0 && downPaymentInput.value.trim() !== '') {
        const fin = Math.max(0, netBeforeDown - down);
        if (financedAmountInput) financedAmountInput.value = formatLocaleNumber(fin);
        if (financedAmountHelper) {
          financedAmountHelper.textContent = `Capital a financiar: ${fin.toLocaleString('es-ES')} €`;
        }
      } else {
        if (financedAmountInput) financedAmountInput.value = '';
        if (financedAmountHelper) financedAmountHelper.textContent = '';
      }
    } else if (activeDownPaymentMode === 'financed') {
      if (financedAmountInput) {
        financedAmountInput.disabled = false;
        financedAmountInput.classList.remove('input-derived');
      }
      downPaymentInput.disabled = true;
      downPaymentInput.classList.add('input-derived');

      if (btnUnlockFinanced) btnUnlockFinanced.style.display = 'none';
      if (btnUnlockDown) btnUnlockDown.style.display = 'inline-block';

      if (financedAmountHelper) {
        financedAmountHelper.textContent = 'Modo activo: Calculando entrada requerida';
      }

      const fin = parseLocaleNumber(financedAmountInput.value);
      if (price > 0 && financedAmountInput.value.trim() !== '') {
        const down = Math.max(0, netBeforeDown - fin);
        downPaymentInput.value = formatLocaleNumber(down);
        if (downPaymentHelper) {
          downPaymentHelper.textContent = `Entrada calculada: ${down.toLocaleString('es-ES')} €`;
        }
      } else {
        downPaymentInput.value = '';
        if (downPaymentHelper) downPaymentHelper.textContent = '';
      }
    } else {
      downPaymentInput.disabled = false;
      downPaymentInput.classList.remove('input-derived');
      if (financedAmountInput) {
        financedAmountInput.disabled = false;
        financedAmountInput.classList.remove('input-derived');
      }
      if (btnUnlockDown) btnUnlockDown.style.display = 'none';
      if (btnUnlockFinanced) btnUnlockFinanced.style.display = 'none';
      if (downPaymentHelper) downPaymentHelper.textContent = '';
      if (financedAmountHelper) financedAmountHelper.textContent = '';
    }
  }

  function syncFinancingInputs(forcedMode = null) {
    if (forcedMode !== null) {
      activeFinancingMode = forcedMode;
    } else {
      const tinVal = loanTinInput?.value.trim();
      const monthlyVal = manualMonthlyInput?.value.trim();

      if (activeFinancingMode === 'tin') {
        if (!tinVal) activeFinancingMode = null;
      } else if (activeFinancingMode === 'monthly') {
        if (!monthlyVal) activeFinancingMode = null;
      } else {
        if (tinVal && !monthlyVal) {
          activeFinancingMode = 'tin';
        } else if (monthlyVal && !tinVal) {
          activeFinancingMode = 'monthly';
        } else {
          activeFinancingMode = null;
        }
      }
    }

    const principal = getFinancedPrincipal();
    const months = Math.max(1, Math.round(Number(loanMonthsInput?.value) || 60));
    const balloon = currentModality === OFFER_MODALITIES.FLEXIBLE_FINANCE
      ? parseLocaleNumber(balloonPaymentInput?.value || 0)
      : 0;

    if (activeFinancingMode === 'tin') {
      loanTinInput.disabled = false;
      loanTinInput.classList.remove('input-derived');
      manualMonthlyInput.disabled = true;
      manualMonthlyInput.classList.add('input-derived');

      if (btnUnlockTin) btnUnlockTin.style.display = 'none';
      if (btnUnlockMonthly) btnUnlockMonthly.style.display = 'inline-block';

      if (loanTinHelper) {
        loanTinHelper.textContent = 'Modo activo: Calculando cuota a partir de este TIN';
      }

      const tin = parseLocaleNumber(loanTinInput.value);
      if (principal > 0 && months > 0 && tin >= 0 && loanTinInput.value.trim() !== '') {
        const derivedCuota = calculateMonthlyPayment(principal, tin, months, balloon);
        manualMonthlyInput.value = formatLocaleNumber(derivedCuota);
        if (manualMonthlyHelper) {
          manualMonthlyHelper.textContent = `Cuota estimada: ${derivedCuota.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mes`;
        }
        if (financeCalcFeedback && financeCalcFeedbackText) {
          financeCalcFeedback.style.display = 'block';
          financeCalcFeedbackText.textContent = `Calculando cuota (${derivedCuota.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mes) para ${principal.toLocaleString('es-ES')} € al ${formatLocaleNumber(tin)}% TIN.`;
        }
      } else {
        manualMonthlyInput.value = '';
        if (manualMonthlyHelper) manualMonthlyHelper.textContent = '';
        if (financeCalcFeedback) financeCalcFeedback.style.display = 'none';
      }
    } else if (activeFinancingMode === 'monthly') {
      manualMonthlyInput.disabled = false;
      manualMonthlyInput.classList.remove('input-derived');
      loanTinInput.disabled = true;
      loanTinInput.classList.add('input-derived');

      if (btnUnlockMonthly) btnUnlockMonthly.style.display = 'none';
      if (btnUnlockTin) btnUnlockTin.style.display = 'inline-block';

      if (manualMonthlyHelper) {
        manualMonthlyHelper.textContent = 'Modo activo: Deduciendo TIN a partir de esta cuota';
      }

      const cuota = parseLocaleNumber(manualMonthlyInput.value);
      if (principal > 0 && months > 0 && cuota > 0 && manualMonthlyInput.value.trim() !== '') {
        const deduced = reverseEngineerInterestRate(principal, cuota, months, balloon);
        loanTinInput.value = formatLocaleNumber(deduced.tin);
        if (loanTinHelper) {
          loanTinHelper.textContent = `TIN deducido: ${deduced.tin.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% (TAE ~ ${deduced.apr.toFixed(2)}%)`;
        }
        if (financeCalcFeedback && financeCalcFeedbackText) {
          financeCalcFeedback.style.display = 'block';
          financeCalcFeedbackText.textContent = `Interés deducido: TIN ${deduced.tin.toFixed(2)}% | TAE aprox. ${deduced.apr.toFixed(2)}% para cuota de ${cuota.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mes.`;
        }
      } else {
        loanTinInput.value = '';
        if (loanTinHelper) loanTinHelper.textContent = '';
        if (financeCalcFeedback) financeCalcFeedback.style.display = 'none';
      }
    } else {
      loanTinInput.disabled = false;
      loanTinInput.classList.remove('input-derived');
      manualMonthlyInput.disabled = false;
      manualMonthlyInput.classList.remove('input-derived');

      if (btnUnlockTin) btnUnlockTin.style.display = 'none';
      if (btnUnlockMonthly) btnUnlockMonthly.style.display = 'none';

      if (loanTinHelper) loanTinHelper.textContent = '';
      if (manualMonthlyHelper) manualMonthlyHelper.textContent = '';
      if (financeCalcFeedback) financeCalcFeedback.style.display = 'none';
    }
  }

  function updateEarlyCancelLiveSummary() {
    if (currentModality !== OFFER_MODALITIES.EARLY_CANCELLATION) return;
    const principal = getFinancedPrincipal();
    const contractMonths = Math.max(1, Math.round(Number(loanMonthsInput?.value) || 84));
    const cancelMonth = Math.max(1, Math.round(Number(earlyCancelMonthInput?.value) || 24));
    const penaltyRate = parseLocaleNumber(earlyCancelPenaltyInput?.value || '1,0');

    let tin = parseLocaleNumber(loanTinInput?.value || 0);
    if (activeFinancingMode === 'monthly' && (!tin || tin <= 0)) {
      const cuota = parseLocaleNumber(manualMonthlyInput?.value || 0);
      if (principal > 0 && contractMonths > 0 && cuota > 0) {
        const deduced = reverseEngineerInterestRate(principal, cuota, contractMonths, 0);
        tin = deduced.tin;
      }
    }
    if (tin <= 0 && (!loanTinInput?.value || parseLocaleNumber(loanTinInput.value) <= 0)) {
      tin = 8.5;
    }

    const res = calculateEarlyCancellationSettlement(principal, tin, contractMonths, cancelMonth, penaltyRate);

    if (cancelSummaryMonth) cancelSummaryMonth.textContent = String(res.cancelMonth);
    if (cancelSummaryCapital) cancelSummaryCapital.textContent = `${res.settlementCapital.toLocaleString('es-ES')} €`;
    if (cancelSummaryRate) cancelSummaryRate.textContent = formatLocaleNumber(res.penaltyRate);
    if (cancelSummaryPenalty) cancelSummaryPenalty.textContent = `+${res.penaltyAmount.toLocaleString('es-ES')} €`;
    if (cancelSummarySettlement) cancelSummarySettlement.textContent = `${res.finalSettlementPayment.toLocaleString('es-ES')} €`;
    if (cancelSummarySaved) cancelSummarySaved.textContent = `${res.futureInterestSaved.toLocaleString('es-ES')} €`;
  }

  function updateModalityUI(modality) {
    currentModality = modality;
    modalitySelector.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === modality);
    });

    updateNetCalcPriceUI();

    if (modality === OFFER_MODALITIES.CASH) {
      if (financeFieldsContainer) financeFieldsContainer.style.display = 'none';
      if (downPaymentFieldsContainer) downPaymentFieldsContainer.style.display = 'none';
      if (groupDownPayment) groupDownPayment.style.display = 'none';
      downPaymentInput.value = '0';
      if (financedAmountInput) financedAmountInput.value = '0';
    } else {
      if (financeFieldsContainer) financeFieldsContainer.style.display = 'block';
      if (downPaymentFieldsContainer) downPaymentFieldsContainer.style.display = 'grid';
      if (groupDownPayment) groupDownPayment.style.display = 'block';
      if (downPaymentInput.value === '0' || !downPaymentInput.value) {
        if (!financedAmountInput || !financedAmountInput.value) {
          downPaymentInput.value = '4000';
        }
      }

      if (flexibleBalloonContainer) {
        flexibleBalloonContainer.style.display = modality === OFFER_MODALITIES.FLEXIBLE_FINANCE ? 'block' : 'none';
      }
      if (earlyCancellationContainer) {
        earlyCancellationContainer.style.display = modality === OFFER_MODALITIES.EARLY_CANCELLATION ? 'block' : 'none';
      }
      if (modality === OFFER_MODALITIES.EARLY_CANCELLATION) {
        if (!loanMonthsInput.value || loanMonthsInput.value === '60') {
          loanMonthsInput.value = '84';
          updateMonthsUI('84');
        }
      }
    }
    syncDownPaymentInputs();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  }

  offerPriceInput?.addEventListener('input', () => {
    updateNetCalcPriceUI();
    syncDownPaymentInputs();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });
  financeDiscountInput?.addEventListener('input', () => {
    updateNetCalcPriceUI();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });
  downPaymentInput?.addEventListener('input', () => {
    activeDownPaymentMode = downPaymentInput.value.trim() ? 'down' : null;
    syncDownPaymentInputs(activeDownPaymentMode);
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });
  financedAmountInput?.addEventListener('input', () => {
    activeDownPaymentMode = financedAmountInput.value.trim() ? 'financed' : null;
    syncDownPaymentInputs(activeDownPaymentMode);
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });

  btnUnlockDown?.addEventListener('click', () => {
    if (financedAmountInput) financedAmountInput.value = '';
    downPaymentInput.value = '';
    downPaymentInput.disabled = false;
    if (financedAmountInput) financedAmountInput.disabled = false;
    downPaymentInput.classList.remove('input-derived');
    if (financedAmountInput) financedAmountInput.classList.remove('input-derived');
    activeDownPaymentMode = null;
    syncDownPaymentInputs(null);
    downPaymentInput.focus();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });

  btnUnlockFinanced?.addEventListener('click', () => {
    downPaymentInput.value = '';
    if (financedAmountInput) financedAmountInput.value = '';
    downPaymentInput.disabled = false;
    if (financedAmountInput) financedAmountInput.disabled = false;
    downPaymentInput.classList.remove('input-derived');
    if (financedAmountInput) financedAmountInput.classList.remove('input-derived');
    activeDownPaymentMode = null;
    syncDownPaymentInputs(null);
    if (financedAmountInput) financedAmountInput.focus();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });

  tradeInValueInput?.addEventListener('input', () => {
    syncDownPaymentInputs();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });
  balloonPaymentInput?.addEventListener('input', () => {
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });

  loanTinInput?.addEventListener('input', () => {
    activeFinancingMode = loanTinInput.value.trim() ? 'tin' : null;
    syncFinancingInputs(activeFinancingMode);
    updateEarlyCancelLiveSummary();
  });

  manualMonthlyInput?.addEventListener('input', () => {
    activeFinancingMode = manualMonthlyInput.value.trim() ? 'monthly' : null;
    syncFinancingInputs(activeFinancingMode);
    updateEarlyCancelLiveSummary();
  });

  btnUnlockTin?.addEventListener('click', () => {
    manualMonthlyInput.value = '';
    loanTinInput.value = '';
    loanTinInput.disabled = false;
    manualMonthlyInput.disabled = false;
    loanTinInput.classList.remove('input-derived');
    manualMonthlyInput.classList.remove('input-derived');
    activeFinancingMode = null;
    syncFinancingInputs(null);
    loanTinInput.focus();
    updateEarlyCancelLiveSummary();
  });

  btnUnlockMonthly?.addEventListener('click', () => {
    loanTinInput.value = '';
    manualMonthlyInput.value = '';
    loanTinInput.disabled = false;
    manualMonthlyInput.disabled = false;
    loanTinInput.classList.remove('input-derived');
    manualMonthlyInput.classList.remove('input-derived');
    activeFinancingMode = null;
    syncFinancingInputs(null);
    manualMonthlyInput.focus();
    updateEarlyCancelLiveSummary();
  });

  earlyCancelMonthInput?.addEventListener('input', updateEarlyCancelLiveSummary);
  earlyCancelPenaltyInput?.addEventListener('input', updateEarlyCancelLiveSummary);

  cancelMonthsPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn && btn.dataset.cancel) {
      if (earlyCancelMonthInput) earlyCancelMonthInput.value = btn.dataset.cancel;
      cancelMonthsPills.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateEarlyCancelLiveSummary();
    }
  });

  penaltyQuickPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn && btn.dataset.penalty) {
      if (earlyCancelPenaltyInput) earlyCancelPenaltyInput.value = formatLocaleNumber(btn.dataset.penalty);
      penaltyQuickPills.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateEarlyCancelLiveSummary();
    }
  });

  function updateImagePreview(url) {
    if (!url) {
      if (vehicleAutoPreview) vehicleAutoPreview.style.display = 'none';
      if (imageThumb) {
        imageThumb.style.display = 'none';
        imageThumb.src = '';
      }
      return;
    }

    if (vehicleAutoPreview) vehicleAutoPreview.style.display = 'flex';
    if (imageThumb) {
      imageThumb.src = url;
      imageThumb.onload = () => {
        imageThumb.style.display = 'block';
        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
      };
      imageThumb.onerror = () => {
        imageThumb.style.display = 'none';
        if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
      };
    }
  }

  // Detección automática al escribir o seleccionar vehículo
  vehicleInput?.addEventListener('input', () => {
    const vName = vehicleInput.value.trim();
    const imgUrl = getVehicleImageUrl(vName);
    updateImagePreview(imgUrl);
  });

  loanMonthsInput.addEventListener('input', () => {
    updateMonthsUI(loanMonthsInput.value);
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });

  loanMonthsPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn && btn.dataset.months) {
      loanMonthsInput.value = btn.dataset.months;
      updateMonthsUI(btn.dataset.months);
      syncFinancingInputs();
      updateEarlyCancelLiveSummary();
    }
  });

  modalitySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (btn) {
      updateModalityUI(btn.dataset.val);
    }
  });

  function renderProductsList() {
    productsListContainer.replaceChildren();

    if (linkedProductsState.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-inline-help';
      emptyMsg.textContent = 'No hay productos vinculados obligatorios.';
      productsListContainer.appendChild(emptyMsg);
      return;
    }

    linkedProductsState.forEach((prod) => {
      if (!tmplProduct) return;
      const clone = tmplProduct.content.cloneNode(true);
      const row = clone.querySelector('.linked-product-row');
      if (!row) return;

      const nameInp = row.querySelector('.prod-name, .product-name');
      const costInp = row.querySelector('.prod-cost, .product-cost');
      const financedInp = row.querySelector('.prod-financed, .product-financed');
      const btnRemove = row.querySelector('.btn-remove-prod, .btn-remove-product');

      if (nameInp) {
        nameInp.value = prod.name || '';
        nameInp.addEventListener('change', (e) => {
          prod.name = e.target.value;
        });
      }

      if (costInp) {
        costInp.value = formatLocaleNumber(prod.cost || 0);
        costInp.addEventListener('change', (e) => {
          prod.cost = parseLocaleNumber(e.target.value);
          syncFinancingInputs();
          updateEarlyCancelLiveSummary();
        });
      }

      if (financedInp) {
        financedInp.checked = prod.financed !== false;
        financedInp.addEventListener('change', (e) => {
          prod.financed = e.target.checked;
          syncFinancingInputs();
          updateEarlyCancelLiveSummary();
        });
      }

      if (btnRemove) {
        btnRemove.addEventListener('click', () => {
          linkedProductsState = linkedProductsState.filter(p => p.id !== prod.id);
          renderProductsList();
          syncFinancingInputs();
          updateEarlyCancelLiveSummary();
        });
      }

      productsListContainer.appendChild(clone);
    });
  }

  btnAddProduct?.addEventListener('click', () => {
    linkedProductsState.push({
      id: generateId(ID_PREFIX_PRODUCT),
      name: 'Seguro de protección de pagos',
      cost: 350,
      financed: true
    });
    renderProductsList();
    syncFinancingInputs();
    updateEarlyCancelLiveSummary();
  });

  function updateIncludedServicesTotalBadge() {
    const totalVal = includedServicesState.reduce((sum, s) => sum + (Number(s.marketValue) || 0), 0);
    if (includedServicesTotalBadge) {
      if (totalVal > 0) {
        includedServicesTotalBadge.style.display = 'inline-flex';
        includedServicesTotalBadge.textContent = `🎁 ${totalVal.toLocaleString('es-ES')} € en servicios`;
      } else {
        includedServicesTotalBadge.style.display = 'none';
      }
    }
  }

  function renderIncludedServicesList() {
    if (!includedServicesContainer) return;
    includedServicesContainer.replaceChildren();

    if (includedServicesState.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-inline-help';
      emptyMsg.textContent = 'Sin servicios bonificados añadidos (ej. mantenimiento, seguro o garantía).';
      includedServicesContainer.appendChild(emptyMsg);
      updateIncludedServicesTotalBadge();
      return;
    }

    includedServicesState.forEach((srv) => {
      if (!tmplIncludedService) return;
      const clone = tmplIncludedService.content.cloneNode(true);
      const row = clone.querySelector('.included-service-row');
      if (!row) return;

      const nameInp = row.querySelector('.service-name');
      const valInp = row.querySelector('.service-value');
      const btnRemove = row.querySelector('.btn-remove-service');

      if (nameInp) {
        nameInp.value = srv.name || '';
        nameInp.addEventListener('change', (e) => {
          srv.name = e.target.value;
        });
      }

      if (valInp) {
        valInp.value = formatLocaleNumber(srv.marketValue || 0);
        valInp.addEventListener('change', (e) => {
          srv.marketValue = parseLocaleNumber(e.target.value);
          updateIncludedServicesTotalBadge();
        });
      }

      if (btnRemove) {
        btnRemove.addEventListener('click', () => {
          includedServicesState = includedServicesState.filter(s => s.id !== srv.id);
          renderIncludedServicesList();
        });
      }

      includedServicesContainer.appendChild(clone);
    });

    updateIncludedServicesTotalBadge();
  }

  // Presets de 1 clic (calibrados con RAV4 y Tucson)
  dialog.querySelectorAll('.btn-add-preset-service').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name || 'Servicio incluido';
      const val = parseLocaleNumber(btn.dataset.value || 0);
      includedServicesState.push({
        id: generateId(ID_PREFIX_SERVICE),
        name,
        marketValue: val
      });
      renderIncludedServicesList();
    });
  });

  btnAddCustomService?.addEventListener('click', () => {
    includedServicesState.push({
      id: generateId(ID_PREFIX_SERVICE),
      name: 'Mantenimiento / Seguro oficial',
      marketValue: 500
    });
    renderIncludedServicesList();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const vName = vehicleInput ? vehicleInput.value.trim() : '';
    const vehiclePrice = parseLocaleNumber(offerPriceInput.value);
    const financeDiscount = currentModality === OFFER_MODALITIES.CASH ? 0 : parseLocaleNumber(financeDiscountInput.value);
    const calculationPrice = vehiclePrice; // Precio final con descuento de financiación ya incluido
    const cashPriceRef = currentModality === OFFER_MODALITIES.CASH ? vehiclePrice : (vehiclePrice + financeDiscount);
    const months = Math.max(1, Math.round(Number(loanMonthsInput.value) || 60));
    const detectedImg = getVehicleImageUrl(vName);

    const isEarlyCancel = currentModality === OFFER_MODALITIES.EARLY_CANCELLATION;
    const cancelMonth = isEarlyCancel ? Math.max(1, Math.round(Number(earlyCancelMonthInput?.value) || 24)) : 0;
    const penaltyRate = isEarlyCancel ? parseLocaleNumber(earlyCancelPenaltyInput?.value || '1,0') : 0;
    const balloonPayment = parseLocaleNumber(balloonPaymentInput.value);
    const principal = getFinancedPrincipal();

    let finalTin = parseLocaleNumber(loanTinInput.value);
    let finalManualMonthly = manualMonthlyInput.value ? parseLocaleNumber(manualMonthlyInput.value) : null;

    if (currentModality !== OFFER_MODALITIES.CASH) {
      if (activeFinancingMode === 'monthly') {
        const manualVal = parseLocaleNumber(manualMonthlyInput.value);
        if (manualVal > 0) {
          finalManualMonthly = manualVal;
          const deduced = reverseEngineerInterestRate(principal, manualVal, months, balloonPayment);
          finalTin = deduced.tin;
        } else {
          finalManualMonthly = null;
        }
      } else if (activeFinancingMode === 'tin') {
        finalManualMonthly = null;
        finalTin = parseLocaleNumber(loanTinInput.value);
      }
    }

    const downPayment = currentModality === OFFER_MODALITIES.CASH ? 0 : parseLocaleNumber(downPaymentInput.value);
    const financedAmount = currentModality === OFFER_MODALITIES.CASH ? 0 : (financedAmountInput && financedAmountInput.value ? parseLocaleNumber(financedAmountInput.value) : principal);

    const offerData = {
      id: idInput.value || generateId(ID_PREFIX_OFFER),
      vehicle: vName || 'Vehículo sin especificar',
      imageUrl: detectedImg || '',
      title: getOfferDisplayTitle({ vehicle: vName, modality: currentModality, months, contractMonths: months, earlyCancellationMonth: cancelMonth }),
      dealer: dealerInput.value.trim(),
      notes: notesInput.value.trim(),
      modality: currentModality,
      vehiclePrice,
      financeDiscount,
      cashPriceReference: cashPriceRef,
      offerPrice: calculationPrice,
      advertisedDiscount: financeDiscount,
      downPayment,
      financedAmount,
      tradeInValue: parseLocaleNumber(tradeInValueInput.value),
      months,
      contractMonths: months,
      earlyCancellationMonth: cancelMonth,
      earlyCancellationPenaltyRate: penaltyRate,
      tin: finalTin,
      manualMonthlyPayment: finalManualMonthly,
      balloonPayment,
      linkedProducts: linkedProductsState.map(p => ({
        ...p,
        cost: parseLocaleNumber(p.cost)
      })),
      includedServices: includedServicesState.map(s => ({
        ...s,
        marketValue: parseLocaleNumber(s.marketValue)
      }))
    };

    onSave(offerData);
    dialog.close();
  });

  btnClose?.addEventListener('click', () => dialog.close());
  btnCancel?.addEventListener('click', () => dialog.close());

  return {
    open(offer = null, defaultVehicle = null) {
      form.reset();

      // Rellenar datalist de vehículos conocidos
      if (vehiclesDatalist && typeof getKnownVehicles === 'function') {
        vehiclesDatalist.replaceChildren();
        const known = getKnownVehicles() || [];
        known.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v;
          vehiclesDatalist.appendChild(opt);
        });
      }

      if (offer) {
        modalTitle.textContent = 'Editar oferta';
        idInput.value = offer.id;
        const vName = offer.vehicle || getOfferVehicle(offer) || '';
        if (vehicleInput) vehicleInput.value = vName;
        dealerInput.value = offer.dealer || '';
        notesInput.value = offer.notes || '';
        
        // Precio del vehículo y descuento por financiar
        const vPrice = offer.offerPrice || offer.vehiclePrice || offer.cashPriceReference || '';
        offerPriceInput.value = formatLocaleNumber(vPrice);
        const fDisc = offer.financeDiscount !== undefined 
          ? offer.financeDiscount 
          : (offer.advertisedDiscount || (offer.cashPriceReference && offer.offerPrice && Number(offer.cashPriceReference) > Number(offer.offerPrice) ? Number(offer.cashPriceReference) - Number(offer.offerPrice) : ''));
        financeDiscountInput.value = formatLocaleNumber(fDisc);
        
        // Imagen del modelo
        const currentImg = getVehicleImageUrl(vName, offer.imageUrl);
        updateImagePreview(currentImg);

        if (offer.modality === OFFER_MODALITIES.CASH) {
          downPaymentInput.value = '0';
          if (financedAmountInput) financedAmountInput.value = '0';
          activeDownPaymentMode = null;
          syncDownPaymentInputs(null);
        } else if (offer.financedAmount && (offer.downPayment === undefined || offer.downPayment === null)) {
          if (financedAmountInput) financedAmountInput.value = formatLocaleNumber(offer.financedAmount);
          downPaymentInput.value = '';
          activeDownPaymentMode = 'financed';
          syncDownPaymentInputs('financed');
        } else {
          downPaymentInput.value = formatLocaleNumber(offer.downPayment || '');
          if (financedAmountInput) financedAmountInput.value = '';
          activeDownPaymentMode = 'down';
          syncDownPaymentInputs('down');
        }

        tradeInValueInput.value = formatLocaleNumber(offer.tradeInValue || '');
        loanMonthsInput.value = String(offer.contractMonths || offer.months || 60);
        updateMonthsUI(offer.contractMonths || offer.months || 60);
        balloonPaymentInput.value = offer.balloonPayment ? formatLocaleNumber(offer.balloonPayment) : '';

        if (offer.manualMonthlyPayment) {
          manualMonthlyInput.value = formatLocaleNumber(offer.manualMonthlyPayment);
          loanTinInput.value = '';
          syncFinancingInputs('monthly');
        } else {
          loanTinInput.value = offer.tin !== undefined ? formatLocaleNumber(offer.tin) : '8,5';
          manualMonthlyInput.value = '';
          syncFinancingInputs('tin');
        }

        // Campos de cancelación anticipada
        if (earlyCancelMonthInput) {
          earlyCancelMonthInput.value = String(offer.earlyCancellationMonth || 24);
        }
        if (earlyCancelPenaltyInput) {
          earlyCancelPenaltyInput.value = offer.earlyCancellationPenaltyRate !== undefined ? formatLocaleNumber(offer.earlyCancellationPenaltyRate) : '1,0';
        }
        if (cancelMonthsPills) {
          const cM = Number(offer.earlyCancellationMonth || 24);
          cancelMonthsPills.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.cancel) === cM));
        }
        if (penaltyQuickPills) {
          const pR = Number(offer.earlyCancellationPenaltyRate !== undefined ? offer.earlyCancellationPenaltyRate : 1.0);
          penaltyQuickPills.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.penalty) === pR));
        }

        linkedProductsState = offer.linkedProducts
          ? offer.linkedProducts.map(p => ({
              id: p.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              ...p
            }))
          : [];
        includedServicesState = Array.isArray(offer.includedServices)
          ? offer.includedServices.map(s => ({
              id: s.id || generateId(ID_PREFIX_SERVICE),
              ...s,
              marketValue: parseLocaleNumber(s.marketValue)
            }))
          : [];
        updateModalityUI(offer.modality || OFFER_MODALITIES.STANDARD_FINANCE);
        updateNetCalcPriceUI();
        updateEarlyCancelLiveSummary();
      } else {
        modalTitle.textContent = 'Nueva oferta de concesionario';
        idInput.value = '';
        const initialVeh = defaultVehicle || '';
        if (vehicleInput) vehicleInput.value = initialVeh;
        offerPriceInput.value = '';
        financeDiscountInput.value = '';
        downPaymentInput.value = '';
        if (financedAmountInput) financedAmountInput.value = '';
        activeDownPaymentMode = null;
        syncDownPaymentInputs(null);
        loanMonthsInput.value = '';
        if (loanMonthsBadge) loanMonthsBadge.textContent = '';
        if (loanMonthsPills) {
          loanMonthsPills.querySelectorAll('.months-pill-btn').forEach(btn => btn.classList.remove('active'));
        }
        loanTinInput.value = '';
        if (tradeInValueInput) tradeInValueInput.value = '';
        if (manualMonthlyInput) manualMonthlyInput.value = '';
        if (balloonPaymentInput) balloonPaymentInput.value = '';
        activeFinancingMode = null;
        syncFinancingInputs(null);
        if (earlyCancelMonthInput) earlyCancelMonthInput.value = '24';
        if (earlyCancelPenaltyInput) earlyCancelPenaltyInput.value = '1,0';
        if (cancelMonthsPills) {
          cancelMonthsPills.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', b.dataset.cancel === '24'));
        }
        if (penaltyQuickPills) {
          penaltyQuickPills.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', b.dataset.penalty === '1'));
        }
        linkedProductsState = [];
        includedServicesState = [];

        // Asignar imagen del modelo si hay vehículo por defecto
        const defaultImg = getVehicleImageUrl(initialVeh);
        updateImagePreview(defaultImg);

        updateModalityUI(OFFER_MODALITIES.STANDARD_FINANCE);
        updateNetCalcPriceUI();
        updateEarlyCancelLiveSummary();
      }
      renderProductsList();
      renderIncludedServicesList();
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
