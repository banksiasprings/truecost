// TRUE COST — calc/battery.js
// EV battery replacement cost calculation.
// For non-EVs returns zero cost object.

function calcBattery(vehicle, scenario) {
  if (vehicle.fuelType !== 'electric' && vehicle.fuelType !== 'phev') {
    return { total: 0, perKm: 0, perYear: 0, replacements: 0 };
  }

  const km = scenario.years * scenario.kmPerYear;
  const expectedKm = vehicle.batteryExpectedKm || 250000;
  const replacementCost = vehicle.batteryReplacementCost || 15000;

  const replacements = Math.floor(km / expectedKm);
  const total = replacements * replacementCost;
  const perKm = km > 0 ? total / km : 0;
  const perYear = scenario.years > 0 ? total / scenario.years : 0;

  return { total, perKm, perYear, replacements };
}