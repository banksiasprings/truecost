// TRUE COST — defaults.js
// Default values used when creating a new vehicle or when user
// hasn't entered specific data. Conservative Australian averages.

const Defaults = {

  scenario: {
    years: 5,
    kmPerYear: 15000,
    opportunityCostRate: 4.5,  // % p.a. (conservative term deposit rate)
    state: 'QLD',
  },

  vehicle: {
    fuelType: 'petrol',
    fuelConsumption: 8.5,      // L/100km — average Australian passenger car
    fuelPricePerLitre: 189,    // cents/L — from AustraliaData.fuel.unleaded
    serviceIntervalKm: 10000,
    serviceIntervalMonths: 12,
    serviceCostPerService: 350,
    serviceType: 'independent',
    tyreCostPerSet: 900,
    tyreLifeKm: 45000,
    insuranceCategory: 'standard',
    insuranceAnnual: 1400,
    registrationAnnual: 689,   // QLD default from AustraliaData
    isNew: false,
    financed: false,
    interestRate: 7.5,         // % p.a. typical car loan
    loanTermMonths: 60,

    // EV defaults
    evConsumptionKwh: 18,      // kWh/100km — typical mid-range EV
    evChargingTariff: 30,      // cents/kWh home
    evPublicChargingPct: 20,   // 20% charged on public network
    evPublicTariff: 60,        // cents/kWh public
    batteryReplacementCost: 15000,
    batteryExpectedKm: 250000,
  },

};

Object.freeze(Defaults);
