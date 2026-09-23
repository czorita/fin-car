/**
 * Constantes y umbrales de la aplicación.
 * Centraliza magic numbers para mejorar legibilidad y mantenibilidad.
 */

// --- Identificadores ---
/** Prefijo por defecto para IDs de ofertas generadas */
export const ID_PREFIX_OFFER = 'offer';
/** Prefijo para IDs de productos vinculados */
export const ID_PREFIX_PRODUCT = 'p';
/** Prefijo para IDs de servicios incluidos bonificados */
export const ID_PREFIX_SERVICE = 'srv';

// --- Servicios Incluidos Sugeridos (Criterio conservador calibrado para SUVs C/D: RAV4 / Tucson) ---
export const SUGGESTED_INCLUDED_SERVICES = [
  {
    id: 'maint_suv',
    name: 'Mantenimiento oficial (4-5 años / 60-75k km)',
    marketValue: 1200,
    category: 'maintenance'
  },
  {
    id: 'insurance_suv',
    name: 'Seguro a todo riesgo (1er año)',
    marketValue: 750,
    category: 'insurance'
  },
  {
    id: 'warranty_suv',
    name: 'Extensión de garantía oficial (+2-3 años)',
    marketValue: 600,
    category: 'warranty'
  },
  {
    id: 'tyres_roadside',
    name: 'Neumáticos / Asistencia premium',
    marketValue: 450,
    category: 'other'
  }
];

/**
 * Genera un identificador único con prefijo y marca temporal.
 * @param {string} [prefix='offer'] Prefijo del ID
 * @returns {string}
 */
export function generateId(prefix = ID_PREFIX_OFFER) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// --- Umbrales de Veredicto ---
/** Sobrecoste mínimo (€) para considerar una oferta como "trampa" en el banner global */
export const TRAP_THRESHOLD_EUROS = 1000;
/** Factor del descuento anunciado por debajo del cual el sobrecoste se considera "asumible" */
export const AFFORDABLE_SURCHARGE_FACTOR = 0.5;

// --- UI ---
/** Longitud máxima de título antes de truncar en el gráfico */
export const CHART_TITLE_MAX_LENGTH = 28;

// --- Valores por defecto de oferta ---
export const DEFAULTS = {
  cashPriceReference: 25000,
  offerPrice: 22500,
  downPayment: 4000,
  months: 60,
  contractMonths: 84,
  earlyCancellationMonth: 24,
  earlyCancellationPenaltyRate: 1.0,
  /** Plazo de contrato por defecto de la compra flexible con cancelación (meses) */
  flexibleContractMonths: 48,
  tin: 8.5
};

// --- Motor financiero (parámetros numéricos) ---
/** Iteraciones máximas de Newton-Raphson en el cálculo de la TIR */
export const IRR_MAX_ITERATIONS = 100;
/** Tolerancia sobre el VAN para dar por convergida la TIR */
export const IRR_PRECISION = 1e-7;
/** Derivada mínima (en valor absoluto) para continuar iterando Newton-Raphson */
export const IRR_MIN_DERIVATIVE = 1e-12;
/** Estimación inicial por defecto de la TIR mensual */
export const IRR_DEFAULT_GUESS = 0.01;
/** Estimación inicial de la TIR mensual al calcular la TAE (~10% anual) */
export const APR_IRR_GUESS = 0.008;
/** Tasa mensual mínima admisible (-99%): por debajo, la TIR se considera no válida */
export const IRR_MIN_RATE = -0.99;
/** Cota superior de tasa mensual para la bisección de respaldo (1000% mensual) */
export const IRR_BISECTION_MAX_RATE = 10;
/** Iteraciones máximas de la bisección de respaldo de la TIR */
export const IRR_BISECTION_MAX_ITERATIONS = 200;

/** Iteraciones máximas de la bisección al deducir el TIN a partir de la cuota */
export const REVERSE_TIN_MAX_ITERATIONS = 80;
/** Cota superior de tasa mensual al deducir el TIN (50% mensual) */
export const REVERSE_TIN_MAX_MONTHLY_RATE = 0.5;
/** Tolerancia (€) entre la cuota calculada y la objetivo al deducir el TIN */
export const REVERSE_TIN_PAYMENT_TOLERANCE = 0.001;

/** Texto mostrado cuando la TAE no puede calcularse */
export const NOT_AVAILABLE_LABEL = 'N/D';

// --- LocalStorage Keys ---
export const STORAGE_KEY_OFFERS = 'fin_car_user_offers_v2';
export const STORAGE_KEY_THEME = 'car_compare_theme_v1';
