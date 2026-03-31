// TRUE COST — calc/registration.js
// Annual registration cost calculation.

function calcRegistration(vehicle, scenario) {
  // Use vehicle-specific value, fall back to state default
  let annualCost = vehicle.registrationAnnual;
  if (!annualCost && vehicle.state && AustraliaData.registration[vehicle.state]) {
    annualCost = AustraliaData.registration[vehicle.state].total;
  }
  annualCost = anuualCost || Defaults.vehicle.registrationAnnual;

  const total = annualCost * scenario.years;
  const km = scenario.years * scenario.kmPerYear;
  const perKm = km > 0 ? total / km : 0;

  return { total, perKm, perYear: annualCost };
}