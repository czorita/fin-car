/**
 * Ofertas de ejemplo preconfiguradas basadas en presupuestos reales de concesionarios en España.
 */
import { OFFER_MODALITIES } from './types.js';

export const SAMPLE_OFFERS = [
  {
    id: 'sample_cash_1',
    title: 'Toyota Corolla 140H Style - Al Contado',
    dealer: 'Concesionario Oficial Madrid',
    notes: 'Presupuesto oficial pagando todo al contado con transferencia.',
    modality: OFFER_MODALITIES.CASH,
    cashPriceReference: 27500,
    offerPrice: 26800, // Pequeño descuento de concesionario al contado
    downPayment: 0,
    tradeInValue: 0,
    registrationFee: 450,
    months: 0,
    tin: 0,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    balloonDecision: 'keep',
    openingFeePercentage: 0,
    openingFeeFinanced: false,
    linkedProducts: [],
    createdAt: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 'sample_finance_trap_2',
    title: 'Toyota Corolla 140H Style - Financiación Lineal (Trampa Descuento)',
    dealer: 'Concesionario Oficial Madrid',
    notes: 'Te descuentan 2.600 € del coche por financiar con su financiera, pero con TIN 8.95% y seguro obligatorio.',
    modality: OFFER_MODALITIES.STANDARD_FINANCE,
    cashPriceReference: 27500,
    offerPrice: 24200, // Descuento de 3.300 € por financiar
    downPayment: 4200, // Entrada
    tradeInValue: 0,
    registrationFee: 450,
    months: 60,
    tin: 8.95,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    balloonDecision: 'keep',
    openingFeePercentage: 3.5, // 3.5% de comisión de apertura financiada
    openingFeeFinanced: true,
    linkedProducts: [
      { id: 'p1', name: 'Seguro de Protección de Pagos (Obligatorio)', cost: 850, financed: true, required: true },
      { id: 'p2', name: 'Pack Mantenimiento 4 años', cost: 750, financed: true, required: false }
    ],
    createdAt: '2026-09-02T11:30:00.000Z'
  },
  {
    id: 'sample_flexible_3',
    title: 'Toyota Corolla 140H Style - Compra Flexible (Easy / Balloon)',
    dealer: 'Toyota Financial Services',
    notes: 'Cuotas bajas durante 48 meses y cuota final (VFG) de 13.500 €.',
    modality: OFFER_MODALITIES.FLEXIBLE_FINANCE,
    cashPriceReference: 27500,
    offerPrice: 25000,
    downPayment: 5000,
    tradeInValue: 0,
    registrationFee: 450,
    months: 48,
    tin: 7.95,
    manualMonthlyPayment: null,
    balloonPayment: 13500,
    balloonDecision: 'keep',
    openingFeePercentage: 3.0,
    openingFeeFinanced: true,
    linkedProducts: [
      { id: 'p3', name: 'Seguro de vida vinculado', cost: 650, financed: true, required: true }
    ],
    createdAt: '2026-09-03T16:00:00.000Z'
  }
];
