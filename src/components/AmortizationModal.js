/**
 * Controlador del Modal de Cuadro de Amortización Francés.
 * Conecta con el diálogo en index.html y genera las filas de amortización usando DocumentFragment y nodos DOM puros.
 */

import { getOfferDisplayTitle } from '../core/types.js';

/**
 * Inicializa el modal de amortización.
 * @returns {{ open: (offer: import('../core/normalizer.js').NormalizedOffer) => void, close: () => void }}
 */
export function initAmortizationModal() {
  const dialog = document.getElementById('modal-amortization');
  const tbody = document.getElementById('amortization-tbody');
  const carTitleEl = document.getElementById('amortization-car-title');
  const principalEl = document.getElementById('amort-principal');
  const interestsEl = document.getElementById('amort-interests');
  const monthlyEl = document.getElementById('amort-monthly');
  const btnClose = document.getElementById('btn-close-amortization');
  const btnDone = document.getElementById('btn-done-amortization');

  btnClose?.addEventListener('click', () => dialog.close());
  btnDone?.addEventListener('click', () => dialog.close());

  return {
    open(offer) {
      if (!offer || !offer.amortizationSchedule) return;

      carTitleEl.textContent = `Amortización: ${getOfferDisplayTitle(offer)} (${offer.nominalTin}% TIN)`;
      principalEl.textContent = `${offer.principalFinanced.toLocaleString('es-ES')} €`;
      interestsEl.textContent = `+${offer.totalInterest.toLocaleString('es-ES')} €`;
      monthlyEl.textContent = `${offer.monthlyPayment.toLocaleString('es-ES')} €`;

      const fragment = document.createDocumentFragment();

      offer.amortizationSchedule.forEach(row => {
        const tr = document.createElement('tr');

        const tdMonth = document.createElement('td');
        tdMonth.textContent = `#${row.month}`;

        const tdPayment = document.createElement('td');
        const boldPayment = document.createElement('strong');
        boldPayment.textContent = `${row.payment.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
        tdPayment.appendChild(boldPayment);

        const tdPrincipal = document.createElement('td');
        tdPrincipal.style.color = 'var(--accent-emerald)';
        tdPrincipal.textContent = `${row.principalPayment.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

        const tdInterest = document.createElement('td');
        tdInterest.style.color = 'var(--accent-rose)';
        tdInterest.textContent = `${row.interestPayment.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

        const tdBalance = document.createElement('td');
        tdBalance.textContent = `${row.remainingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

        tr.appendChild(tdMonth);
        tr.appendChild(tdPayment);
        tr.appendChild(tdPrincipal);
        tr.appendChild(tdInterest);
        tr.appendChild(tdBalance);

        fragment.appendChild(tr);
      });

      tbody.replaceChildren(fragment);
      dialog.showModal();
    },
    close() {
      dialog.close();
    }
  };
}
