/**
 * Utilidades de formateo y parseo numérico con soporte para comas decimales.
 */

import { NOT_AVAILABLE_LABEL } from './constants.js';

/**
 * Parsea un número admitiendo comas o puntos decimales y separadores de miles.
 * Soporta formatos:
 *  - "26000,50" -> 26000.5
 *  - "26.000,50" -> 26000.5
 *  - "26000.50" -> 26000.5
 *  - "26,000.50" -> 26000.5
 *  - "8,5" -> 8.5
 *  - "8.5" -> 8.5
 *  - 123.45 -> 123.45
 * 
 * @param {string|number} value
 * @returns {number}
 */
export function parseLocaleNumber(value) {
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
  }

  // Eliminar cualquier caracter ajeno a números, punto o signo negativo
  str = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
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
