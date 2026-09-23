import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_CATALOG, findVehicleInCatalog, getVehicleImageUrl } from '../../src/core/vehicleCatalog.js';
import { createDefaultOffer } from '../../src/core/types.js';

test('Catálogo de Modelos y Detección de Imágenes (vehicleCatalog.js)', async t => {
  await t.test('Test 1: Catálogo contiene modelos populares y actualizados', () => {
    assert.ok(VEHICLE_CATALOG.length >= 5, 'El catálogo debe contener al menos 5 modelos');
    const tucson = VEHICLE_CATALOG.find(v => v.id === 'tucson');
    const rav4 = VEHICLE_CATALOG.find(v => v.id === 'rav4');
    const corolla = VEHICLE_CATALOG.find(v => v.id === 'corolla');

    assert.ok(tucson && tucson.imageUrl.includes('Tucson'), 'Debe incluir imagen de Tucson');
    assert.ok(rav4 && rav4.imageUrl.includes('RAV4'), 'Debe incluir imagen de RAV4');
    assert.ok(corolla && corolla.imageUrl.includes('Corolla'), 'Debe incluir imagen de Corolla');
  });

  await t.test('Test 2: findVehicleInCatalog detecta modelos por nombre o palabras clave', () => {
    assert.equal(findVehicleInCatalog('Tucson')?.id, 'tucson');
    assert.equal(findVehicleInCatalog('Hyundai Tucson 1.6 TGDI')?.id, 'tucson');
    assert.equal(findVehicleInCatalog('Toyota RAV4 Plug-in')?.id, 'rav4');
    assert.equal(findVehicleInCatalog('rav4')?.id, 'rav4');
    assert.equal(findVehicleInCatalog('Toyota Corolla 140H Style')?.id, 'corolla');
    assert.equal(findVehicleInCatalog('Hyundai i30 1.5 T-GDI')?.id, 'i30');
    assert.equal(findVehicleInCatalog('Kia Sportage S')?.id, 'sportage');
    // Modelos SUV del segmento de Tucson y RAV4
    assert.equal(findVehicleInCatalog('Volkswagen Tiguan 2.0 TDI')?.id, 'tiguan');
    assert.equal(findVehicleInCatalog('Peugeot 3008 Hybrid')?.id, '3008');
    assert.equal(findVehicleInCatalog('SEAT Ateca 1.5 TSI')?.id, 'ateca');
    assert.equal(findVehicleInCatalog('Ford Kuga PHEV')?.id, 'kuga');
    assert.equal(findVehicleInCatalog('Skoda Karoq 1.5 TSI')?.id, 'karoq');
    assert.equal(findVehicleInCatalog('Mazda CX-5')?.id, 'cx-5');
    assert.equal(findVehicleInCatalog('Honda CR-V')?.id, 'cr-v');
    assert.equal(findVehicleInCatalog('Dacia Duster')?.id, 'duster');
    assert.equal(findVehicleInCatalog('Audi Q3 Sportback')?.id, 'q3');
  });

  await t.test('Test 3: findVehicleInCatalog devuelve null para modelos desconocidos o vacíos', () => {
    assert.equal(findVehicleInCatalog('Vehículo Desconocido 3000'), null);
    assert.equal(findVehicleInCatalog(''), null);
    assert.equal(findVehicleInCatalog(null), null);
  });

  await t.test('Test 4: getVehicleImageUrl prioriza URL personalizada si se provee', () => {
    const custom = 'https://mi-concesionario.com/mifoto.jpg';
    const resolved = getVehicleImageUrl('Hyundai Tucson', custom);
    assert.equal(resolved, custom);
  });

  await t.test('Test 5: getVehicleImageUrl resuelve foto oficial para modelo conocido sin URL custom', () => {
    const resolved = getVehicleImageUrl('Toyota RAV4');
    assert.ok(resolved.startsWith('https://upload.wikimedia.org/'), 'Debe devolver URL oficial');
    assert.ok(resolved.includes('RAV4'));
  });

  await t.test('Test 6: getVehicleImageUrl devuelve cadena vacía para modelo desconocido sin URL custom', () => {
    const resolved = getVehicleImageUrl('Coche Ficticio XYZ');
    assert.equal(resolved, '');
  });

  await t.test('Test 7: createDefaultOffer asigna automáticamente imageUrl según vehículo', () => {
    const offerTucson = createDefaultOffer({ vehicle: 'Hyundai Tucson' });
    assert.ok(offerTucson.imageUrl.includes('Tucson'), 'Debe auto-asignar imagen de Tucson');

    const offerCustom = createDefaultOffer({
      vehicle: 'Hyundai Tucson',
      imageUrl: 'https://cdn.coches.net/tucson.png'
    });
    assert.equal(offerCustom.imageUrl, 'https://cdn.coches.net/tucson.png');
  });
});
