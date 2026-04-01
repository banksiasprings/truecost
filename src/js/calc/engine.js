// TRUE COST — calc/engine.js
// Master orchestrator. Takes vehicle + scenario, returns full cost breakdown.

/**
 * @param {Object} vehicle  - from data/model.js
 * @param {Object} scenario - { years, kmPerYear, opportunityCostRate, state }
 * @returns {Object} {
 *   summary: { totalOwnershipCost, costPerYear, costPerKm },
 *   total:   { depreciation, fuel, battery, tyres, registration, insurance,
 *              servicing, roadside, parking, tolls, lostCapital, financeInterest, finance },
 *   breakdown: { <category>: { total, perKm, perYear } }
 * }
 */
function calculateCosts(vehicle, scenario) {
  const km = scenario.years * scenario.kmPerYear;

  // Individual cost modules
  const depreciation = calcDepreciation(vehicle, scenario);
  const fuel         = calcFuel(vehicle, scenario);
  const battery      = calcBattery(vehicle, scenario);

  // Tyres
  const tyreSets      = km / (vehicle.tyreLifeKm || 45000);
  const tyreCostTotal = tyreSets * (vehicle.tyreCostPerSet || 900);
  const tyresPerKm    = km > 0 ? tyreCostTotal / km : 0;
  const tyresPerYear  = scenario.years > 0 ? tyreCostTotal / scenario.years : 0;

  // Registration
  const registration = calcRegistration(vehicle, scenario);

  // Insurance
  const insurance = calcInsurance(vehicle, scenario);

  // Servicing
  const servicesCount   = vehicle.serviceIntervalKm > 0 ? km / vehicle.serviceIntervalKm : 0;
  const servicingTotal  = servicesCount * (vehicle.serviceCostPerService || 350);
  const servicingPerKm  = km > 0 ? servicingTotal / km : 0;
  const servicingPerYear = scenario.years > 0 ? servicingTotal / scenario.years : 0;

  // Roadside assistance
  const roadsideTotal = (vehicle.roadsideAssistance || 0) * scenario.years;
  const roadsidePerKm = km > 0 ? roadsideTotal / km : 0;
  const roadsidePerYear = vehicle.roadsideAssistance || 0;

  // Parking & tolls
  const parkingTotal  = (vehicle.parkingAnnual || 0) * scenario.years;
  const tollsTotal    = (vehicle.tollsAnnual   || 0) * scenario.years;
  const parkingPerKm  = km > 0 ? parkingTotal / km : 0;
  const tollsPerKm    = km > 0 ? tollsTotal   / km : 0;

  // Lost capital (opportunity cost on purchase price)
  const oppRate          = (scenario.opportunityCostRate || 4.5) / 100;
  const onRoadCost       = vehicle.onRoadCost || vehicle.purchasePrice;
  const lostCapitalPerYear = onRoadCost * oppRate;
  const lostCapitalTotal   = lostCapitalPerYear * scenario.years;
  const lostCapitalPerKm   = km > 0 ? lostCapitalTotal / km : 0;

  // Finance interest (loan cost above principal)
  let financeTotal = 0;
  let financePerKm = 0;
  let financePerYear = 0;
  if (vehicle.financed && vehicle.loanAmount > 0) {
    const monthlyRate = (vehicle.interestRate / 100) / 12;
    const n = vehicle.loanTermMonths || 60;
    if (monthlyRate > 0) {
      const monthlyPayment = vehicle.loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n));
      financeTotal = (monthlyPayment * n) - vehicle.loanAmount;
    }
    financePerKm  = km > 0 ? financeTotal / km : 0;
    financePerYear = scenario.years > 0 ? financeTotal / scenario.years : 0;
  }

  // Grand totals
  const grandTotal = depreciation.total + fuel.total + battery.total
    + tyreCostTotal + registration.total + insurance.total
    + servicingTotal + roadsideTotal + parkingTotal + tollsTotal
    + lostCapitalTotal + financeTotal;
  const costPerKm  = km > 0 ? grandTotal / km : 0;
  const costPerYear = scenario.years > 0 ? grandTotal / scenario.years : 0;

  return {
    // Top-level summary (UI-facing)
    summary: {
      totalOwnershipCost: grandTotal,
      costPerYear,
      costPerKm,
    },
    // Per-category totals (UI-facing — flat numbers)
    total: {
      depreciation:    depreciation.total,
      fuel:            fuel.total,
      battery:         battery.total,
      tyres:           tyreCostTotal,
      registration:    registration.total,
      insurance:       insurance.total,
      servicing:       servicingTotal,
      roadside:        roadsideTotal,
      parking:         parkingTotal,
      tolls:           tollsTotal,
      lostCapital:     lostCapitalTotal,
      financeInterest: financeTotal,
      finance:         financeTotal,   // alias used in detail.js
    },
    // Full per-category breakdown with perKm / perYear
    breakdown: {
      depreciation:    { total: depreciation.total,  perKm: depreciation.perKm,  perYear: depreciation.perYear },
      fuel:            { total: fuel.total,           perKm: fuel.perKm,          perYear: fuel.perYear },
      battery:         { total: battery.total,        perKm: battery.perKm,       perYear: battery.perYear },
      tyres:           { total: tyreCostTotal,        perKm: tyresPerKm,          perYear: tyresPerYear },
      registration:    { total: registration.total,  perKm: registration.perKm,  perYear: registration.perYear },
      insurance:       { total: insurance.total,     perKm: insurance.perKm,     perYear: insurance.perYear },
      servicing:       { total: servicingTotal,      perKm: servicingPerKm,      perYear: servicingPerYear },
      roadside:        { total: roadsideTotal,       perKm: roadsidePerKm,       perYear: roadsidePerYear },
      parking:         { total: parkingTotal,        perKm: parkingPerKm,        perYear: vehicle.parkingAnnual || 0 },
      tolls:           { total: tollsTotal,          perKm: tollsPerKm,          perYear: vehicle.tollsAnnual   || 0 },
      lostCapital:     { total: lostCapitalTotal,    perKm: lostCapitalPerKm,    perYear: lostCapitalPerYear },
      financeInterest: { total: financeTotal,        perKm: financePerKm,        perYear: financePerYear },
    },
  };
}

// Formatting utilities
function fmtAUD(amount) {
  return '$' + Math.round(amount).toLocaleString('en-AU');
}
function fmtPerKm(perKm) {
  return (perKm * 100).toFixed(1) + 'c/km';
}
