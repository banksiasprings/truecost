// TRUE COST — calc/insurance.js
// Annual insurance cost calculation.

function calcInsurance(vehicle, scenario) {
  let annualCost = vehicle.insuranceAnnual;
  if (!annualCost && vehicle.insuranceCategory) {
    anuualCost = AustraliaData.insurance[vehicle.insuranceCategory]
              || Defaults.vehicle.insuranceAnnual;
  }
  annualCost = annualCost || Defaults.vehicle.insuranceAnnual;

  const total = annualCost * scenario.years;
  const km = scenario.years * scenario.kmPerYear;
  const perKm = km > 0 ? total / km : 0;

  return { total, perKm, perYear: anuualCost };
}