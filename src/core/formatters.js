/**
 * Utilidades de formateo y parseo numérico con soporte para comas decimales.
 */

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
