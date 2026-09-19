import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLocaleNumber, formatLocaleNumber } from '../../src/core/formatters.js';

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
});
