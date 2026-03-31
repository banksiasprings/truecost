// TRUE COST — calc/fuel.js
// Pure functions for fuel / energy cost calculation.

function calcFuel(vehicle, scenario) {
  const km = scenario.years * scenario.kmPerYear;

  let costPerKm = 0;

  if (vehicle.fuelType === 'electric') {
    // EV: blend home and public charging tariffs
    const homePct = (100 - vehicle.evPublicChargingPct) / 100;
    const pubPct = vehicle.evPublicChargingPct / 100;
    const blendedTariff = (homePct * vehicle.evChargingTariff + pubPct * vehicle.evPublicTariff); // cents/kWh
    // evConsumptionKwh is kWh/100km
    costPerKm = (vehicle.evConsumptionKwh / 100) * (blendedTariff / 100); // AUD/km

  } else if (vehicle.fuelType === 'phev') {
    // PHEV: blend electric and petrol legs
    const elecFraction = vehicle.phevElectricPct / 100;
    const petrolFraction = 1 - elecFraction;
    const homePct = (100 - vehicle.evPublicChargingPct) / 100;
    const pubPct = vehicle.evPublicChargingPct / 100;
    const blendedTariff = (homePct * vehicle.evChargingTariff + pubPct * vehicle.evPublicTariff);
    const evCostPerKm = (vehicle.evConsumptionKwh / 100) * (blendedTariff / 100);
    const petrolCostPerKm = (vehicle.fuelConsumption / 100) * (vehicle.fuelPricePerLitre / 100);
    costPerKm = (elecFraction * evCostPerKm) + (petrolFraction * petrolCostPerKm);

  } else {
    // ICE: petrol, diesel, hybrid, lpg
    // fuelConsumption = L/100km, fuelPricePerLitre = cents/L
    costPerKm = (vehicle.fuelConsumption / 100) * (vehicle.fuelPricePerLitre / 100);
  }

  const total = costPerKm * km;
  const perYear = costPerKm * scenario.kmPerYear;

  return { total, perKm: costPerKm, perYear };
}