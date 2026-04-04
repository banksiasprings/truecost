// TRUE COST — australia.js
// Australian state registration costs and fuel price defaults.
// Update annually from state revenue office websites.
// All monetary values in AUD.

const AustraliaData = {

  // ── Registration annual costs by state (light vehicle, under 4.5t) ──
  // Calculated based on cylinders or tare weight depending on state
  // QLD rates updated 1 April 2026 (qld.gov.au/transport/registration/fees/cost)
  // Other states current as of 2024-2025 financial year — update annually
  registration: {
    QLD: {
      // Cylinder-based. EVs/PHEVs/steam are in the '1–3 cyl/electric' band (cheapest).
      // base = registration fee + traffic improvement fee ($65.05); ctp = avg CTP insurance
      // Source: qld.gov.au/transport/registration/fees/cost (1 April 2026 rates)
      cylinders: {
        electric: { base: 358, ctp: 409 }, // EV / PHEV / steam / 1–3 cyl  ($293.20 + $65.05 reg, ~$409 CTP)
        4:        { base: 438, ctp: 409 }, // 4-cyl                          ($372.85 + $65.05 reg)
        6:        { base: 655, ctp: 409 }, // 5–6-cyl                        ($590.35 + $65.05 reg)
        8:        { base: 892, ctp: 409 }, // 7–8-cyl                        ($826.75 + $65.05 reg)
        12:       { base: 1035, ctp: 409 },// 9–12-cyl                       ($969.65 + $65.05 reg)
      },
    },
    NSW: {
      // Weight-based (tare weight in kg)
      // NSW Roads & Maritime: $82 flat admin fee + vehicle tax by tare weight (private use)
      // Rates from 1 July 2025 (+3.22% indexation). CTP (green slip) is separate; ~$550 metro avg.
      // Source: nsw.gov.au/driving-boating-and-transport/vehicle-registration/fees-concessions-and-forms/vehicle-registration-fees
      weight: {
        975:   { base: 352, ctp: 550 },   // up to 975 kg  ($270 tax + $82 admin = $352)
        1154:  { base: 395, ctp: 550 },   // 976–1,154 kg  ($313 + $82 = $395)
        1504:  { base: 462, ctp: 550 },   // 1,155–1,504 kg ($380 + $82 = $462) — common family car
        2504:  { base: 661, ctp: 550 },   // 1,505–2,504 kg ($579 + $82 = $661) — SUV / ute range
        9999:  { base: 917, ctp: 550 },   // 2,505+ kg     ($835 + $82 = $917)
      },
    },
    VIC: {
      // VIC rego = flat rego fee + Transport Accident Charge (TAC) + CTP (bundled).
      // No cylinder variation — all bands set to metro total (~$931).
      // EVs receive a $100 discount on the rego component → metro EV total ~$831.
      // Metro (high risk zone): $343 rego + $534 TAC + $53 CTP ≈ $931
      // Outer metro: ~$871 | Rural: ~$801 — defaulting to metro (most VIC users).
      // Source: dapc.com.au/blog/victorian-car-registration-fees-2025-breakdown
      cylinders: {
        electric: { base: 831, ctp: 0 }, // EV / PHEV — $100 EV discount applied, metro
        4:  { base: 931, ctp: 0 },       // 4-cyl (all cylinders same in VIC)
        6:  { base: 931, ctp: 0 },
        8:  { base: 931, ctp: 0 },
      },
    },
    SA: {
      // Engine capacity (cc) based
      cc: {
        1500: { base: 244, ctp: 380 },    // up to 1500 cc
        1799: { base: 285, ctp: 380 },    // 1501-1799 cc
        2598: { base: 325, ctp: 380 },    // 1800-2598 cc
        9999: { base: 400, ctp: 380 },    // 2599+ cc
      },
    },
    WA: {
      // Weight-based (tare weight in kg)
      // WA rego = $28.64 per 100 kg tare + Motor Injury Insurance $504.70 + admin $9.50
      // CTP field here carries MII + admin ($514) since there's no separate line.
      // Source: dapc.com.au/blog/western-australia-car-registration-fees-2025-breakdown
      weight: {
        1200: { base: 344, ctp: 514 },    // up to 1200 kg  ($28.64×12=$344 + $514 = $858)
        1500: { base: 430, ctp: 514 },    // 1201–1500 kg   ($28.64×15=$430 + $514 = $944)
        1800: { base: 516, ctp: 514 },    // 1501–1800 kg   ($28.64×18=$516 + $514 = $1,030)
        9999: { base: 573, ctp: 514 },    // 1801+ kg       ($28.64×20=$573 + $514 = $1,087 typical)
      },
    },
    ACT: {
      // Value + emissions based — simplified as cylinder bands
      // ACT waives registration fees for EVs (zero-emission vehicles)
      cylinders: {
        electric: { base: 0, ctp: 0 }, // EV — ACT waives rego for zero-emission vehicles
        4: { base: 274, ctp: 0 },      // 4-cyl
        6: { base: 360, ctp: 0 },      // 6-cyl
        8: { base: 450, ctp: 0 },      // 8-cyl+
      },
    },
    TAS: {
      // Cylinder-based. Total annual for a 4-cyl ≈ $626. Updated from ~$535.
      // Source: transport.tas.gov.au/fees_forms/registration_fees
      cylinders: {
        electric: { base: 286, ctp: 340 }, // EV — lowest band (~$626 total)
        4: { base: 286, ctp: 340 },        // 4-cyl (~$626 total)
        6: { base: 360, ctp: 340 },        // 6-cyl (~$700 total)
        8: { base: 440, ctp: 340 },        // 8-cyl+ (~$780 total)
      },
    },
    NT: {
      // EVs: Free registration (fee waiver) until 30 June 2027 per NT Gov policy.
      // CTP insurance component may still apply separately — excluded here as it varies.
      // Source: transport.nt.gov.au (2024-25)
      cylinders: {
        electric: { base: 0,   ctp: 0   }, // EV — fee waiver until June 2027
        4:        { base: 172, ctp: 300 }, // 4-cyl
        6:        { base: 214, ctp: 300 }, // 6-cyl
        8:        { base: 258, ctp: 300 }, // 8-cyl+
      },
    },
  },

  // ── Stamp duty rates by state — standard (ICE/PHEV) and EV-specific ──
  // EV concessions current as of April 2026. PHEVs generally get standard rates
  // (most state concessions target BEVs / zero-emission only).
  // Sources: state revenue office sites; verify before purchase.
  stampDuty: {
    QLD: { rate: 0.031, evRate: 0.020, evNote: '2% for EVs (vs 3.1% standard) up to $100k' },
    NSW: { rate: 0.030, evRate: 0.030, evNote: 'No EV concession — standard 3%' },
    VIC: { rate: 0.055, evRate: 0.042, evNote: '$8.40 per $200 value (4.2%) for EVs (vs 5.5% standard)' },
    SA:  { rate: 0.040, evRate: 0.025, evNote: 'Reduced rate for EVs (~2.5%)' },
    WA:  { rate: 0.028, evRate: 0.028, evNote: 'No EV concession' },
    ACT: { rate: 0.030, evRate: 0.000, evNote: 'Full stamp duty exemption for zero-emission vehicles' },
    TAS: { rate: 0.030, evRate: 0.030, evNote: 'No EV concession' },
    NT:  { rate: 0.030, evRate: null,  evNote: 'Up to $1,500 concession for EVs ≤$50k dutiable value' },
  },

  // ── Fuel price defaults (cents per litre) ──
  // Source: AIP weekly average — update periodically or use live API
  fuel: {
    unleaded:   205,  // ULP 91 — updated Apr 2026 (post-excise-cut)  // ULP 91
    premium:    209,  // ULP 98
    diesel:     199,
    lpg:        90,
    // EV charging (cents per kWh)
    evHomeRate: 30,   // typical off-peak home tariff
    evPublicRate: 60, // typical public fast charger
  },

  // ── Default insurance annual cost by category ──
  insurance: {
    budget:   800,
    standard: 1400,
    premium:  2200,
  },

  // ── Insurance age multipliers (baseline = age 30–49, Canstar 2025, 67k+ quotes) ──
  // Applied to base insurance estimate to adjust for driver age.
  insuranceAgeMultipliers: [
    { maxAge: 24, multiplier: 1.77 },  // <25: avg $2,700 vs $1,530 baseline
    { maxAge: 29, multiplier: 1.35 },  // 25–29: avg $2,060
    { maxAge: 49, multiplier: 1.00 },  // 30–49: baseline (Canstar avg $1,530)
    { maxAge: 69, multiplier: 0.77 },  // 50–69: avg $1,180
    { maxAge: 99, multiplier: 0.88 },  // 70+: slight increase (avg ~$1,350)
  ],

  // ── Insurance state multipliers (baseline = national average) ──
  // Source: Canstar/Ratecity 2024 state average comprehensive premiums.
  // VIC is significantly above average; TAS well below.
  insuranceStateMultipliers: {
    QLD: 0.97,
    NSW: 1.09,
    VIC: 1.29,
    SA:  0.86,
    WA:  0.90,
    ACT: 0.93,
    TAS: 0.81,
    NT:  0.88,
  },

  // ── Default tyre costs by category ──
  tyres: {
    small:   { cost: 600,  lifeKm: 40000 },  // city car / small hatch
    medium:  { cost: 900,  lifeKm: 45000 },  // medium sedan / family
    large:   { cost: 1200, lifeKm: 50000 },  // SUV / large sedan
    prestige:{ cost: 2000, lifeKm: 35000 },  // performance / prestige
    ev:      { cost: 1100, lifeKm: 35000 },  // EVs wear tyres faster
  },

};

// Function to calculate registration cost based on state and vehicle params.
// fuelType: 'petrol'|'diesel'|'hybrid'|'phev'|'electric'|'lpg' — used to route EVs/PHEVs
// Returns { base, ctp, total } in AUD
function calculateStateRegistration(state, cylinders, tarenWeightKg, fuelType) {
  if (!state) return null;

  const regoData = AustraliaData.registration[state];
  if (!regoData) return null;

  // Electric vehicles (BEV) and plug-in hybrids (PHEV) are treated as
  // the EV/zero-emission band in states that have one.
  const isEV = fuelType === 'electric' || fuelType === 'phev';

  let base = 0, ctp = 0;

  // Weight-based states (NSW, WA) — EVs just use their actual tare weight
  if (regoData.weight) {
    const weight = tarenWeightKg || 1400; // default middle estimate
    const weights = Object.keys(regoData.weight)
      .map(w => ({ limit: parseInt(w), data: regoData.weight[w] }))
      .sort((a, b) => a.limit - b.limit);

    const band = weights.find(w => weight <= w.limit);
    if (band) {
      base = band.data.base;
      ctp = band.data.ctp;
    }
  }
  // Engine capacity based (SA) — EVs get lowest cc band
  else if (regoData.cc) {
    const cc = isEV ? 0
      : cylinders ? (cylinders <= 4 ? 1300 : cylinders <= 6 ? 1900 : 2600) : 1800;
    const ccBands = Object.keys(regoData.cc)
      .map(c => ({ limit: parseInt(c), data: regoData.cc[c] }))
      .sort((a, b) => a.limit - b.limit);

    // EVs use lowest band; ICE vehicles find the matching band
    const band = isEV ? ccBands[0] : ccBands.find(c => cc <= c.limit);
    if (band) {
      base = band.data.base;
      ctp = band.data.ctp;
    }
  }
  // Cylinder-based states (QLD, VIC, ACT, TAS, NT)
  else if (regoData.cylinders) {
    let cylData;
    if (isEV && regoData.cylinders['electric']) {
      // EVs/PHEVs get their own 'electric' band (e.g. QLD 1-3 cyl/electric rate)
      cylData = regoData.cylinders['electric'];
    } else {
      const cyl = cylinders || 4; // ICE: default to 4-cyl if not specified
      let cylBand = 4;
      if (cyl >= 12) cylBand = 12;
      else if (cyl >= 8) cylBand = 8;
      else if (cyl >= 6) cylBand = 6;
      else cylBand = 4;
      cylData = regoData.cylinders[cylBand] || regoData.cylinders[4];
    }

    if (cylData) {
      base = cylData.base;
      ctp = cylData.ctp;
    }
  }

  const total = base + ctp;
  return { base, ctp, total };
}

// Returns an insurance estimate adjusted for driver age and state.
// baseAnnual: the starting estimate (from insuranceCategory lookup or manual)
// state: e.g. 'QLD', 'VIC'
// driverAge: optional integer; omit or null to skip age adjustment
function calculateInsuranceEstimate(baseAnnual, state, driverAge) {
  let estimate = baseAnnual || 0;

  // Apply state multiplier
  const stateMult = state && AustraliaData.insuranceStateMultipliers[state];
  if (stateMult) estimate = estimate * stateMult;

  // Apply age multiplier if age is provided
  if (driverAge && driverAge > 0) {
    const ageBracket = AustraliaData.insuranceAgeMultipliers.find(b => driverAge <= b.maxAge);
    if (ageBracket) estimate = estimate * ageBracket.multiplier;
  }

  return Math.round(estimate);
}

/**
 * Calculate stamp duty for a vehicle purchase.
 * Applies EV concessions where applicable as of April 2026.
 * @param {string} state  — e.g. 'QLD', 'NSW', 'VIC'
 * @param {number} price  — purchase price in AUD
 * @param {string} fuelType — 'electric'|'phev'|'petrol'|'diesel'|'hybrid'
 * @returns {{ duty: number, savedVsStandard: number, hasEvConcession: boolean, note: string }}
 */
function calculateStampDuty(state, price, fuelType) {
  if (!state || !price) return { duty: 0, savedVsStandard: 0, hasEvConcession: false, note: '' };
  const sd = AustraliaData.stampDuty[state];
  if (!sd) return { duty: 0, savedVsStandard: 0, hasEvConcession: false, note: '' };

  const isEV = fuelType === 'electric';  // PHEVs get standard rate (post-Apr 2025 policy)
  const standardDuty = Math.round(price * sd.rate);

  let duty = standardDuty;
  let hasEvConcession = false;

  if (isEV) {
    if (state === 'ACT') {
      duty = 0;  // Full exemption
      hasEvConcession = true;
    } else if (state === 'NT') {
      // Up to $1,500 concession for vehicles ≤$50,000
      const concession = price <= 50000 ? 1500 : 0;
      duty = Math.max(0, standardDuty - concession);
      hasEvConcession = price <= 50000;
    } else if (sd.evRate !== undefined && sd.evRate !== null && sd.evRate !== sd.rate) {
      duty = Math.round(price * sd.evRate);
      hasEvConcession = true;
    }
  }

  return {
    duty,
    savedVsStandard: Math.max(0, standardDuty - duty),
    hasEvConcession,
    note: isEV ? (sd.evNote || '') : '',
  };
}

// Freeze to prevent accidental mutation
Object.freeze(AustraliaData);
