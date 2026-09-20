/**
 * Ofertas de ejemplo preconfiguradas basadas en presupuestos reales de concesionarios en España.
 */
import { OFFER_MODALITIES } from './types.js';
import { getVehicleImageUrl } from './vehicleCatalog.js';

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
    createdAt: '2026-09-05T12:00:00.000Z'
  }
];
