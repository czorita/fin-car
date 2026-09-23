import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLocaleNumber,
  parseLocaleRate,
  formatLocaleNumber,
  formatMonthsDuration
} from '../../src/core/formatters.js';

describe('Soporte de Comas y Puntos Decimales (Formatters)', () => {
  test('Parsea enteros estándar', () => {
    assert.equal(parseLocaleNumber('25000'), 25000);
    assert.equal(parseLocaleNumber(4000), 4000);
  });

  test('Parsea cifras con coma decimal española', () => {
    assert.equal(parseLocaleNumber('23500,50'), 23500.5);
    assert.equal(parseLocaleNumber('8,95'), 8.95);
    assert.equal(parseLocaleNumber('0,05'), 0.05);
    assert.equal(parseLocaleNumber('3,0'), 3.0);
  });

  test('Parsea notación española con separador de miles y coma decimal (26.000,50)', () => {
    assert.equal(parseLocaleNumber('26.000,50'), 26000.5);
    assert.equal(parseLocaleNumber('1.250,75'), 1250.75);
  });

  test('Parsea notación anglosajona con punto decimal (26000.50 y 26,000.50)', () => {
    assert.equal(parseLocaleNumber('26000.50'), 26000.5);
    assert.equal(parseLocaleNumber('26,000.50'), 26000.5);
    assert.equal(parseLocaleNumber('8.5'), 8.5);
  });

  test('Interpreta puntos con grupos de 3 dígitos y sin coma como miles españoles', () => {
    assert.equal(parseLocaleNumber('30.000'), 30000);
    assert.equal(parseLocaleNumber('24.200'), 24200);
    assert.equal(parseLocaleNumber('1.250.000'), 1250000);
    assert.equal(parseLocaleNumber('-30.000'), -30000);
    assert.equal(parseLocaleNumber(' 30.000 '), 30000);
  });

  test('Mantiene el punto decimal cuando no encaja el patrón de miles', () => {
    assert.equal(parseLocaleNumber('8.5'), 8.5);
    assert.equal(parseLocaleNumber('30.00'), 30);
    assert.equal(parseLocaleNumber('1234.567'), 1234.567);
    assert.equal(parseLocaleNumber('26000.50'), 26000.5);
    assert.equal(parseLocaleNumber('1.2345'), 1.2345);
  });

  test('Mantiene coma decimal, notaciones mixtas y números JS', () => {
    assert.equal(parseLocaleNumber('8,5'), 8.5);
    assert.equal(parseLocaleNumber('26.000,50'), 26000.5);
    assert.equal(parseLocaleNumber('26,000.50'), 26000.5);
    assert.equal(parseLocaleNumber(123.45), 123.45);
    assert.equal(parseLocaleNumber(4000), 4000);
  });

  test('parseLocaleRate trata siempre el punto sin coma como decimal (TIN con 3 decimales)', () => {
    assert.equal(parseLocaleRate('7.495'), 7.495);
    assert.equal(parseLocaleRate('1.250'), 1.25);
    assert.equal(parseLocaleRate('8.5'), 8.5);
    assert.equal(parseLocaleRate('8,5'), 8.5);
    assert.equal(parseLocaleRate('7,495'), 7.495);
    assert.equal(parseLocaleRate(6.99), 6.99);
    assert.equal(parseLocaleRate(''), 0);
    // Contraste: como importe, "7.495" son 7.495 € (miles)
    assert.equal(parseLocaleNumber('7.495'), 7495);
  });

  test('Maneja valores nulos, vacíos e inválidos retornando 0', () => {
    assert.equal(parseLocaleNumber(''), 0);
    assert.equal(parseLocaleNumber(null), 0);
    assert.equal(parseLocaleNumber(undefined), 0);
    assert.equal(parseLocaleNumber('abc'), 0);
  });

  test('Formatea números con coma decimal para inputs en español', () => {
    assert.equal(formatLocaleNumber(8.5), '8,5');
    assert.equal(formatLocaleNumber(23500.5), '23500,5');
    assert.equal(formatLocaleNumber(25000), '25000');
  });

  test('Formatea plazos en meses a descripciones legibles de años y meses (formatMonthsDuration)', () => {
    assert.equal(formatMonthsDuration(60), '5 años');
    assert.equal(formatMonthsDuration(12), '1 año');
    assert.equal(formatMonthsDuration(24), '2 años');
    assert.equal(formatMonthsDuration(42), '3 años y 6 meses');
    assert.equal(formatMonthsDuration(50), '4 años y 2 meses');
    assert.equal(formatMonthsDuration(13), '1 año y 1 mes');
    assert.equal(formatMonthsDuration(6), '6 meses');
    assert.equal(formatMonthsDuration(1), '1 mes');
    assert.equal(formatMonthsDuration(0), '0 meses');
    assert.equal(formatMonthsDuration('48'), '4 años');
  });
});
