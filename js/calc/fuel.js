// TRUE COST - calc/fuel.js
// Pure functions for fuel / energy cost calculation.
// Uses window.LiveRates when available, falls back to vehicle values then AustraliaData.

function _fuelDefault(key, fallback) {
  if (window.LiveRates && window.LiveRates.fuel && window.LiveRates.fuel[key] !== undefined) {
    return window.LiveRates.fuel[key];
  }
  return fallback;
}

function calcFuel(vehicle, scenario) {
  const km = scenario.years * scenario.kmPerYear;
  let costPerKm = 0;

  if (vehicle.fuelType === "electric") {
    // EV: blend home and public charging. New $/kWh fields take priority.
    const homePct  = (vehicle.evHomePercent  !== undefined ? vehicle.evHomePercent  : (100 - (vehicle.evPublicChargingPct || 0))) / 100;
    const pubPct   = (vehicle.evPublicPercent !== undefined ? vehicle.evPublicPercent : (vehicle.evPublicChargingPct || 0)) / 100;
    let homeRate, pubRate;
    if (vehicle.evHomeRate !== undefined) {
      homeRate = vehicle.evHomeRate;        // $/kWh
      pubRate  = vehicle.evPublicRate !== undefined ? vehicle.evPublicRate : 0.45;
    } else {
      homeRate = (vehicle.evChargingTariff  || _fuelDefault("evHomeRate",   AustraliaData.fuel.evHomeRate))  / 100;
      pubRate  = (vehicle.evPublicTariff    || _fuelDefault("evPublicRate", AustraliaData.fuel.evPublicRate)) / 100;
    }
    const effectiveRate = (homePct * homeRate) + (pubPct * pubRate); // $/kWh
    // Derive consumption from battery/range if explicit value not set
    const derivedKwh  = (vehicle.evBatteryKwh && vehicle.evRangeKm)
      ? (vehicle.evBatteryKwh / vehicle.evRangeKm * 100)
      : 18;
    const consumption = vehicle.evConsumptionKwh || derivedKwh;      // kWh/100km
    costPerKm = (consumption / 100) * effectiveRate;                 // AUD/km

  } else if (vehicle.fuelType === "phev") {
    // PHEV: blend electric and petrol legs using new $/kWh fields
    const elecFraction   = (vehicle.phevElectricPct || 50) / 100;
    const petrolFraction = 1 - elecFraction;
    const hPct = (vehicle.evHomePercent   !== undefined ? vehicle.evHomePercent   : (100 - (vehicle.evPublicChargingPct || 0))) / 100;
    const pPct = (vehicle.evPublicPercent !== undefined ? vehicle.evPublicPercent : (vehicle.evPublicChargingPct || 0)) / 100;
    let hRate, pRate;
    if (vehicle.evHomeRate !== undefined) {
      hRate = vehicle.evHomeRate;
      pRate = vehicle.evPublicRate !== undefined ? vehicle.evPublicRate : 0.45;
    } else {
      hRate = (vehicle.evChargingTariff || _fuelDefault("evHomeRate",   AustraliaData.fuel.evHomeRate))  / 100;
      pRate = (vehicle.evPublicTariff   || _fuelDefault("evPublicRate", AustraliaData.fuel.evPublicRate)) / 100;
    }
    const blendedEv   = (hPct * hRate) + (pPct * pRate); // $/kWh
    const derivedPhev = (vehicle.evBatteryKwh && vehicle.evRangeKm)
      ? (vehicle.evBatteryKwh / vehicle.evRangeKm * 100)
      : 18;
    const evConsump   = vehicle.evConsumptionKwh || derivedPhev;
    const evCostPerKm = (evConsump / 100) * blendedEv;
    const fuelPrice = vehicle.fuelPricePerLitre || _fuelDefault("ulp91", AustraliaData.fuel.unleaded);
    const petrolCostPerKm = (vehicle.fuelConsumption / 100) * (fuelPrice / 100);
    costPerKm = (elecFraction * evCostPerKm) + (petrolFraction * petrolCostPerKm);

  } else {
    // ICE: petrol, diesel, hybrid, lpg
    let defaultPrice;
    if (vehicle.fuelType === "diesel") {
      defaultPrice = _fuelDefault("diesel", AustraliaData.fuel.diesel);
    } else if (vehicle.fuelType === "lpg") {
      defaultPrice = _fuelDefault("lpg", AustraliaData.fuel.lpg);
    } else {
      defaultPrice = _fuelDefault("ulp91", AustraliaData.fuel.unleaded);
    }
    const pricePerL = vehicle.fuelPricePerLitre || defaultPrice;
    // fuelConsumption = L/100km, pricePerL = cents/L
    costPerKm = (vehicle.fuelConsumption / 100) * (pricePerL / 100);
  }

  const total   = costPerKm * km;
  const perYear = costPerKm * scenario.kmPerYear;
  return { total, perKm: costPerKm, perYear };
}
