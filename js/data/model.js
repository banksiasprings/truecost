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
    bodyType: "sedan", fuelType: "petrol", engineSize: null, transmission: "auto", driveType: null, doors: null, seats: null, colour: null, ancap: null, cylinders: null, tarenWeightKg: null,
    listPrice: 0, purchasePrice: 0, isNew: false, purchaseOdometer: 0,
    condition: "used", state: "QLD",
    stampDuty: 0, ctpInsurance: 0, dealerDelivery: 0, onRoadCost: 0,
    resaleValue1yr: 0, resaleValue3yr: 0, resaleValue5yr: 0,
    resaleValue10yr: 0, resaleAt100k: 0, resaleAt200k: 0,
    fuelConsumption: 8.5, fuelConsumptionCity: 0, fuelConsumptionHighway: 0,
    fuelPricePerLitre: 205,
    evRangeKm: 0, evBatteryKwh: 0, evConsumptionKwh: 18, evHomePercent: 80, evHomeRate: 0.30, evPublicPercent: 20, evPublicRate: 0.45,
    evChargingTariff: 30, evPublicChargingPct: 20, evPublicTariff: 60,
    phevElectricRangeKm: 0, phevElectricPct: 40,
    batteryReplacementCost: 15000, batteryWarrantyCycles: 0, batteryExpectedKm: 250000,
    registrationAnnual: 689, insuranceAnnual: 1400, insuranceCategory: "standard", driverAge: null,
    serviceIntervalKm: 10000, serviceIntervalMonths: 12, serviceCostPerService: 350,
    serviceType: "independent", tyreCostPerSet: 900, tyreLifeKm: 45000,
    roadsideAssistance: 120, parkingAnnual: 0, tollsAnnual: 0,
    financed: false, financeType: 'none', loanAmount: 0, interestRate: 7.5, loanTermMonths: 60, residualPct: 28.13, annualSalary: 0, hasABN: false,
    scenarioYears: null, scenarioKm: null, opportunityCostRate: null,
    dataSource: "manual", redbookId: null,
  };

  const vehicle = { ...defaults, ...overrides };

  // Apply fuel-type-specific service defaults (only if not explicitly overridden)
  if (vehicle.fuelType === 'electric') {
    // Real AU EV service data (2026): BYD 20k/12m @~$330/yr, Kia 30k/24m @~$276/yr,
    // Hyundai 30k/24m @~$232/yr, Tesla ~$200/yr owner-reported. Generic default uses
    // 20k/12m ("whichever first") at $300/service — at 15k/yr the annual trigger wins
    // giving ~5 services/5yr = $1,500, close to BYD ($1,200–1,400) and Kia ($1,382).
    if (!overrides.serviceIntervalKm)      vehicle.serviceIntervalKm      = 20000;  // 20,000 km or...
    if (!overrides.serviceIntervalMonths)  vehicle.serviceIntervalMonths  = 12;     // ...12 months (whichever first)
    if (!overrides.serviceCostPerService)  vehicle.serviceCostPerService  = 300;    // ~$300/service AU avg
  }
  // Hybrids/PHEVs retain ICE service schedule (still have combustion engines)

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
