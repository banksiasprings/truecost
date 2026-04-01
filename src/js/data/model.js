// TRUE COST — model.js
// Vehicle schema and factory. See docs/data-model.md

function createVehicle(overrides = {}) {
  const now = new Date().toISOString();
  const id = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "v" + Date.now() + Math.random().toString(36).slice(2);

  const defaults = {
    id, createdAt: now, updatedAt: now, notes: "",
    make: "", model: "", year: new Date().getFullYear(), variant: "",
    bodyType: "sedan", fuelType: "petrol", engineSize: null, transmission: "auto", driveType: null, doors: null, seats: null, colour: null, ancap: null, cylinders: null,
    listPrice: 0, purchasePrice: 0, isNew: false, purchaseOdometer: 0,
    condition: "used", state: "QLD",
    stampDuty: 0, ctpInsurance: 0, dealerDelivery: 0, onRoadCost: 0,
    resaleValue1yr: 0, resaleValue3yr: 0, resaleValue5yr: 0,
    resaleValue10yr: 0, resaleAt100k: 0, resaleAt200k: 0,
    fuelConsumption: 8.5, fuelConsumptionCity: 0, fuelConsumptionHighway: 0,
    fuelPricePerLitre: 189,
    evRangeKm: 0, evBatteryKwh: 0, evConsumptionKwh: 18, evHomePercent: 80, evHomeRate: 0.30, evPublicPercent: 20, evPublicRate: 0.45,
    evChargingTariff: 30, evPublicChargingPct: 20, evPublicTariff: 60,
    phevElectricRangeKm: 0, phevElectricPct: 40,
    batteryReplacementCost: 15000, batteryWarrantyCycles: 0, batteryExpectedKm: 250000,
    registrationAnnual: 689, insuranceAnnual: 1400, insuranceCategory: "standard",
    serviceIntervalKm: 10000, serviceIntervalMonths: 12, serviceCostPerService: 350,
    serviceType: "independent", tyreCostPerSet: 900, tyreLifeKm: 45000,
    roadsideAssistance: 120, parkingAnnual: 0, tollsAnnual: 0,
    financed: false, loanAmount: 0, interestRate: 7.5, loanTermMonths: 60,
    scenarioYears: null, scenarioKm: null, opportunityCostRate: null,
    dataSource: "manual", redbookId: null,
  };

  const vehicle = { ...defaults, ...overrides };
  if (vehicle.purchasePrice && !overrides.onRoadCost) {
    vehicle.onRoadCost = vehicle.purchasePrice + vehicle.stampDuty
                       + vehicle.ctpInsurance + vehicle.dealerDelivery;
  }
  return vehicle;
}

function validateVehicle(v) {
  const errors = [];
  if (!v.make || !v.make.trim()) errors.push("Make is required");
  if (!v.model || !v.model.trim()) errors.push("Model is required");
  const maxYear = new Date().getFullYear() + 2;
  if (!v.year || v.year < 1950 || v.year > maxYear)
    errors.push("Year must be 1950 to " + maxYear);
  if (!v.purchasePrice || v.purchasePrice <= 0)
    errors.push("Purchase price is required");
  if (v.fuelType === "electric") {
    if (!v.evBatteryKwh) errors.push("Battery kWh required for EVs");
    if (!v.evRangeKm) errors.push("Range km required for EVs");
  } else {
    if (!v.fuelConsumption || v.fuelConsumption <= 0)
      errors.push("Fuel consumption is required");
  }
  return errors;
}

function vehicleLabel(v) {
  if (!v) return "Unknown";
  const parts = [v.year, v.make, v.model].filter(Boolean);
  if (v.variant) parts.push(v.variant);
  return parts.join(" ");
}

function fuelBadgeClass(ft) {
  return { electric:"badge-ev", hybrid:"badge-hybrid", phev:"badge-hybrid",
           diesel:"badge-diesel", petrol:"badge-petrol", lpg:"badge-petrol" }[ft] || "badge-petrol";
}

function fuelTypeLabel(ft) {
  return { electric:"EV", hybrid:"Hybrid", phev:"PHEV",
           diesel:"Diesel", petrol:"Petrol", lpg:"LPG" }[ft] || ft;
}
