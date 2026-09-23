/**
 * Panel de cancelación anticipada del modal de oferta:
 * mes de cancelación, comisión y resumen en vivo del finiquito.
 */

import { parseLocaleNumber, parseLocaleRate, formatLocaleNumber } from '../../core/formatters.js';
import { DEFAULTS } from '../../core/constants.js';
import { calculateEarlyCancellationSettlement, reverseEngineerInterestRate } from '../../core/finance.js';
import { parseMonths } from './formSerializer.js';

/** Plazo de contrato por defecto en financiación flexible con cancelación anticipada */
const FLEXIBLE_DEFAULT_MONTHS = 48;

/**
 * Marca como activa la píldora cuyo data-atributo coincide con el valor.
 * @param {HTMLElement|null} pills
 * @param {(btn: HTMLElement) => boolean} isActive
 */
function togglePills(pills, isActive) {
  pills?.querySelectorAll('.months-pill-btn').forEach(b => b.classList.toggle('active', isActive(b)));
}

/**
 * Crea el panel de cancelación anticipada.
 * @param {Record<string, HTMLElement|null>} els Elementos del modal
 * @param {object} ctx
 * @param {() => { isEarlyCancel: boolean, isFlexibleEarly: boolean }} ctx.getMode
 * @param {() => number} ctx.getPrincipal
 * @param {() => 'tin'|'monthly'|null} ctx.getFinancingMode
 * @param {() => void} ctx.onChange
 * @returns {{ update: () => void, setValues: (month: string, penalty: string) => void }}
 */
export function createEarlyCancellationPanel(els, { getMode, getPrincipal, getFinancingMode, onChange }) {
  const { earlyCancelMonthInput, earlyCancelPenaltyInput, cancelMonthsPills, penaltyQuickPills } = els;

  /**
   * Recalcula el resumen en vivo del finiquito.
   */
  function update() {
    const { isEarlyCancel, isFlexibleEarly } = getMode();
    if (!isEarlyCancel && !isFlexibleEarly) return;

    const principal = getPrincipal();
    const contractMonths = parseMonths(
      els.loanMonthsInput?.value,
      isEarlyCancel ? DEFAULTS.contractMonths : FLEXIBLE_DEFAULT_MONTHS
    );
    const cancelMonth = parseMonths(earlyCancelMonthInput?.value, DEFAULTS.earlyCancellationMonth);
    const penaltyRate = parseLocaleRate(earlyCancelPenaltyInput?.value || '1,0');
    const balloon = isFlexibleEarly ? parseLocaleNumber(els.balloonPaymentInput?.value || 0) : 0;

    // Cuota manual: la liquidación se calcula con ella (igual que en normalizeOffer)
    const isMonthlyMode = getFinancingMode() === 'monthly';
    const manualCuota = isMonthlyMode ? parseLocaleNumber(els.manualMonthlyInput?.value || 0) : 0;
    let tin = parseLocaleRate(els.loanTinInput?.value || 0);
    if (isMonthlyMode && (!tin || tin <= 0) && principal > 0 && contractMonths > 0 && manualCuota > 0) {
      tin = reverseEngineerInterestRate(principal, manualCuota, contractMonths, balloon).tin;
    }
    if (tin <= 0 && (!els.loanTinInput?.value || parseLocaleRate(els.loanTinInput.value) <= 0)) {
      tin = DEFAULTS.tin;
    }

    const res = calculateEarlyCancellationSettlement(
      principal,
      tin,
      contractMonths,
      cancelMonth,
      penaltyRate,
      balloon,
      manualCuota > 0 ? manualCuota : null
    );

    const setText = (node, text) => {
      if (node) node.textContent = text;
    };
    setText(els.cancelSummaryMonth, String(res.cancelMonth));
    setText(els.cancelSummaryCapital, `${res.settlementCapital.toLocaleString('es-ES')} €`);
    setText(els.cancelSummaryRate, formatLocaleNumber(res.penaltyRate));
    setText(els.cancelSummaryPenalty, `+${res.penaltyAmount.toLocaleString('es-ES')} €`);
    setText(els.cancelSummarySettlement, `${res.finalSettlementPayment.toLocaleString('es-ES')} €`);
    setText(els.cancelSummarySaved, `${res.futureInterestSaved.toLocaleString('es-ES')} €`);
  }

  earlyCancelMonthInput?.addEventListener('input', onChange);
  earlyCancelPenaltyInput?.addEventListener('input', onChange);

  cancelMonthsPills?.addEventListener('click', e => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn?.dataset.cancel) {
      if (earlyCancelMonthInput) earlyCancelMonthInput.value = btn.dataset.cancel;
      togglePills(cancelMonthsPills, b => b === btn);
      onChange();
    }
  });

  penaltyQuickPills?.addEventListener('click', e => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn?.dataset.penalty) {
      if (earlyCancelPenaltyInput) earlyCancelPenaltyInput.value = formatLocaleNumber(btn.dataset.penalty);
      togglePills(penaltyQuickPills, b => b === btn);
      onChange();
    }
  });

  return {
    update,
    setValues(month, penalty) {
      if (earlyCancelMonthInput) earlyCancelMonthInput.value = month;
      if (earlyCancelPenaltyInput) earlyCancelPenaltyInput.value = penalty;
      togglePills(cancelMonthsPills, b => Number(b.dataset.cancel) === Number(month));
      togglePills(penaltyQuickPills, b => Number(b.dataset.penalty) === parseLocaleRate(penalty));
    }
  };
}
