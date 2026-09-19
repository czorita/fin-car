/**
 * Controlador del Modal de Ingeniería Inversa.
 * Conecta con el formulario de index.html y actualiza los indicadores financieros usando DOM nativo.
 */

import { reverseEngineerInterestRate } from '../core/finance.js';
import { OFFER_MODALITIES } from '../core/types.js';

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
  const balloonInput = document.getElementById('rev-balloon');

  const outTinEl = document.getElementById('rev-out-tin');
  const outAprEl = document.getElementById('rev-out-apr');
  const outInterestEl = document.getElementById('rev-out-interest');
  const outTotalEl = document.getElementById('rev-out-total');

  let currentComputedOffer = null;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const price = Number(priceInput.value) || 0;
    const down = Number(downInput.value) || 0;
    const monthly = Number(monthlyInput.value) || 0;
    const months = Number(monthsInput.value) || 60;
    const balloon = Number(balloonInput.value) || 0;

    const principal = Math.max(0, price - down);
    const rev = reverseEngineerInterestRate(principal, monthly, months, balloon);
    const totalOutOfPocket = down + rev.totalPaid;

    outTinEl.textContent = `${rev.tin}%`;
    outAprEl.textContent = `${rev.apr}%`;
    outInterestEl.textContent = `+${rev.totalInterest.toLocaleString('es-ES')} €`;
    outTotalEl.textContent = `${totalOutOfPocket.toLocaleString('es-ES')} €`;

    resultsContainer.style.display = 'block';

    currentComputedOffer = {
      title: `Cálculo Inverso (${months} meses a ${monthly}€/mes)`,
      dealer: 'Presupuesto Deducido',
      modality: balloon > 0 ? OFFER_MODALITIES.FLEXIBLE_FINANCE : OFFER_MODALITIES.STANDARD_FINANCE,
      cashPriceReference: price,
      offerPrice: price,
      downPayment: down,
      tradeInValue: 0,
      registrationFee: 0,
      months: months,
      tin: rev.tin,
      manualMonthlyPayment: monthly,
      balloonPayment: balloon,
      openingFeePercentage: 0,
      openingFeeFinanced: false,
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
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
