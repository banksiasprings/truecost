// TRUE COST — calc/depreciation.js
// Pure functions for depreciation calculation.
// Input: vehicle object + scenario. Output: cost numbers (AUD).

function calcDepreciation(vehicle, scenario) {
  const years = scenario.years;
  const km = scenario.years * scenario.kmPerYear;

  // Pick the best resale value for the scenario timeframe
  let resaleValue = 0;
  if (years <= 1 && vehicle.resaleValue1yr > 0) {
    resaleValue = vehicle.resaleValue1yr;
  } else if (years <= 3 && vehicle.resaleValue3yr > 0) {
    resaleValue = vehicle.resaleValue3yr;
  } else if (years <= 5 && vehicle.resaleValue5yr > 0) {
    resaleValue = vehicle.resaleValue5yr;
  } else if (vehicle.resaleValue10yr > 0) {
    resaleValue = vehicle.resaleValue10yr;
  } else {
    // Fallback: estimate using straight-line 12% per year depreciation
    // (conservative Australian average for used vehicles)
    const annualRate = vehicle.isNew ? 0.20 : 0.12;
    resaleValue = vehicle.purchasePrice * Math.pow(1 - annualRate, years);
  }

  const totalDepreciation = Math.max(0, vehicle.purchasePrice - resaleValue);
  const perKm = km > 0 ? totalDepreciation / km : 0;
  const perYear = years > 0 ? totalDepreciation / years : 0;

  return {
    total: totalDepreciation,
    perKm,
    perYear,
    resaleValue,
  };
}