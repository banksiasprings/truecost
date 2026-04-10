// TRUE COST — calc/insurance.js
// Annual insurance cost calculation with optional age and state multipliers.
//
// Priority:
//   1. vehicle.insuranceAnnual — manually set or form-entered value (takes precedence)
//   2. Category-based estimate × state multiplier × age multiplier
//
// The form pre-fills insuranceAnnual using calculateInsuranceEstimate() when the user
// enters their driver age, so the multipliers are baked in at save time. This function
// also applies them dynamically in case the vehicle was saved without age adjustment.

function calcInsurance(vehicle, scenario) {
  let annualCost;

  if (vehicle.insuranceAnnual && vehicle.insuranceAnnual > 0) {
    // User-entered or form-calculated value — use as-is
    annualCost = vehicle.insuranceAnnual;
  } else {
    // Derive from category then apply state + age multipliers
    const base = (vehicle.insuranceCategory && AustraliaData.insurance[vehicle.insuranceCategory])
               || Defaults.vehicle.insuranceAnnual;
    annualCost = calculateInsuranceEstimate(base, vehicle.state, vehicle.driverAge);
  }

  annualCost = annualCost || Defaults.vehicle.insuranceAnnual;

  const total = annualCost * scenario.years;
  const km = scenario.years * scenario.kmPerYear;
  const perKm = km > 0 ? total / km : 0;

  return { total, perKm, perYear: annualCost };
}