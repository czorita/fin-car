/**
 * Tipos y estructuras de datos para las ofertas de coches.
 */

export const OFFER_MODALITIES = {
  CASH: 'cash',
  STANDARD_FINANCE: 'standard_finance',
  FLEXIBLE_FINANCE: 'flexible_finance'
};

export const MODALITY_LABELS = {
  [OFFER_MODALITIES.CASH]: 'Pago al Contado',
  [OFFER_MODALITIES.STANDARD_FINANCE]: 'Financiación Lineal Estándar',
  [OFFER_MODALITIES.FLEXIBLE_FINANCE]: 'Financiación Flexible (Multiopción / Balloon)'
};

/**
 * Crea una oferta con valores por defecto.
 * @param {Partial<Offer>} overrides 
 * @returns {Offer}
 */
export function createDefaultOffer(overrides = {}) {
  const id = overrides.id || `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    title: overrides.title || 'Nueva Oferta',
    dealer: overrides.dealer || '',
    notes: overrides.notes || '',
    modality: overrides.modality || OFFER_MODALITIES.STANDARD_FINANCE,
    
    // Precios de compra y venta base
    cashPriceReference: Number(overrides.cashPriceReference || 25000), // Precio al contado oficial o de catálogo
    offerPrice: Number(overrides.offerPrice || 22500),                 // Precio ofertado (suele incluir descuento por financiar)
    downPayment: Number(overrides.downPayment || 4000),                // Entrada inicial aportada
    tradeInValue: Number(overrides.tradeInValue || 0),                 // Tasación coche viejo entregado a cambio
    registrationFee: Number(overrides.registrationFee || 0),           // Gastos de matriculación/gestoría (al contado)

    // Parámetros de préstamo
    months: Number(overrides.months || 60),                            // Plazo en meses
    tin: Number(overrides.tin !== undefined ? overrides.tin : 8.5),    // Tipo de Interés Nominal anual (%)
    manualMonthlyPayment: overrides.manualMonthlyPayment !== undefined 
      ? (overrides.manualMonthlyPayment === null ? null : Number(overrides.manualMonthlyPayment)) 
      : null, // Si el usuario prefiere meter la cuota fija que le dio el vendedor
    
    // Financiación flexible / multiopción
    balloonPayment: Number(overrides.balloonPayment || 0),             // Cuota final o Valor Futuro Garantizado (VFG)
    balloonDecision: overrides.balloonDecision || 'keep',              // 'keep' (pagar cuota final y quedarse el coche) o 'return' (devolver el coche)
    
    // Comisiones
    openingFeePercentage: Number(overrides.openingFeePercentage || 3.0), // % de apertura (ej: 3.0%)
    openingFeeFinanced: overrides.openingFeeFinanced !== undefined ? Boolean(overrides.openingFeeFinanced) : true, // ¿Se financia la comisión?

    // Productos obligatorios vinculados a la financiación (muy típico en España)
    linkedProducts: Array.isArray(overrides.linkedProducts) ? overrides.linkedProducts : [
      // { id: '1', name: 'Seguro de pagos protegidos / Vida', cost: 750, financed: true, required: true },
      // { id: '2', name: 'Pack Mantenimiento 4 años', cost: 600, financed: false, required: false }
    ],

    createdAt: overrides.createdAt || new Date().toISOString()
  };
}
