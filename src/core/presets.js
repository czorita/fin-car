/**
 * Ofertas de ejemplo preconfiguradas basadas en presupuestos reales de concesionarios en España.
 */
import { OFFER_MODALITIES } from './types.js';
import { getVehicleImageUrl } from './vehicleCatalog.js';

/** Ofertas de ejemplo de respaldo (formato de entrada: normalizeOffer completa los campos ausentes) */
/** @type {Array<Partial<import('./types.js').Offer>>} */
export const SAMPLE_OFFERS = [
  {
    id: 'sample_cash_1',
    vehicle: 'Toyota Corolla 140H Style',
    imageUrl: getVehicleImageUrl('Toyota Corolla 140H Style'),
    title: 'Toyota Corolla 140H Style - Al contado',
    dealer: 'Concesionario Oficial Madrid',
    notes: 'Presupuesto oficial pagando todo al contado con transferencia.',
    modality: OFFER_MODALITIES.CASH,
    vehiclePrice: 26800,
    financeDiscount: 0,
    cashPriceReference: 26800,
    offerPrice: 26800,
    downPayment: 0,
    tradeInValue: 0,
    months: 0,
    tin: 0,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [],
    createdAt: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 'sample_finance_trap_2',
    vehicle: 'Toyota Corolla 140H Style',
    imageUrl: getVehicleImageUrl('Toyota Corolla 140H Style'),
    title: 'Toyota Corolla 140H Style - Financiación lineal (trampa descuento)',
    dealer: 'Concesionario Oficial Madrid',
    notes: 'Te descuentan 3.300 € del coche por financiar con su financiera, pero con TIN 8.95% y seguro obligatorio.',
    modality: OFFER_MODALITIES.STANDARD_FINANCE,
    vehiclePrice: 27500,
    financeDiscount: 3300,
    cashPriceReference: 27500,
    offerPrice: 24200, // 27.500 € - 3.300 € = 24.200 € (base de cálculo)
    downPayment: 4200, // Entrada
    tradeInValue: 0,
    months: 60,
    tin: 8.95,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [
      { id: 'p1', name: 'Seguro de protección de pagos (obligatorio)', cost: 850, financed: true, required: true },
      { id: 'p2', name: 'Pack mantenimiento 4 años', cost: 750, financed: true, required: false }
    ],
    createdAt: '2026-09-02T11:30:00.000Z'
  },
  {
    id: 'sample_flexible_3',
    vehicle: 'Toyota Corolla 140H Style',
    imageUrl: getVehicleImageUrl('Toyota Corolla 140H Style'),
    title: 'Toyota Corolla 140H Style - Compra flexible (Easy / balloon)',
    dealer: 'Toyota Financial Services',
    notes: 'Cuotas bajas durante 48 meses y cuota final (VFG) de 13.500 €.',
    modality: OFFER_MODALITIES.FLEXIBLE_FINANCE,
    vehiclePrice: 27500,
    financeDiscount: 2500,
    cashPriceReference: 27500,
    offerPrice: 25000, // 27.500 € - 2.500 € = 25.000 € (base de cálculo)
    downPayment: 5000,
    tradeInValue: 0,
    months: 48,
    tin: 7.95,
    manualMonthlyPayment: null,
    balloonPayment: 13500,
    linkedProducts: [
      { id: 'p3', name: 'Seguro de vida vinculado', cost: 650, financed: true, required: true }
    ],
    createdAt: '2026-09-03T16:00:00.000Z'
  },
  {
    id: 'sample_i30_cash_4',
    vehicle: 'Hyundai i30 1.5 T-GDI',
    imageUrl: getVehicleImageUrl('Hyundai i30 1.5 T-GDI'),
    title: 'Hyundai i30 1.5 T-GDI - Al contado promoción',
    dealer: 'Hyundai Gamboa',
    notes: 'Presupuesto oficial al contado con campaña mensual.',
    modality: OFFER_MODALITIES.CASH,
    vehiclePrice: 24800,
    financeDiscount: 0,
    cashPriceReference: 24800,
    offerPrice: 24800,
    downPayment: 0,
    tradeInValue: 0,
    months: 0,
    tin: 0,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [],
    createdAt: '2026-09-04T10:00:00.000Z'
  },
  {
    id: 'sample_i30_finance_5',
    vehicle: 'Hyundai i30 1.5 T-GDI',
    imageUrl: getVehicleImageUrl('Hyundai i30 1.5 T-GDI'),
    title: 'Hyundai i30 1.5 T-GDI - Financiación smart 60m',
    dealer: 'Hyundai Gamboa',
    notes: 'Descuento de concesionario por financiar con TIN 7.95% a 5 años.',
    modality: OFFER_MODALITIES.STANDARD_FINANCE,
    vehiclePrice: 25500,
    financeDiscount: 2600,
    cashPriceReference: 25500,
    offerPrice: 22900, // 25.500 € - 2.600 € = 22.900 € (base de cálculo)
    downPayment: 4000,
    tradeInValue: 0,
    months: 60,
    tin: 7.95,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [
      { id: 'p_i30_1', name: 'Pack mantenimiento 5 años', cost: 600, financed: true, required: false }
    ],
    includedServices: [],
    createdAt: '2026-09-05T12:00:00.000Z'
  },
  {
    id: 'sample_rav4_cash_6',
    vehicle: 'Toyota RAV4 2.5 HSD Advance',
    imageUrl: getVehicleImageUrl('Toyota RAV4'),
    title: 'Toyota RAV4 2.5 HSD Advance - Al contado',
    dealer: 'Toyota Madrid Norte',
    notes: 'Presupuesto oficial al contado sin servicios incluidos (mantenimiento no incluido).',
    modality: OFFER_MODALITIES.CASH,
    vehiclePrice: 41500,
    financeDiscount: 0,
    cashPriceReference: 41500,
    offerPrice: 41500,
    downPayment: 0,
    tradeInValue: 0,
    months: 0,
    tin: 0,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [],
    includedServices: [],
    createdAt: '2026-09-06T10:00:00.000Z'
  },
  {
    id: 'sample_rav4_finance_7',
    vehicle: 'Toyota RAV4 2.5 HSD Advance',
    imageUrl: getVehicleImageUrl('Toyota RAV4'),
    title: 'Toyota RAV4 2.5 HSD Advance - Financiación con Servicios incluidos',
    dealer: 'Toyota Madrid Norte',
    notes: 'Descuento de 3.000 € por financiar. Incluye de serie 4 años de mantenimiento Toyota Care y 1er año de seguro a todo riesgo.',
    modality: OFFER_MODALITIES.STANDARD_FINANCE,
    vehiclePrice: 41500,
    financeDiscount: 3000,
    cashPriceReference: 41500,
    offerPrice: 38500,
    downPayment: 6000,
    tradeInValue: 0,
    months: 60,
    tin: 7.95,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [],
    includedServices: [
      { id: 'srv_rav4_maint', name: 'Mantenimiento oficial 4 años / 60.000 km', marketValue: 1200, category: 'maintenance' },
      { id: 'srv_rav4_ins', name: 'Seguro a todo riesgo (1er año)', marketValue: 750, category: 'insurance' }
    ],
    createdAt: '2026-09-06T11:00:00.000Z'
  },
  {
    id: 'sample_corolla_early_cancel_8',
    vehicle: 'Toyota Corolla 140H Style',
    imageUrl: getVehicleImageUrl('Toyota Corolla 140H Style'),
    title: 'Toyota Corolla 140H Style - Cancelación anticipada (mes 24/84)',
    dealer: 'Toyota Financial Services',
    notes: 'Aprovecha los 3.300 € de descuento contratando a 84 meses, pero liquida al mes 24 cumpliendo la permanencia mínima legal.',
    modality: OFFER_MODALITIES.EARLY_CANCELLATION,
    vehiclePrice: 27500,
    financeDiscount: 3300,
    cashPriceReference: 27500,
    offerPrice: 24200,
    downPayment: 4200,
    tradeInValue: 0,
    months: 84,
    contractMonths: 84,
    earlyCancellationMonth: 24,
    earlyCancellationPenaltyRate: 1.0,
    tin: 8.95,
    manualMonthlyPayment: null,
    balloonPayment: 0,
    linkedProducts: [
      { id: 'p_ec_1', name: 'Seguro de protección de pagos (obligatorio)', cost: 850, financed: true, required: true }
    ],
    includedServices: [],
    createdAt: '2026-09-06T12:00:00.000Z'
  }
];
