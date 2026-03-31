// TRUE COST — australia.js
// Australian state registration costs and fuel price defaults.
// Update annually from state revenue office websites.
// All monetary values in AUD.

const AustraliaData = {

  // ── Registration annual costs by state (light vehicle, under 4.5t) ──
  // Base rego + CTP (greenslip) combined estimate. Overridable per vehicle.
  registration: {
    QLD: { base: 289,  ctp: 400, total: 689 },  // Brisbane CTP mid-range
    NSW: { base: 394,  ctp: 500, total: 894 },  // Sydney greenslip mid-range
    VIC: { base: 844,  ctp: 0,   total: 844 },  // VIC includes TAC levy
    SA:  { base: 320,  ctp: 450, total: 770 },
    WA:  { base: 350,  ctp: 380, total: 730 },
    ACT: { base: 580,  ctp: 0,   total: 580 },  // ACT combined
    TAS: { base: 260,  ctp: 340, total: 600 },
    NT:  { base: 230,  ctp: 300, total: 530 },
  },

  // ── Stamp duty rates by state (% of vehicle value) ──
  // Rate varies by value band — simplified single rate here
  stampDuty: {
    QLD: { rate: 0.031, notes: '3.1% for vehicles under $100k' },
    NSW: { rate: 0.030, notes: '3% general rate' },
    VIC: { rate: 0.055, notes: '5.5% general rate' },
    SA:  { rate: 0.040, notes: '4% general rate' },
    WA:  { rate: 0.030, notes: '3% general rate' },
    ACT: { rate: 0.030, notes: '3% general rate' },
    TAS: { rate: 0.030, notes: '3% general rate' },
    NT:  { rate: 0.030, notes: '3% general rate' },
  },

  // ── Fuel price defaults (cents per litre) ──
  // Source: AIP weekly average — update periodically or use live API
  fuel: {
    unleaded:   189,  // ULP 91
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

  // ── Default tyre costs by category ──
  tyres: {
    small:   { cost: 600,  lifeKm: 40000 },  // city car / small hatch
    medium:  { cost: 900,  lifeKm: 45000 },  // medium sedan / family
    large:   { cost: 1200, lifeKm: 50000 },  // SUV / large sedan
    prestige:{ cost: 2000, lifeKm: 35000 },  // performance / prestige
    ev:      { cost: 1100, lifeKm: 35000 },  // EVs wear tyres faster
  },

};

// Freeze to prevent accidental mutation
Object.freeze(AustraliaData);
