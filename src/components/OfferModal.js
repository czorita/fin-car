/**
 * Controlador del Modal de Oferta (Creación y Edición).
 * Conecta con el formulario semántico declarado en index.html y usa plantillas para productos vinculados.
 */

import { OFFER_MODALITIES } from '../core/types.js';

/**
 * Inicializa el modal de formulario de oferta.
 * @param {object} options
 * @param {Function} options.onSave
 * @returns {{ open: (offer?: any) => void, close: () => void }}
 */
export function initOfferModal({ onSave }) {
  const dialog = document.getElementById('modal-offer');
  const form = document.getElementById('form-offer');
  const modalTitle = document.getElementById('modal-offer-title');
  const btnClose = document.getElementById('btn-close-offer-modal');
  const btnCancel = document.getElementById('btn-cancel-offer');
  const modalitySelector = document.getElementById('modality-selector');
  const financeFieldsContainer = document.getElementById('finance-fields-container');
  const flexibleBalloonContainer = document.getElementById('flexible-balloon-container');
  const productsListContainer = document.getElementById('linked-products-list');
  const discountPreviewText = document.getElementById('discount-preview-text');
  const groupDownPayment = document.getElementById('group-down-payment');
  const btnAddProduct = document.getElementById('btn-add-product');
  const tmplProduct = document.getElementById('tmpl-linked-product');

  // Campos del formulario
  const idInput = document.getElementById('offer-id');
  const titleInput = document.getElementById('offer-title');
  const dealerInput = document.getElementById('offer-dealer');
  const notesInput = document.getElementById('offer-notes');
  const cashRefPriceInput = document.getElementById('cash-ref-price');
  const offerPriceInput = document.getElementById('offer-price');
  const downPaymentInput = document.getElementById('down-payment');
  const tradeInValueInput = document.getElementById('trade-in-value');
  const registrationFeeInput = document.getElementById('registration-fee');
  const loanMonthsInput = document.getElementById('loan-months');
  const loanTinInput = document.getElementById('loan-tin');
  const manualMonthlyInput = document.getElementById('manual-monthly');
  const balloonPaymentInput = document.getElementById('balloon-payment');
  const balloonDecisionInput = document.getElementById('balloon-decision');
  const openingPctInput = document.getElementById('opening-pct');
  const openingFinancedInput = document.getElementById('opening-financed');

  let currentModality = OFFER_MODALITIES.STANDARD_FINANCE;
  let linkedProductsState = [];

  function updateModalityUI(modality) {
    currentModality = modality;
    modalitySelector.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === modality);
    });

    if (modality === OFFER_MODALITIES.CASH) {
      if (financeFieldsContainer) financeFieldsContainer.style.display = 'none';
      if (groupDownPayment) groupDownPayment.style.display = 'none';
    } else {
      if (financeFieldsContainer) financeFieldsContainer.style.display = 'block';
      if (groupDownPayment) groupDownPayment.style.display = 'block';

      if (flexibleBalloonContainer) {
        flexibleBalloonContainer.style.display = modality === OFFER_MODALITIES.FLEXIBLE_FINANCE ? 'block' : 'none';
      }
    }
  }

  function updateDiscountPreview() {
    const cashRef = Number(cashRefPriceInput.value) || 0;
    const offerPrice = Number(offerPriceInput.value) || 0;
    const diff = cashRef - offerPrice;

    if (diff > 0) {
      discountPreviewText.textContent = `Descuento prometido: -${diff.toLocaleString('es-ES')} €`;
      discountPreviewText.style.color = 'var(--accent-emerald)';
    } else if (diff < 0) {
      discountPreviewText.textContent = `Sobreprecio: +${Math.abs(diff).toLocaleString('es-ES')} €`;
      discountPreviewText.style.color = 'var(--accent-rose)';
    } else {
      discountPreviewText.textContent = 'Mismo precio que al contado';
      discountPreviewText.style.color = 'var(--text-muted)';
    }
  }

  cashRefPriceInput.addEventListener('input', updateDiscountPreview);
  offerPriceInput.addEventListener('input', updateDiscountPreview);

  modalitySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (btn) {
      updateModalityUI(btn.dataset.val);
    }
  });

  function renderProductsList() {
    productsListContainer.replaceChildren();

    if (linkedProductsState.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.style.fontSize = '0.78rem';
      emptySpan.style.color = 'var(--text-muted)';
      emptySpan.style.fontStyle = 'italic';
      emptySpan.textContent = 'Sin seguros ni productos adicionales añadidos.';
      productsListContainer.appendChild(emptySpan);
      return;
    }

    linkedProductsState.forEach((prod, index) => {
      const clone = tmplProduct.content.cloneNode(true);
      const row = clone.querySelector('.linked-product-row');
      const nameInput = row.querySelector('.prod-name');
      const costInput = row.querySelector('.prod-cost');
      const financedInput = row.querySelector('.prod-financed');
      const btnRemove = row.querySelector('.btn-remove-prod');

      nameInput.value = prod.name;
      costInput.value = prod.cost;
      financedInput.checked = Boolean(prod.financed);

      nameInput.addEventListener('input', (e) => {
        linkedProductsState[index].name = e.target.value;
      });
      costInput.addEventListener('input', (e) => {
        linkedProductsState[index].cost = Number(e.target.value) || 0;
      });
      financedInput.addEventListener('change', (e) => {
        linkedProductsState[index].financed = e.target.checked;
      });
      btnRemove.addEventListener('click', () => {
        linkedProductsState.splice(index, 1);
        renderProductsList();
      });

      productsListContainer.appendChild(row);
    });
  }

  btnAddProduct?.addEventListener('click', () => {
    linkedProductsState.push({
      id: `p_${Date.now()}`,
      name: 'Seguro Vinculado',
      cost: 650,
      financed: true
    });
    renderProductsList();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const offerData = {
      id: idInput.value || undefined,
      title: titleInput.value.trim(),
      dealer: dealerInput.value.trim(),
      notes: notesInput.value.trim(),
      modality: currentModality,
      cashPriceReference: Number(cashRefPriceInput.value) || 0,
      offerPrice: Number(offerPriceInput.value) || 0,
      downPayment: Number(downPaymentInput.value) || 0,
      tradeInValue: Number(tradeInValueInput.value) || 0,
      registrationFee: Number(registrationFeeInput.value) || 0,
      months: Number(loanMonthsInput.value) || 60,
      tin: Number(loanTinInput.value) || 0,
      manualMonthlyPayment: manualMonthlyInput.value ? Number(manualMonthlyInput.value) : null,
      balloonPayment: Number(balloonPaymentInput.value) || 0,
      balloonDecision: balloonDecisionInput.value,
      openingFeePercentage: Number(openingPctInput.value) || 0,
      openingFeeFinanced: openingFinancedInput.checked,
      linkedProducts: linkedProductsState
    };

    onSave(offerData);
    dialog.close();
  });

  btnClose?.addEventListener('click', () => dialog.close());
  btnCancel?.addEventListener('click', () => dialog.close());

  return {
    open(offer = null) {
      form.reset();
      if (offer) {
        modalTitle.textContent = 'Editar Oferta';
        idInput.value = offer.id;
        titleInput.value = offer.title || '';
        dealerInput.value = offer.dealer || '';
        notesInput.value = offer.notes || '';
        cashRefPriceInput.value = offer.cashPriceReference || offer.offerPrice || '';
        offerPriceInput.value = offer.offerPrice || '';
        downPaymentInput.value = offer.downPayment || '';
        tradeInValueInput.value = offer.tradeInValue || '';
        registrationFeeInput.value = offer.registrationFee || '';
        loanMonthsInput.value = String(offer.months || 60);
        loanTinInput.value = offer.tin !== undefined ? offer.tin : 8.5;
        manualMonthlyInput.value = offer.manualMonthlyPayment || '';
        balloonPaymentInput.value = offer.balloonPayment || '';
        balloonDecisionInput.value = offer.balloonDecision || 'keep';
        openingPctInput.value = offer.openingFeePercentage !== undefined ? offer.openingFeePercentage : 3.0;
        openingFinancedInput.checked = offer.openingFeeFinanced !== undefined ? offer.openingFeeFinanced : true;
        linkedProductsState = offer.linkedProducts ? JSON.parse(JSON.stringify(offer.linkedProducts)) : [];
        updateModalityUI(offer.modality || OFFER_MODALITIES.STANDARD_FINANCE);
      } else {
        modalTitle.textContent = 'Nueva Oferta de Concesionario';
        idInput.value = '';
        cashRefPriceInput.value = '26000';
        offerPriceInput.value = '23500';
        downPaymentInput.value = '4000';
        registrationFeeInput.value = '450';
        loanMonthsInput.value = '60';
        loanTinInput.value = '8.5';
        openingPctInput.value = '3.0';
        openingFinancedInput.checked = true;
        linkedProductsState = [];
        updateModalityUI(OFFER_MODALITIES.STANDARD_FINANCE);
      }
      renderProductsList();
      updateDiscountPreview();
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
