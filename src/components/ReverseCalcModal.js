/**
 * Controlador del Modal de Ingeniería Inversa.
 * Conecta con el formulario de index.html y deduce el tipo de interés a partir de cuotas.
 * Soporta comas decimales con parseLocaleNumber.
 */

import { reverseEngineerInterestRate } from '../core/finance.js';
import { OFFER_MODALITIES } from '../core/types.js';
import { parseLocaleNumber, formatMonthsDuration } from '../core/formatters.js';

/**
 * Inicializa el modal de ingeniería inversa.
 * @param {object} options
 * @param {Function} options.onApplyAsOffer
 * @returns {{ open: () => void, close: () => void }}
 */
export function initReverseCalcModal({ onApplyAsOffer }) {
  const dialog = document.getElementById('modal-reverse-calc');
  const form = document.getElementById('form-reverse-calc');
  const resultsContainer = document.getElementById('reverse-results-container');
  const btnCloseHeader = document.getElementById('btn-close-reverse');
  const btnCloseFooter = document.getElementById('btn-close-reverse-footer');
  const btnApply = document.getElementById('btn-apply-reverse-as-offer');

  const priceInput = document.getElementById('rev-price');
  const downInput = document.getElementById('rev-down');
  const monthlyInput = document.getElementById('rev-monthly');
  const monthsInput = document.getElementById('rev-months');
  const monthsBadge = document.getElementById('rev-months-badge');
  const monthsPills = document.getElementById('rev-months-pills');
  const balloonInput = document.getElementById('rev-balloon');

  const outTinEl = document.getElementById('rev-out-tin');
  const outAprEl = document.getElementById('rev-out-apr');
  const outInterestEl = document.getElementById('rev-out-interest');
  const outTotalEl = document.getElementById('rev-out-total');

  let currentComputedOffer = null;

  function updateMonthsUI(val) {
    const months = Math.max(1, Math.round(Number(val) || 60));
    if (monthsBadge) {
      monthsBadge.textContent = formatMonthsDuration(months);
    }
    if (monthsPills) {
      monthsPills.querySelectorAll('.months-pill-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.months) === months);
      });
    }
  }

  monthsInput?.addEventListener('input', () => {
    updateMonthsUI(monthsInput.value);
  });

  monthsPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn && btn.dataset.months) {
      monthsInput.value = btn.dataset.months;
      updateMonthsUI(btn.dataset.months);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const price = parseLocaleNumber(priceInput.value);
    const down = parseLocaleNumber(downInput.value);
    const monthly = parseLocaleNumber(monthlyInput.value);
    const months = Math.max(1, Math.round(Number(monthsInput.value) || 60));
    const balloon = parseLocaleNumber(balloonInput.value);

    const principal = Math.max(0, price - down);
    const rev = reverseEngineerInterestRate(principal, monthly, months, balloon);
    const totalOutOfPocket = down + rev.totalPaid;

    outTinEl.textContent = `${rev.tin.toLocaleString('es-ES')}%`;
    outAprEl.textContent = `${rev.apr.toLocaleString('es-ES')}%`;
    outInterestEl.textContent = `+${rev.totalInterest.toLocaleString('es-ES')} €`;
    outTotalEl.textContent = `${totalOutOfPocket.toLocaleString('es-ES')} €`;

    resultsContainer.style.display = 'block';

    currentComputedOffer = {
      title: `Cálculo inverso (${months} meses a ${monthly.toLocaleString('es-ES')}€/mes)`,
      dealer: 'Presupuesto deducido',
      modality: balloon > 0 ? OFFER_MODALITIES.FLEXIBLE_FINANCE : OFFER_MODALITIES.STANDARD_FINANCE,
      cashPriceReference: price,
      offerPrice: price,
      downPayment: down,
      tradeInValue: 0,
      months: months,
      tin: rev.tin,
      manualMonthlyPayment: monthly,
      balloonPayment: balloon,
      linkedProducts: []
    };
  });

  btnApply?.addEventListener('click', () => {
    if (currentComputedOffer) {
      onApplyAsOffer(currentComputedOffer);
      dialog.close();
    }
  });

  btnCloseHeader?.addEventListener('click', () => dialog.close());
  btnCloseFooter?.addEventListener('click', () => dialog.close());

  return {
    open() {
      form.reset();
      resultsContainer.style.display = 'none';
      currentComputedOffer = null;
      if (monthsInput) {
        monthsInput.value = '60';
        updateMonthsUI(60);
      }
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
