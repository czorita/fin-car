/**
 * Catálogo y detector de imágenes de modelos de vehículos actualizados.
 * Proporciona URLs oficiales de internet (Wikimedia Commons / Creative Commons)
 * y resolución automática para ofertas y comparativas.
 */

export const VEHICLE_CATALOG = [
  {
    id: 'tucson',
    name: 'Hyundai Tucson',
    keywords: ['tucson', 'hyundai tucson'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/2022_Hyundai_Tucson_Preferred%2C_Front_Right%2C_05-24-2021.jpg/960px-2022_Hyundai_Tucson_Preferred%2C_Front_Right%2C_05-24-2021.jpg',
    localPath: '/images/vehicles/tucson.jpg'
  },
  {
    id: 'rav4',
    name: 'Toyota RAV4',
    keywords: ['rav4', 'toyota rav4', 'rav 4'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/2024_Toyota_RAV4_Prime_XSE_Premium_in_Silver_Sky_with_Midnight_Black_roof%2C_front_left.jpg/960px-2024_Toyota_RAV4_Prime_XSE_Premium_in_Silver_Sky_with_Midnight_Black_roof%2C_front_left.jpg',
    localPath: '/images/vehicles/rav4.jpg'
  },
  {
    id: 'corolla',
    name: 'Toyota Corolla',
    keywords: ['corolla', 'toyota corolla', '140h style', 'corolla touring'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/2018_Toyota_Corolla_%28MZEA12R%29_Ascent_Sport_hatchback_%282018-11-02%29_01.jpg/960px-2018_Toyota_Corolla_%28MZEA12R%29_Ascent_Sport_hatchback_%282018-11-02%29_01.jpg',
    localPath: '/images/vehicles/corolla.jpg'
  },
  {
    id: 'i30',
    name: 'Hyundai i30',
    keywords: ['i30', 'hyundai i30', 't-gdi'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/2018_Hyundai_i30_SE_Nav_T-GDi_1.3_Front.jpg/960px-2018_Hyundai_i30_SE_Nav_T-GDi_1.3_Front.jpg',
    localPath: '/images/vehicles/i30.jpg'
  },
  {
    id: 'sportage',
    name: 'Kia Sportage',
    keywords: ['sportage', 'kia sportage'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/2025_Kia_Sportage_S_front_only.jpg/960px-2025_Kia_Sportage_S_front_only.jpg',
    localPath: '/images/vehicles/sportage.jpg'
  },
  {
    id: 'formentor',
    name: 'Cupra Formentor',
    keywords: ['formentor', 'cupra formentor'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Cupra_Formentor_IMG_9668.jpg/960px-Cupra_Formentor_IMG_9668.jpg',
    localPath: '/images/vehicles/formentor.jpg'
  },
  {
    id: 'qashqai',
    name: 'Nissan Qashqai',
    keywords: ['qashqai', 'nissan qashqai'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/2024_Nissan_Qashqai_e-Power_IMG_2187.jpg/960px-2024_Nissan_Qashqai_e-Power_IMG_2187.jpg',
    localPath: '/images/vehicles/qashqai.jpg'
  },
  {
    id: 'austral',
    name: 'Renault Austral',
    keywords: ['austral', 'renault austral'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Renault_Austral_1X7A6753.jpg/960px-Renault_Austral_1X7A6753.jpg',
    localPath: '/images/vehicles/austral.jpg'
  },
  {
    id: 'golf',
    name: 'Volkswagen Golf',
    keywords: ['golf', 'volkswagen golf', 'vw golf'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/2020_Volkswagen_Golf_Style_1.5_Front.jpg/960px-2020_Volkswagen_Golf_Style_1.5_Front.jpg',
    localPath: '/images/vehicles/golf.jpg'
  },
  // Modelos SUV del segmento C-SUV / D-SUV (rivales directos de Tucson y RAV4)
  {
    id: 'tiguan',
    name: 'Volkswagen Tiguan',
    keywords: ['tiguan', 'volkswagen tiguan', 'vw tiguan'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Volkswagen_Tiguan_R_1X7A0362.jpg/960px-Volkswagen_Tiguan_R_1X7A0362.jpg',
    localPath: '/images/vehicles/tiguan.jpg'
  },
  {
    id: '3008',
    name: 'Peugeot 3008',
    keywords: ['3008', 'peugeot 3008', 'e-3008'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Peugeot_3008_C_DSC_8318.jpg/960px-Peugeot_3008_C_DSC_8318.jpg',
    localPath: '/images/vehicles/3008.jpg'
  },
  {
    id: 'ateca',
    name: 'Seat Ateca',
    keywords: ['ateca', 'seat ateca'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/SEAT_Ateca_Front_Full_LED_Lightning.jpg/960px-SEAT_Ateca_Front_Full_LED_Lightning.jpg',
    localPath: '/images/vehicles/ateca.jpg'
  },
  {
    id: 'kuga',
    name: 'Ford Kuga',
    keywords: ['kuga', 'ford kuga', 'escape'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Ford_Kuga_in_Vaduz_front.jpg/960px-Ford_Kuga_in_Vaduz_front.jpg',
    localPath: '/images/vehicles/kuga.jpg'
  },
  {
    id: 'karoq',
    name: 'Skoda Karoq',
    keywords: ['karoq', 'skoda karoq', 'škoda karoq'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Skoda_Karoq_Facelift_1X7A0318.jpg/960px-Skoda_Karoq_Facelift_1X7A0318.jpg',
    localPath: '/images/vehicles/karoq.jpg'
  },
  {
    id: 'c5-aircross',
    name: 'Citroën C5 Aircross',
    keywords: ['c5 aircross', 'citroen c5 aircross', 'citroën c5 aircross', 'c5aircross'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Citroen_C5_Aircross_2022_Facelift_1.2_130_front_view.jpg/960px-Citroen_C5_Aircross_2022_Facelift_1.2_130_front_view.jpg',
    localPath: '/images/vehicles/c5-aircross.jpg'
  },
  {
    id: 'cx-5',
    name: 'Mazda CX-5',
    keywords: ['cx-5', 'cx5', 'mazda cx-5', 'mazda cx5'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/2022_Mazda_CX-5_2.0_front.jpg/960px-2022_Mazda_CX-5_2.0_front.jpg',
    localPath: '/images/vehicles/cx-5.jpg'
  },
  {
    id: 'cr-v',
    name: 'Honda CR-V',
    keywords: ['cr-v', 'crv', 'honda cr-v', 'honda crv'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Honda_CR-V_%286th_generation%29_hybrid_1X7A0866.jpg/960px-Honda_CR-V_%286th_generation%29_hybrid_1X7A0866.jpg',
    localPath: '/images/vehicles/cr-v.jpg'
  },
  {
    id: 'corolla-cross',
    name: 'Toyota Corolla Cross',
    keywords: ['corolla cross', 'toyota corolla cross'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Toyota_Corolla_Cross_Hybrid_1X7A1861.jpg/960px-Toyota_Corolla_Cross_Hybrid_1X7A1861.jpg',
    localPath: '/images/vehicles/corolla-cross.jpg'
  },
  {
    id: 'duster',
    name: 'Dacia Duster',
    keywords: ['duster', 'dacia duster'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Dacia_Duster_III_IMG_8961.jpg/960px-Dacia_Duster_III_IMG_8961.jpg',
    localPath: '/images/vehicles/duster.jpg'
  },
  {
    id: 'mg-hs',
    name: 'MG HS',
    keywords: ['mg hs', 'hs', 'mg ehs'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/MG_HS_%28second_generation%29_DSC_7229.jpg/960px-MG_HS_%28second_generation%29_DSC_7229.jpg',
    localPath: '/images/vehicles/mg-hs.jpg'
  },
  {
    id: 'arkana',
    name: 'Renault Arkana',
    keywords: ['arkana', 'renault arkana'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Renault_Arkana_%28UA%29_-_Front_View.jpg/960px-Renault_Arkana_%28UA%29_-_Front_View.jpg',
    localPath: '/images/vehicles/arkana.jpg'
  },
  {
    id: 'x1',
    name: 'BMW X1',
    keywords: ['x1', 'bmw x1', 'ix1'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/BMW_U11_X1_M35i_DSC_9809.jpg/960px-BMW_U11_X1_M35i_DSC_9809.jpg',
    localPath: '/images/vehicles/x1.jpg'
  },
  {
    id: 'gla',
    name: 'Mercedes-Benz GLA',
    keywords: ['gla', 'mercedes gla', 'mercedes-benz gla', 'eqa'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Mercedes-AMG_GLA_45_S_4MATIC%2B_%28H247%29_1X7A5827.jpg/960px-Mercedes-AMG_GLA_45_S_4MATIC%2B_%28H247%29_1X7A5827.jpg',
    localPath: '/images/vehicles/gla.jpg'
  },
  {
    id: 'q3',
    name: 'Audi Q3',
    keywords: ['q3', 'audi q3', 'q3 sportback'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Audi_Q3_F3_DSC_7494.jpg/960px-Audi_Q3_F3_DSC_7494.jpg',
    localPath: '/images/vehicles/q3.jpg'
  }
];

/**
 * Silueta vectorial por defecto cuando no se dispone de foto o falla la red.
 */
export const FALLBACK_CAR_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';

/**
 * Busca un modelo en el catálogo a partir del texto ingresado por el usuario.
 * @param {string} vehicleText
 * @returns {typeof VEHICLE_CATALOG[0] | null}
 */
export function findVehicleInCatalog(vehicleText) {
  if (!vehicleText || typeof vehicleText !== 'string') return null;
  const normalized = vehicleText.toLowerCase().trim();

  // 1. Coincidencia exacta de ID o nombre
  const exact = VEHICLE_CATALOG.find(entry => 
    entry.id === normalized || entry.name.toLowerCase() === normalized
  );
  if (exact) return exact;

  // 2. Coincidencia por palabras clave
  for (const entry of VEHICLE_CATALOG) {
    for (const kw of entry.keywords) {
      if (normalized.includes(kw) || kw.includes(normalized)) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Resuelve la URL de la imagen del vehículo:
 * 1. Devuelve la URL personalizada si está definida y no vacía.
 * 2. Si no, busca en el catálogo por el nombre del vehículo.
 * 3. Si no hay coincidencia, devuelve cadena vacía.
 * @param {string} vehicleName
 * @param {string} [customUrl]
 * @returns {string}
 */
export function getVehicleImageUrl(vehicleName, customUrl = null) {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim() !== '') {
    return customUrl.trim();
  }
  const match = findVehicleInCatalog(vehicleName);
  if (match) {
    return match.imageUrl;
  }
  return '';
}
