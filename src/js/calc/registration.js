// TRUE COST - calc/registration.js
// Annual registration cost calculation based on state and vehicle parameters.
function calcRegistration(vehicle, scenario) {
  let annualCost = 0;

  // Always prefer state-based calculation — gives accurate cylinder/weight rates
  // and ensures existing vehicles with stored defaults get recalculated properly.
  if (vehicle.state) {
    const calculated = calculateStateRegistration(vehicle.state, vehicle.cylinders, vehicle.tarenWeightKg);
    if (calculated && calculated.total > 0) {
      annualCost = calculated.total;
    }
  }

  // If no state calc available, fall back to stored value / live rates / defaults
  if (!annualCost) {
    annualCost = vehicle.registrationAnnual
      || (window.LiveRates && window.LiveRates.registration && vehicle.state
          && window.LiveRates.registration[vehicle.state]
          && window.LiveRates.registration[vehicle.state].total)
      || Defaults.vehicle.registrationAnnual;
  }

  annualCost = annualCost || Defaults.vehicle.registrationAnnual;

  const total = annualCost * scenario.years;
  const km = scenario.years * scenario.kmPerYear;
  const perKm = km > 0 ? total / km : 0;
  return { total, perKm, perYear: annualCost };
}
