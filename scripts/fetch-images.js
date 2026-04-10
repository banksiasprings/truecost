#!/usr/bin/env node
// fetch-images.js — Wikipedia image scraper for TrueCost Pro vehicles
// Reads data/vehicles.js, queries Wikipedia REST API, updates imageUrls.

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'TrueCostPro/1.0 (image-fetcher; educational)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: {} }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpsHead(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({ method: 'HEAD', host: u.host, path: u.pathname + u.search,
        headers: { 'User-Agent': 'TrueCostPro/1.0' } }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', () => resolve(0));
      req.setTimeout(5000, () => { req.destroy(); resolve(0); });
      req.end();
    } catch { resolve(0); }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Wikipedia query variants ──────────────────────────────────────────────────

function wikiSlug(make, model) {
  return `${make}_${model}`.replace(/\s+/g, '_');
}

async function queryWikipedia(make, model, year) {
  const slugs = [
    wikiSlug(make, model),
    wikiSlug(year ? `${year}_${make}` : make, model),
    wikiSlug(make, model.replace(/\s/g, '_')),
    // Try variations
    `${make.replace(/\s/g, '_')}_${model.replace(/[-\s]/g, '_')}`,
  ];

  for (const slug of [...new Set(slugs)]) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
      const { status, body } = await httpsGet(url);
      if (status === 200 && body.thumbnail && body.thumbnail.source) {
        const src = body.thumbnail.source;
        // Upgrade to larger image
        const larger = src.replace(/\/\d+px-/, '/640px-');
        return larger;
      }
    } catch { /* continue */ }
    await sleep(50);
  }
  return null;
}

// ── Curated image overrides for popular AU vehicles ───────────────────────────
// These are known-good Wikimedia URLs tested manually.
const CURATED_IMAGES = {
  // Toyota
  'Toyota HiLux':         'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/2021_Toyota_Hilux_SR5%2B_Double_Cab_%28facelift%2C_front%29%2C_Stratos.jpg/640px-2021_Toyota_Hilux_SR5%2B_Double_Cab_%28facelift%2C_front%29%2C_Stratos.jpg',
  'Toyota RAV4':          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/2019_Toyota_RAV4_GXL_Hybrid_%28front%29%2C_Sydney.jpg/640px-2019_Toyota_RAV4_GXL_Hybrid_%28front%29%2C_Sydney.jpg',
  'Toyota Prado':         'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/2010_Toyota_LandCruiser_Prado_%28GRJ150R%29_GX_wagon_%282011-01-13%29.jpg/640px-2010_Toyota_LandCruiser_Prado_%28GRJ150R%29_GX_wagon_%282011-01-13%29.jpg',
  'Toyota LandCruiser':   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/2022_Toyota_Land_Cruiser_300-series_%28Australia%29%2C_front_8.3.22.jpg/640px-2022_Toyota_Land_Cruiser_300-series_%28Australia%29%2C_front_8.3.22.jpg',
  'Toyota Kluger':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/2021_Toyota_Kluger_GXL_AWD_%28front%29%2C_Sydney.jpg/640px-2021_Toyota_Kluger_GXL_AWD_%28front%29%2C_Sydney.jpg',
  'Toyota Camry':         'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/2021_Toyota_Camry_SL_Hybrid_%28front%29%2C_Sydney.jpg/640px-2021_Toyota_Camry_SL_Hybrid_%28front%29%2C_Sydney.jpg',
  'Toyota Corolla':       'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/2022_Toyota_Corolla_Ascent_Sport_hybrid_%28front%29.jpg/640px-2022_Toyota_Corolla_Ascent_Sport_hybrid_%28front%29.jpg',
  'Toyota Yaris':         'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/2020_Toyota_Yaris_GR_Sport_%28front%29%2C_Jakarta.jpg/640px-2020_Toyota_Yaris_GR_Sport_%28front%29%2C_Jakarta.jpg',
  'Toyota C-HR':          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/2023_Toyota_C-HR_GXL_Hybrid_%28front%29%2C_Sydney.jpg/640px-2023_Toyota_C-HR_GXL_Hybrid_%28front%29%2C_Sydney.jpg',
  'Toyota Fortuner':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Toyota_Fortuner_GR_Sport_facelift_%28front%29%2C_Jakarta.jpg/640px-Toyota_Fortuner_GR_Sport_facelift_%28front%29%2C_Jakarta.jpg',
  'Toyota GR86':          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/2022_Toyota_GR86_%28front%29.jpg/640px-2022_Toyota_GR86_%28front%29.jpg',
  // Tesla
  'Tesla Model 3':        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/2023_Tesla_Model_3_Highland_%28front%29.jpg/640px-2023_Tesla_Model_3_Highland_%28front%29.jpg',
  'Tesla Model Y':        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/2022_Tesla_Model_Y_Long_Range_AWD_%28Australia%29%2C_front_8.4.22.jpg/640px-2022_Tesla_Model_Y_Long_Range_AWD_%28Australia%29%2C_front_8.4.22.jpg',
  'Tesla Model S':        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/2020_Tesla_Model_S_Performance_%28front%29.jpg/640px-2020_Tesla_Model_S_Performance_%28front%29.jpg',
  'Tesla Model X':        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/2017_Tesla_Model_X_%28front%29.jpg/640px-2017_Tesla_Model_X_%28front%29.jpg',
  'Tesla Cybertruck':     'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Tesla_Cybertruck_at_unveil.jpg/640px-Tesla_Cybertruck_at_unveil.jpg',
  // Ford
  'Ford Ranger':          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/2022_Ford_Ranger_XLT_Wildtrak_%28Australia%29.jpg/640px-2022_Ford_Ranger_XLT_Wildtrak_%28Australia%29.jpg',
  'Ford Everest':         'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/2022_Ford_Everest_Trend_4WD_%28Australia%2C_front%29_01.jpg/640px-2022_Ford_Everest_Trend_4WD_%28Australia%2C_front%29_01.jpg',
  'Ford Puma':            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/2020_Ford_Puma_ST-Line_%28front%29.jpg/640px-2020_Ford_Puma_ST-Line_%28front%29.jpg',
  'Ford Mustang':         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/2024_Ford_Mustang_GT_%28front%29.jpg/640px-2024_Ford_Mustang_GT_%28front%29.jpg',
  'Ford Escape':          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/2020_Ford_Escape_Titanium_Hybrid_%28front%29.jpg/640px-2020_Ford_Escape_Titanium_Hybrid_%28front%29.jpg',
  'Ford Mustang Mach-E':  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/2021_Ford_Mustang_Mach-E_front_7.10.20.jpg/640px-2021_Ford_Mustang_Mach-E_front_7.10.20.jpg',
  // Hyundai
  'Hyundai Tucson':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/2022_Hyundai_Tucson_N_Line_%28front%29%2C_Melbourne.jpg/640px-2022_Hyundai_Tucson_N_Line_%28front%29%2C_Melbourne.jpg',
  'Hyundai Santa Fe':     'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/2021_Hyundai_Santa_Fe_Highlander_%28front%29%2C_Sydney.jpg/640px-2021_Hyundai_Santa_Fe_Highlander_%28front%29%2C_Sydney.jpg',
  'Hyundai Kona':         'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/2021_Hyundai_Kona_Active_%28front%29%2C_Melbourne.jpg/640px-2021_Hyundai_Kona_Active_%28front%29%2C_Melbourne.jpg',
  'Hyundai i30':          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/2021_Hyundai_i30_%28PD.V3%29_Elite_hatchback_%28front%29%2C_Melbourne.jpg/640px-2021_Hyundai_i30_%28PD.V3%29_Elite_hatchback_%28front%29%2C_Melbourne.jpg',
  'Hyundai IONIQ 5':      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2021_Hyundai_Ioniq_5_RWD_%28Australia%29%2C_front_8.4.22.jpg/640px-2021_Hyundai_Ioniq_5_RWD_%28Australia%29%2C_front_8.4.22.jpg',
  'Hyundai IONIQ 6':      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/2023_Hyundai_Ioniq_6_Techniq_%28Australia%29%2C_front_19.1.23.jpg/640px-2023_Hyundai_Ioniq_6_Techniq_%28Australia%29%2C_front_19.1.23.jpg',
  'Hyundai Ioniq 5':      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/2021_Hyundai_Ioniq_5_RWD_%28Australia%29%2C_front_8.4.22.jpg/640px-2021_Hyundai_Ioniq_5_RWD_%28Australia%29%2C_front_8.4.22.jpg',
  'Hyundai Ioniq 6':      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/2023_Hyundai_Ioniq_6_Techniq_%28Australia%29%2C_front_19.1.23.jpg/640px-2023_Hyundai_Ioniq_6_Techniq_%28Australia%29%2C_front_19.1.23.jpg',
  // Kia
  'Kia Sportage':         'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/2022_Kia_Sportage_GT-Line_%28front%29%2C_Melbourne.jpg/640px-2022_Kia_Sportage_GT-Line_%28front%29%2C_Melbourne.jpg',
  'Kia Sorento':          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/2021_Kia_Sorento_Sport%2B_AWD_%28front%29%2C_Melbourne.jpg/640px-2021_Kia_Sorento_Sport%2B_AWD_%28front%29%2C_Melbourne.jpg',
  'Kia Cerato':           'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/2021_Kia_Cerato_Sport%2B_%28front%29%2C_Melbourne.jpg/640px-2021_Kia_Cerato_Sport%2B_%28front%29%2C_Melbourne.jpg',
  'Kia EV6':              'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/2022_Kia_EV6_GT-Line_AWD_%28Australia%29%2C_front_8.4.22.jpg/640px-2022_Kia_EV6_GT-Line_AWD_%28Australia%29%2C_front_8.4.22.jpg',
  'Kia Stinger':          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/2022_Kia_Stinger_GT_%28front%29%2C_Melbourne.jpg/640px-2022_Kia_Stinger_GT_%28front%29%2C_Melbourne.jpg',
  'Kia EV9':              'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/2023_Kia_EV9_GT-Line_%28front%29.jpg/640px-2023_Kia_EV9_GT-Line_%28front%29.jpg',
  // Mazda
  'Mazda CX-5':           'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/2022_Mazda_CX-5_Akera_Turbo_%28front%29%2C_Melbourne.jpg/640px-2022_Mazda_CX-5_Akera_Turbo_%28front%29%2C_Melbourne.jpg',
  'Mazda CX-9':           'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2021_Mazda_CX-9_Azami_%28front%29%2C_Melbourne.jpg/640px-2021_Mazda_CX-9_Azami_%28front%29%2C_Melbourne.jpg',
  'Mazda CX-3':           'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/2021_Mazda_CX-3_Maxx_Sport_%28front%29%2C_Melbourne.jpg/640px-2021_Mazda_CX-3_Maxx_Sport_%28front%29%2C_Melbourne.jpg',
  'Mazda Mazda3':         'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/2019_Mazda3_G20_Evolve_hatchback_%28Australia%29%2C_front_8.26.19.jpg/640px-2019_Mazda3_G20_Evolve_hatchback_%28Australia%29%2C_front_8.26.19.jpg',
  'Mazda Mazda6':         'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/2021_Mazda_6_Atenza_saloon_%28China%29%2C_front_7.16.21.jpg/640px-2021_Mazda_6_Atenza_saloon_%28China%29%2C_front_7.16.21.jpg',
  'Mazda CX-60':          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/2022_Mazda_CX-60_PHEV_%28front%29.jpg/640px-2022_Mazda_CX-60_PHEV_%28front%29.jpg',
  // Mitsubishi
  'Mitsubishi Outlander':     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/2022_Mitsubishi_Outlander_ES_2WD_%28front%29%2C_Melbourne.jpg/640px-2022_Mitsubishi_Outlander_ES_2WD_%28front%29%2C_Melbourne.jpg',
  'Mitsubishi Eclipse Cross':  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/2022_Mitsubishi_Eclipse_Cross_ES_2WD_%28front%29%2C_Melbourne.jpg/640px-2022_Mitsubishi_Eclipse_Cross_ES_2WD_%28front%29%2C_Melbourne.jpg',
  'Mitsubishi ASX':            'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/2022_Mitsubishi_ASX_ES_2WD_%28front%29%2C_Melbourne.jpg/640px-2022_Mitsubishi_ASX_ES_2WD_%28front%29%2C_Melbourne.jpg',
  'Mitsubishi Triton':         'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/2019_Mitsubishi_Triton_GLX%2B_4WD_%28front%29.jpg/640px-2019_Mitsubishi_Triton_GLX%2B_4WD_%28front%29.jpg',
  'Mitsubishi Pajero Sport':   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/2022_Mitsubishi_Pajero_Sport_Exceed_AWD_%28front%29%2C_Melbourne.jpg/640px-2022_Mitsubishi_Pajero_Sport_Exceed_AWD_%28front%29%2C_Melbourne.jpg',
  // Subaru
  'Subaru Forester':      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/2021_Subaru_Forester_2.5i_Sport_%28front%29%2C_Melbourne.jpg/640px-2021_Subaru_Forester_2.5i_Sport_%28front%29%2C_Melbourne.jpg',
  'Subaru Outback':       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/2021_Subaru_Outback_AWD_%28front%29%2C_Melbourne.jpg/640px-2021_Subaru_Outback_AWD_%28front%29%2C_Melbourne.jpg',
  'Subaru WRX':           'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/2022_Subaru_WRX_%28front%29.jpg/640px-2022_Subaru_WRX_%28front%29.jpg',
  'Subaru BRZ':           'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/2022_Subaru_BRZ_S_%28front%29.jpg/640px-2022_Subaru_BRZ_S_%28front%29.jpg',
  'Subaru XV':            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/2021_Subaru_XV_2.0i-S_AWD_%28front%29%2C_Melbourne.jpg/640px-2021_Subaru_XV_2.0i-S_AWD_%28front%29%2C_Melbourne.jpg',
  // Nissan
  'Nissan X-Trail':       'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/2022_Nissan_X-Trail_ST_e-4ORCE_%28front%29%2C_Melbourne.jpg/640px-2022_Nissan_X-Trail_ST_e-4ORCE_%28front%29%2C_Melbourne.jpg',
  'Nissan Navara':        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Nissan_Navara_D23_SL_4x4_DCab_Pickup_%28Australia%29.jpg/640px-Nissan_Navara_D23_SL_4x4_DCab_Pickup_%28Australia%29.jpg',
  'Nissan Patrol':        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/2020_Nissan_Patrol_Ti-L_%28front%29%2C_Melbourne.jpg/640px-2020_Nissan_Patrol_Ti-L_%28front%29%2C_Melbourne.jpg',
  'Nissan Leaf':          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/2019_Nissan_Leaf_%28front%29.jpg/640px-2019_Nissan_Leaf_%28front%29.jpg',
  'Nissan Juke':          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/2020_Nissan_Juke_%28F16%29_front.jpg/640px-2020_Nissan_Juke_%28F16%29_front.jpg',
  // BMW
  'BMW iX3':              'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/BMW_iX3_front.jpg/640px-BMW_iX3_front.jpg',
  'BMW i4':               'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/2022_BMW_i4_eDrive40_%28front%29.jpg/640px-2022_BMW_i4_eDrive40_%28front%29.jpg',
  'BMW X3':               'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/2022_BMW_X3_xDrive30i_M_Sport_%28front%29%2C_Melbourne.jpg/640px-2022_BMW_X3_xDrive30i_M_Sport_%28front%29%2C_Melbourne.jpg',
  'BMW X5':               'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/2020_BMW_X5_xDrive45e_%28front%29.jpg/640px-2020_BMW_X5_xDrive45e_%28front%29.jpg',
  // Mercedes
  'Mercedes-Benz GLC':    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/2022_Mercedes-Benz_GLC_300_4MATIC_%28front%29.jpg/640px-2022_Mercedes-Benz_GLC_300_4MATIC_%28front%29.jpg',
  'Mercedes-Benz C-Class':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/2021_Mercedes-Benz_C200_%28front%29.jpg/640px-2021_Mercedes-Benz_C200_%28front%29.jpg',
  // Audi
  'Audi Q5':              'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/2021_Audi_Q5_45_TFSI_%28front%29.jpg/640px-2021_Audi_Q5_45_TFSI_%28front%29.jpg',
  'Audi Q3':              'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/2020_Audi_Q3_35_TFSI_%28front%29.jpg/640px-2020_Audi_Q3_35_TFSI_%28front%29.jpg',
  // BYD
  'BYD Atto 3':           'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/BYD_Atto_3_facelift%2C_front_left.jpg/640px-BYD_Atto_3_facelift%2C_front_left.jpg',
  'BYD Seal':             'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/BYD_Seal_Overseas_front.jpg/640px-BYD_Seal_Overseas_front.jpg',
  'BYD Dolphin':          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/BYD_Dolphin_front.jpg/640px-BYD_Dolphin_front.jpg',
  // MG
  'MG MG4':               'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/MG_MG4_EV_%28front%29.jpg/640px-MG_MG4_EV_%28front%29.jpg',
  'MG ZS':                'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/2021_MG_ZS_Essence_%28front%29%2C_Melbourne.jpg/640px-2021_MG_ZS_Essence_%28front%29%2C_Melbourne.jpg',
  'MG HS':                'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/MG_HS_PHEV_%28front%29.jpg/640px-MG_HS_PHEV_%28front%29.jpg',
  // GWM
  'GWM Haval H6':         'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/GWM_Haval_H6_front.jpg/640px-GWM_Haval_H6_front.jpg',
  'GWM Tank 300':         'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/GWM_Tank_300_front.jpg/640px-GWM_Tank_300_front.jpg',
  // Volvo
  'Volvo XC40':           'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/2019_Volvo_XC40_T4_Inscription_%28front%29.jpg/640px-2019_Volvo_XC40_T4_Inscription_%28front%29.jpg',
  'Volvo XC60':           'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/2022_Volvo_XC60_B5_Momentum_%28front%29.jpg/640px-2022_Volvo_XC60_B5_Momentum_%28front%29.jpg',
  'Volvo XC90':           'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/2020_Volvo_XC90_D5_Inscription_%28front%29.jpg/640px-2020_Volvo_XC90_D5_Inscription_%28front%29.jpg',
  // Porsche
  'Porsche Taycan':       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Porsche_Taycan_4S_%28front%29.jpg/640px-Porsche_Taycan_4S_%28front%29.jpg',
  'Porsche Macan':        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/2022_Porsche_Macan_GTS_%28front%29.jpg/640px-2022_Porsche_Macan_GTS_%28front%29.jpg',
  // Lexus
  'Lexus UX':             'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/2019_Lexus_UX_250h_%28front%29.jpg/640px-2019_Lexus_UX_250h_%28front%29.jpg',
  'Lexus NX':             'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/2022_Lexus_NX_350h_%28front%29.jpg/640px-2022_Lexus_NX_350h_%28front%29.jpg',
  'Lexus RX':             'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/2023_Lexus_RX_500h_%28front%29.jpg/640px-2023_Lexus_RX_500h_%28front%29.jpg',
  // Honda
  'Honda HR-V':           'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/2022_Honda_HR-V_Vi_%28front%29%2C_Melbourne.jpg/640px-2022_Honda_HR-V_Vi_%28front%29%2C_Melbourne.jpg',
  'Honda CR-V':           'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/2023_Honda_CR-V_e%3AHEV_%28front%29.jpg/640px-2023_Honda_CR-V_e%3AHEV_%28front%29.jpg',
  'Honda Civic':          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2022_Honda_Civic_e%3AHEV_front.jpg/640px-2022_Honda_Civic_e%3AHEV_front.jpg',
  // Polestar
  'Polestar Polestar 2':  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Polestar_2_front.jpg/640px-Polestar_2_front.jpg',
  // Volkswagen
  'Volkswagen Golf':      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/2021_Volkswagen_Golf_110TSI_Life_%28front%29%2C_Melbourne.jpg/640px-2021_Volkswagen_Golf_110TSI_Life_%28front%29%2C_Melbourne.jpg',
  'Volkswagen Tiguan':    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/2021_Volkswagen_Tiguan_Allspace_162TSI_Highline_%28front%29%2C_Melbourne.jpg/640px-2021_Volkswagen_Tiguan_Allspace_162TSI_Highline_%28front%29%2C_Melbourne.jpg',
  'Volkswagen T-Roc':     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/2021_Volkswagen_T-Roc_140TSI_Sport_%28front%29%2C_Melbourne.jpg/640px-2021_Volkswagen_T-Roc_140TSI_Sport_%28front%29%2C_Melbourne.jpg',
  'Volkswagen ID.4':      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/2021_Volkswagen_ID.4_%28front%29.jpg/640px-2021_Volkswagen_ID.4_%28front%29.jpg',
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const vehiclesPath = path.join(__dirname, '../data/vehicles.js');
  let vehiclesSource = fs.readFileSync(vehiclesPath, 'utf8');

  // Parse make+model pairs from vehicle data
  const pairs = new Map(); // "Make Model" → first vehicle with that combo
  const presets = [];

  // Simple regex to extract make/model from JS source
  const vehicleRegex = /\{[^}]*?make:'([^']*)'[^}]*?model:'([^']*)'[^}]*?\}/g;
  const vehicleRegex2 = /\{[^}]*?make:"([^"]*)"[^}]*?model:"([^"]*)"/g;

  let match;
  while ((match = vehicleRegex.exec(vehiclesSource)) !== null) {
    const [, make, model] = match;
    const key = `${make} ${model}`;
    if (!pairs.has(key)) pairs.set(key, { make, model });
  }

  console.log(`Found ${pairs.size} unique make+model pairs`);

  // Build image map: start with curated images
  const imageMap = { ...CURATED_IMAGES };

  // Then query Wikipedia for missing ones
  let wikiHits = 0;
  let wikiMiss = 0;
  const pairList = [...pairs.values()];

  for (let i = 0; i < pairList.length; i++) {
    const { make, model } = pairList[i];
    const key = `${make} ${model}`;

    if (imageMap[key]) {
      process.stdout.write(`[CURATED] ${key}\n`);
      continue;
    }

    process.stdout.write(`[${i+1}/${pairList.length}] Querying Wikipedia: ${key}...`);
    const url = await queryWikipedia(make, model);

    if (url) {
      imageMap[key] = url;
      wikiHits++;
      console.log(' ✓');
    } else {
      wikiMiss++;
      console.log(' ✗');
    }

    await sleep(100); // Be polite to Wikipedia
  }

  console.log(`\nWikipedia hits: ${wikiHits}, misses: ${wikiMiss}`);
  console.log(`Total with images: ${Object.keys(imageMap).length}`);

  // Save image map
  const mapPath = path.join(__dirname, 'image-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(imageMap, null, 2));
  console.log(`\nSaved image map to ${mapPath}`);

  // ── Update vehicles.js ────────────────────────────────────────────────────
  let updated = 0;
  let updatedSource = vehiclesSource;

  for (const [key, url] of Object.entries(imageMap)) {
    const [make, ...modelParts] = key.split(' ');
    const model = modelParts.join(' ');

    // Escape special chars for regex
    const escapedMake  = make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find vehicle entries that already have this make+model but no imageUrl (or a different one)
    // Strategy: match blocks containing make:'X', model:'Y' — inject imageUrl

    // Pattern to match objects with this make+model that DON'T already have an imageUrl
    // We'll do a simple search-and-update for the imageUrl field
    const blockPattern = new RegExp(
      `(\\{[^}]*?make:'${escapedMake}'[^}]*?model:'${escapedModel}'[^}]*?)(\\})`,
      'g'
    );

    updatedSource = updatedSource.replace(blockPattern, (fullMatch, body, close) => {
      if (body.includes('imageUrl:')) {
        // Already has an image, update it
        const newBody = body.replace(/imageUrl:'[^']*'/, `imageUrl:'${url}'`);
        if (newBody !== body) updated++;
        return newBody + close;
      } else {
        // Add imageUrl before the closing brace
        updated++;
        return body.trimEnd() + `, imageUrl:'${url}' ` + close;
      }
    });
  }

  // Write updated vehicles.js
  fs.writeFileSync(vehiclesPath, updatedSource);
  console.log(`\nUpdated ${updated} vehicle entries with imageUrl in data/vehicles.js`);

  // Count how many total have images now
  const finalImageCount = (updatedSource.match(/imageUrl:'/g) || []).length;
  console.log(`Total vehicles with images: ${finalImageCount}`);
}

main().catch(err => { console.error(err); process.exit(1); });
