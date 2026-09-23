/**
 * Utilidades de formateo y parseo numérico con soporte para comas decimales.
 */

import { NOT_AVAILABLE_LABEL } from './constants.js';

/**
 * Patrón de separador de miles español sin parte decimal: 1-3 dígitos iniciales
 * seguidos de uno o más grupos ".ddd" (ej. "30.000", "1.250.000", "-24.200").
 */
const DOT_THOUSANDS_PATTERN = /^-?\d{1,3}(\.\d{3})+$/;

/**
 * Parsea un número admitiendo comas o puntos decimales y separadores de miles.
 * @param {string|number} value
 * @param {{ dotThousands: boolean }} options - si `dotThousands` es true, un valor
 *   sin coma que encaje en {@link DOT_THOUSANDS_PATTERN} se interpreta como miles.
 * @returns {number}
 */
function parseLocale(value, { dotThousands }) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  let str = String(value).trim();
  if (!str) return 0;

  // Si contiene puntos y comas combinados (ej. 26.000,50 o 26,000.50)
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Notación española: 26.000,50 -> elimina puntos y usa coma como separador decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Notación anglosajona: 26,000.50 -> elimina comas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Solo contiene coma (ej: 26000,50 o 8,5)
    str = str.replace(',', '.');
  } else if (dotThousands && DOT_THOUSANDS_PATTERN.test(str)) {
    // Solo puntos con grupos de exactamente 3 dígitos (ej: 30.000 o 1.250.000) -> miles
    str = str.replace(/\./g, '');
  }

  // Eliminar cualquier caracter ajeno a números, punto o signo negativo
  str = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parsea un importe (precio, entrada, cuota...) admitiendo comas o puntos decimales
 * y separadores de miles.
 *
 * Regla para valores con punto(s) y sin coma: si tras cada punto hay exactamente
 * 3 dígitos y el primer grupo tiene 1-3 dígitos (notación de miles española), los
 * puntos se tratan como separadores de miles; en cualquier otro caso el punto es
 * decimal. Para porcentajes (TIN, penalizaciones) usar {@link parseLocaleRate},
 * donde "7.495" debe ser 7,495 % y no 7495.
 *
 * Soporta formatos:
 *  - "30.000" -> 30000 (miles españoles)
 *  - "1.250.000" -> 1250000 (miles españoles)
 *  - "26000,50" -> 26000.5
 *  - "26.000,50" -> 26000.5
 *  - "26000.50" -> 26000.5
 *  - "26,000.50" -> 26000.5
 *  - "1234.567" -> 1234.567 (primer grupo de más de 3 dígitos: punto decimal)
 *  - "8,5" -> 8.5
 *  - "8.5" -> 8.5
 *  - 123.45 -> 123.45
 *
 * @param {string|number} value
 * @returns {number}
 */
export function parseLocaleNumber(value) {
  return parseLocale(value, { dotThousands: true });
}

/**
 * Parsea un porcentaje (TIN, penalización...) con coma o punto decimal.
 * A diferencia de {@link parseLocaleNumber}, un punto sin coma es siempre decimal,
 * ya que un tipo con 3 decimales ("7.495") es habitual y un tipo >= 1000 % no lo es.
 *  - "7.495" -> 7.495
 *  - "8,5" -> 8.5
 *  - "1.250" -> 1.25
 *
 * @param {string|number} value
 * @returns {number}
 */
export function parseLocaleRate(value) {
  return parseLocale(value, { dotThousands: false });
}

/**
 * Formatea un valor numérico para representarlo en inputs con coma decimal en caso de tenerla.
 * @param {number|string} value
 * @param {number} [maxDecimals=2]
 * @returns {string}
 */
export function formatLocaleNumber(value, maxDecimals = 2) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseLocaleNumber(value);
  if (isNaN(num)) return '';

  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: maxDecimals,
    useGrouping: false
  }).format(num);
}

/**
 * Formatea un número de meses en una descripción legible de años y meses.
 * Ej: 60 -> "5 años"
 * Ej: 42 -> "3 años y 6 meses"
 * Ej: 12 -> "1 año"
 * Ej: 13 -> "1 año y 1 mes"
 * Ej: 6  -> "6 meses"
 * Ej: 1  -> "1 mes"
 * @param {number|string} months
 * @returns {string}
 */
export function formatMonthsDuration(months) {
  const m = Math.round(Number(months) || 0);
  if (m <= 0) return '0 meses';

  const years = Math.floor(m / 12);
  const remainingMonths = m % 12;

  if (years === 0) {
    return `${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
  }

  const yearStr = `${years} ${years === 1 ? 'año' : 'años'}`;
  if (remainingMonths === 0) {
    return yearStr;
  }

  const monthStr = `${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
  return `${yearStr} y ${monthStr}`;
}

/**
 * Formatea una TAE en porcentaje. Si no es calculable (`null`), devuelve "N/D".
 * Ej: 9.85 -> "9.85%"; 0 -> "0%"; null -> "N/D"
 * @param {number|null|undefined} apr
 * @returns {string}
 */
export function formatAprPercent(apr) {
  if (apr === null || apr === undefined || !Number.isFinite(Number(apr))) return NOT_AVAILABLE_LABEL;
  return `${apr}%`;
}
