/**
 * Controlador del Modal de Oferta (Creación y Edición).
 * Conecta con el formulario semántico declarado en index.html y usa plantillas para productos vinculados.
 * Admite comas decimales en todos los campos numéricos mediante parseLocaleNumber.
 * Soporta unificación de precio en un único campo y asignación automática de imágenes del modelo.
 */

import { OFFER_MODALITIES, getOfferVehicle, getOfferDisplayTitle } from '../core/types.js';
import { parseLocaleNumber, formatLocaleNumber, formatMonthsDuration } from '../core/formatters.js';
import { generateId, ID_PREFIX_OFFER, ID_PREFIX_PRODUCT } from '../core/constants.js';
import { getVehicleImageUrl, findVehicleInCatalog } from '../core/vehicleCatalog.js';

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
  const productsListContainer = document.getElementById('linked-products-list');
  const groupDownPayment = document.getElementById('group-down-payment');
  const btnAddProduct = document.getElementById('btn-add-product');
  const tmplProduct = document.getElementById('tmpl-linked-product');

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
  const netCalcPriceVal = document.getElementById('net-calc-price-val');
  const downPaymentInput = document.getElementById('down-payment');
  const tradeInValueInput = document.getElementById('trade-in-value');
  const loanMonthsInput = document.getElementById('loan-months');
  const loanMonthsBadge = document.getElementById('loan-months-badge');
  const loanMonthsPills = document.getElementById('loan-months-pills');
  const loanTinInput = document.getElementById('loan-tin');
  const manualMonthlyInput = document.getElementById('manual-monthly');
  const balloonPaymentInput = document.getElementById('balloon-payment');

  let currentModality = OFFER_MODALITIES.STANDARD_FINANCE;
  let linkedProductsState = [];

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
    const net = Math.max(0, price - discount);

    if (netCalcPriceVal) {
      netCalcPriceVal.textContent = `${net.toLocaleString('es-ES')} €`;
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

  function updateModalityUI(modality) {
    currentModality = modality;
    modalitySelector.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === modality);
    });

    updateNetCalcPriceUI();

    if (modality === OFFER_MODALITIES.CASH) {
      if (financeFieldsContainer) financeFieldsContainer.style.display = 'none';
      if (groupDownPayment) groupDownPayment.style.display = 'none';
      downPaymentInput.value = '0';
    } else {
      if (financeFieldsContainer) financeFieldsContainer.style.display = 'block';
      if (groupDownPayment) groupDownPayment.style.display = 'block';
      if (downPaymentInput.value === '0' || !downPaymentInput.value) {
        downPaymentInput.value = '4000';
      }

      if (flexibleBalloonContainer) {
        flexibleBalloonContainer.style.display = modality === OFFER_MODALITIES.FLEXIBLE_FINANCE ? 'block' : 'none';
      }
    }
  }

  offerPriceInput?.addEventListener('input', updateNetCalcPriceUI);
  financeDiscountInput?.addEventListener('input', updateNetCalcPriceUI);

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
  });

  loanMonthsPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.months-pill-btn');
    if (btn && btn.dataset.months) {
      loanMonthsInput.value = btn.dataset.months;
      updateMonthsUI(btn.dataset.months);
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
      const clone = tmplProduct.content.cloneNode(true);
      const row = clone.querySelector('.linked-product-row');
      const nameInp = row.querySelector('.product-name');
      const costInp = row.querySelector('.product-cost');
      const btnRemove = row.querySelector('.btn-remove-product');

      nameInp.value = prod.name;
      costInp.value = formatLocaleNumber(prod.cost);

      nameInp.addEventListener('change', (e) => {
        prod.name = e.target.value;
      });

      costInp.addEventListener('change', (e) => {
        prod.cost = parseLocaleNumber(e.target.value);
      });

      btnRemove.addEventListener('click', () => {
        linkedProductsState = linkedProductsState.filter(p => p.id !== prod.id);
        renderProductsList();
      });

      productsListContainer.appendChild(clone);
    });
  }

  btnAddProduct?.addEventListener('click', () => {
    linkedProductsState.push({
      id: generateId(ID_PREFIX_PRODUCT),
      name: 'Seguro de Vida / Neumáticos',
      cost: 350
    });
    renderProductsList();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const vName = vehicleInput ? vehicleInput.value.trim() : '';
    const vehiclePrice = parseLocaleNumber(offerPriceInput.value);
    const financeDiscount = currentModality === OFFER_MODALITIES.CASH ? 0 : parseLocaleNumber(financeDiscountInput.value);
    const calculationPrice = currentModality === OFFER_MODALITIES.CASH ? vehiclePrice : Math.max(0, vehiclePrice - financeDiscount);
    const months = Math.max(1, Math.round(Number(loanMonthsInput.value) || 60));
    const detectedImg = getVehicleImageUrl(vName);

    const offerData = {
      id: idInput.value || generateId(ID_PREFIX_OFFER),
      vehicle: vName || 'Vehículo sin especificar',
      imageUrl: detectedImg || '',
      title: getOfferDisplayTitle({ vehicle: vName, modality: currentModality, months }),
      dealer: dealerInput.value.trim(),
      notes: notesInput.value.trim(),
      modality: currentModality,
      vehiclePrice,
      financeDiscount,
      cashPriceReference: vehiclePrice,
      offerPrice: calculationPrice,
      advertisedDiscount: financeDiscount,
      downPayment: currentModality === OFFER_MODALITIES.CASH ? 0 : parseLocaleNumber(downPaymentInput.value),
      tradeInValue: parseLocaleNumber(tradeInValueInput.value),
      months,
      tin: parseLocaleNumber(loanTinInput.value),
      manualMonthlyPayment: manualMonthlyInput.value ? parseLocaleNumber(manualMonthlyInput.value) : null,
      balloonPayment: parseLocaleNumber(balloonPaymentInput.value),
      linkedProducts: linkedProductsState.map(p => ({
        ...p,
        cost: parseLocaleNumber(p.cost)
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
        const vPrice = offer.vehiclePrice || offer.cashPriceReference || offer.offerPrice || '';
        offerPriceInput.value = formatLocaleNumber(vPrice);
        const fDisc = offer.financeDiscount !== undefined 
          ? offer.financeDiscount 
          : (offer.advertisedDiscount || (offer.cashPriceReference && offer.offerPrice && Number(offer.cashPriceReference) > Number(offer.offerPrice) ? Number(offer.cashPriceReference) - Number(offer.offerPrice) : ''));
        financeDiscountInput.value = formatLocaleNumber(fDisc);
        
        // Imagen del modelo
        const currentImg = getVehicleImageUrl(vName, offer.imageUrl);
        updateImagePreview(currentImg);

        downPaymentInput.value = offer.modality === OFFER_MODALITIES.CASH ? '0' : formatLocaleNumber(offer.downPayment || '');
        tradeInValueInput.value = formatLocaleNumber(offer.tradeInValue || '');
        loanMonthsInput.value = String(offer.months || 60);
        updateMonthsUI(offer.months || 60);
        loanTinInput.value = offer.tin !== undefined ? formatLocaleNumber(offer.tin) : '8,5';
        manualMonthlyInput.value = offer.manualMonthlyPayment ? formatLocaleNumber(offer.manualMonthlyPayment) : '';
        balloonPaymentInput.value = offer.balloonPayment ? formatLocaleNumber(offer.balloonPayment) : '';
        linkedProductsState = offer.linkedProducts
          ? offer.linkedProducts.map(p => ({
              id: p.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              ...p
            }))
          : [];
        updateModalityUI(offer.modality || OFFER_MODALITIES.STANDARD_FINANCE);
        updateNetCalcPriceUI();
      } else {
        modalTitle.textContent = 'Nueva oferta de concesionario';
        idInput.value = '';
        const initialVeh = defaultVehicle || '';
        if (vehicleInput) vehicleInput.value = initialVeh;
        offerPriceInput.value = '';
        financeDiscountInput.value = '';
        downPaymentInput.value = '';
        loanMonthsInput.value = '';
        if (loanMonthsBadge) loanMonthsBadge.textContent = '';
        if (loanMonthsPills) {
          loanMonthsPills.querySelectorAll('.months-pill-btn').forEach(btn => btn.classList.remove('active'));
        }
        loanTinInput.value = '';
        if (tradeInValueInput) tradeInValueInput.value = '';
        if (manualMonthlyInput) manualMonthlyInput.value = '';
        if (balloonPaymentInput) balloonPaymentInput.value = '';
        linkedProductsState = [];

        // Asignar imagen del modelo si hay vehículo por defecto
        const defaultImg = getVehicleImageUrl(initialVeh);
        updateImagePreview(defaultImg);

        updateModalityUI(OFFER_MODALITIES.STANDARD_FINANCE);
        updateNetCalcPriceUI();
      }
      renderProductsList();
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
