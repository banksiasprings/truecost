// TRUE COST — calc/engine.js
// Master orchestrator. Takes vehicle + scenario, returns full cost breakdown.

/**
 * @param {Object} vehicle  - from data/model.js
 * @param {Object} scenario - { years, kmPerYear, opportunityCostRate, state }
 * @returns {Object} {
 *   summary: { totalOwnershipCost, costPerYear, costPerKm },
 *   total:   { depreciation, fuel, battery, tyres, registration, insurance,
 *              servicing, roadside, parking, tolls, lostCapital, financeInterest, finance },
 *   breakdown: { <category>: { total, perKm, perYear } }
 * }
 */
// Australian FY2025-26 tax brackets (resident individual)
const AU_TAX_BRACKETS = [
  { min: 0,      max: 18200,  rate: 0    },
  { min: 18201,  max: 45000,  rate: 0.16 },
  { min: 45001,  max: 135000, rate: 0.30 },
  { min: 135001, max: 190000, rate: 0.37 },
  { min: 190001, max: Infinity, rate: 0.45 },
];
const MEDICARE_LEVY = 0.02;

// ATO residual-value percentages for novated leases (TD 2021/6)
const ATO_RESIDUAL_PCT = { 12: 65.63, 24: 56.25, 36: 46.88, 48: 37.50, 60: 28.13 };

// FBT exemption: BEVs under LCT threshold are FBT-exempt (PHEVs lost exemption Apr 2025)
const LCT_THRESHOLD_FY2627 = 91387;

/** Calculate total income tax (including Medicare levy) on a given taxable income */
function calcTaxOnIncome(taxableIncome) {
  let tax = 0;
  for (const b of AU_TAX_BRACKETS) {
    if (taxableIncome <= 0) break;
    const span = Math.min(taxableIncome, b.max - b.min + 1);
    if (span > 0) {
      tax += span * b.rate;
      taxableIncome -= span;
    }
  }
  return tax;
}

/**
 * Calculate novated-lease salary-sacrifice savings.
 * Returns { annualLeaseCost, preTaxDeduction, taxSavedPerYear, fbtPerYear,
 *           netAnnualBenefit, totalBenefit, isFbtExempt, fbtNote }
 */
function calcNovatedLeaseSaving(vehicle, scenario) {
  const salary = vehicle.annualSalary || 0;
  if (salary <= 0) return null;

  const price = vehicle.onRoadCost || vehicle.purchasePrice || 0;
  const termMonths = vehicle.loanTermMonths || 60;
  const termYears  = termMonths / 12;
  const residualPct = vehicle.residualPct || (ATO_RESIDUAL_PCT[termMonths] || 28.13);
  const residualVal = price * (residualPct / 100);

  // Annual lease payment (simplified: spread net cost evenly, no interest — 
  // real novated leases bundle running costs, but we keep it to purchase cost here)
  const annualLeaseCost = (price - residualVal) / termYears;

  // Running costs bundled into pre-tax (rego, insurance, servicing, fuel estimate)
  const annualRunning = (vehicle.registrationAnnual || 0)
    + (vehicle.insuranceAnnual || 0)
    + ((vehicle.serviceCostPerService || 350) * 12 / (vehicle.serviceIntervalMonths || 12));

  const preTaxDeduction = annualLeaseCost + annualRunning;

  // Tax without novated lease
  const taxWithout = calcTaxOnIncome(salary) + salary * MEDICARE_LEVY;
  // Tax with novated lease (reduce taxable income by pre-tax deduction)
  const reducedSalary = Math.max(0, salary - preTaxDeduction);
  const taxWith = calcTaxOnIncome(reducedSalary) + reducedSalary * MEDICARE_LEVY;
  const taxSavedPerYear = taxWithout - taxWith;

  // FBT calculation
  const isBEV = vehicle.fuelType === 'electric';
  const isUnderLCT = price < LCT_THRESHOLD_FY2627;
  const isFbtExempt = isBEV && isUnderLCT;

  let fbtPerYear = 0;
  let fbtNote = '';
  if (isFbtExempt) {
    fbtNote = 'BEV under LCT threshold — FBT exempt';
  } else {
    // Statutory formula method: 20% of base value × grossed-up × FBT rate 47%
    const fbtBase = price * 0.20;
    const grossUpRate = 2.0802; // Type 1 (GST-inclusive)
    fbtPerYear = fbtBase * grossUpRate * 0.47;
    if (isBEV && !isUnderLCT) {
      fbtNote = 'BEV over LCT threshold ($' + Math.round(LCT_THRESHOLD_FY2627).toLocaleString() + ') — FBT applies';
    } else if (vehicle.fuelType === 'phev') {
      fbtNote = 'PHEV — FBT exemption ended Apr 2025';
    } else {
      fbtNote = 'FBT applies (statutory formula)';
    }
  }

  const netAnnualBenefit = taxSavedPerYear - fbtPerYear;
  const years = Math.min(scenario.years, termYears);
  const totalBenefit = netAnnualBenefit * years;

  return {
    annualLeaseCost,
    annualRunning,
    preTaxDeduction,
    taxSavedPerYear,
    fbtPerYear,
    netAnnualBenefit,
    totalBenefit,
    isFbtExempt,
    fbtNote,
    residualVal,
    residualPct,
    termYears,
  };
}

function calculateCosts(vehicle, scenario) {
  const km = scenario.years * scenario.kmPerYear;

  // Individual cost modules
  const depreciation = calcDepreciation(vehicle, scenario);
  const fuel         = calcFuel(vehicle, scenario);
  const battery      = calcBattery(vehicle, scenario);

  // Tyres
  const tyreSets      = km / (vehicle.tyreLifeKm || 45000);
  const tyreCostTotal = tyreSets * (vehicle.tyreCostPerSet || 900);
  const tyresPerKm    = km > 0 ? tyreCostTotal / km : 0;
  const tyresPerYear  = scenario.years > 0 ? tyreCostTotal / scenario.years : 0;

  // Registration
  const registration = calcRegistration(vehicle, scenario);

  // Insurance
  const insurance = calcInsurance(vehicle, scenario);

  // Servicing — "whichever comes first": km trigger or time trigger, use whichever fires more often
  // Math.max gives the larger service count, i.e. the earlier-firing trigger.
  // If only one interval is set the other contributes 0, so max() still does the right thing.
  const _byKm     = vehicle.serviceIntervalKm     > 0 ? km / vehicle.serviceIntervalKm                        : 0;
  const _byMonths = vehicle.serviceIntervalMonths > 0 ? (scenario.years * 12) / vehicle.serviceIntervalMonths : 0;
  const servicesCount   = Math.max(_byKm, _byMonths);
  const servicingTotal  = servicesCount * (vehicle.serviceCostPerService || 350);
  const servicingPerKm  = km > 0 ? servicingTotal / km : 0;
  const servicingPerYear = scenario.years > 0 ? servicingTotal / scenario.years : 0;

  // Stamp duty — one-off upfront cost, part of true total cost of ownership.
  // EVs receive state-specific concessions (ACT exempt, QLD 2%, VIC 4.2%, etc.)
  const _stampDutyResult = (typeof calculateStampDuty === 'function' && vehicle.state && vehicle.purchasePrice)
    ? calculateStampDuty(vehicle.state, vehicle.purchasePrice, vehicle.fuelType)
    : { duty: 0, savedVsStandard: 0, hasEvConcession: false, note: '' };
  const stampDutyTotal  = _stampDutyResult.duty;
  const stampDutyPerKm  = km > 0 ? stampDutyTotal / km : 0;
  const stampDutyPerYear = scenario.years > 0 ? stampDutyTotal / scenario.years : 0;

  // Unexpected repair reserve — scales with vehicle age + odometer at purchase.
  // Used vehicles only. Formula: $80/yr per year of age + $7 per 1,000km over 30,000km.
  // Represents the statistical likelihood of unscheduled repairs (not catastrophic failure —
  // that can cost far more and is called out in the disclaimer).
  const _currentYear = new Date().getFullYear();
  const _ageAtPurchase = Math.max(0, _currentYear - (vehicle.year || _currentYear));
  const _odoKm = vehicle.purchaseOdometer || 0;
  const _isUsed = (vehicle.condition || 'used') === 'used';
  let repairReservePerYear = 0;
  if (_isUsed) {
    const _ageFactor = _ageAtPurchase * 80;
    const _odoFactor = Math.max(0, (_odoKm - 30000) / 1000) * 7;
    repairReservePerYear = Math.min(4500, _ageFactor + _odoFactor);
  }
  const repairReserveTotal  = repairReservePerYear * scenario.years;
  const repairReservePerKm  = km > 0 ? repairReserveTotal / km : 0;

  // Roadside assistance
  const roadsideTotal = (vehicle.roadsideAssistance || 0) * scenario.years;
  const roadsidePerKm = km > 0 ? roadsideTotal / km : 0;
  const roadsidePerYear = vehicle.roadsideAssistance || 0;

  // Parking & tolls
  const parkingTotal  = (vehicle.parkingAnnual || 0) * scenario.years;
  const tollsTotal    = (vehicle.tollsAnnual   || 0) * scenario.years;
  const parkingPerKm  = km > 0 ? parkingTotal / km : 0;
  const tollsPerKm    = km > 0 ? tollsTotal   / km : 0;

  // Lost capital (opportunity cost on cash outlay only)
  // When financed, only the cash portion (price minus loan) has opportunity cost;
  // the borrowed portion's cost is already captured in financeInterest.
  const oppRate          = (scenario.opportunityCostRate || 4.5) / 100;
  const onRoadCost       = vehicle.onRoadCost || vehicle.purchasePrice;
  const cashOutlay       = (vehicle.financed && vehicle.loanAmount > 0)
    ? Math.max(0, onRoadCost - vehicle.loanAmount)
    : onRoadCost;
  const lostCapitalPerYear = cashOutlay * oppRate;
  const lostCapitalTotal   = lostCapitalPerYear * scenario.years;
  const lostCapitalPerKm   = km > 0 ? lostCapitalTotal / km : 0;

  // Finance costs — supports car loan, chattel mortgage, and novated lease
  let financeTotal = 0;
  let financePerKm = 0;
  let financePerYear = 0;
  let novatedMeta = null;
  let gstCredit = 0;
  const fType = vehicle.financeType || (vehicle.financed ? 'loan' : 'none');

  if (fType === 'loan' || fType === 'chattel') {
    const loanAmt = vehicle.loanAmount || 0;
    if (loanAmt > 0) {
      const monthlyRate = (vehicle.interestRate / 100) / 12;
      const n = vehicle.loanTermMonths || 60;
      if (monthlyRate > 0) {
        const monthlyPayment = loanAmt * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n));
        financeTotal = (monthlyPayment * n) - loanAmt;
      }
    }
    // Chattel mortgage: ABN holders can claim GST credit on purchase price (~9.09%)
    if (fType === 'chattel' && vehicle.hasABN) {
      gstCredit = (vehicle.purchasePrice || 0) / 11; // GST component
    }
    financePerKm  = km > 0 ? financeTotal / km : 0;
    financePerYear = scenario.years > 0 ? financeTotal / scenario.years : 0;
  } else if (fType === 'novated') {
    novatedMeta = calcNovatedLeaseSaving(vehicle, scenario);
    // For novated lease, "finance cost" is the lease payments minus the tax benefit
    if (novatedMeta) {
      const leaseYears = Math.min(scenario.years, novatedMeta.termYears);
      financeTotal = (novatedMeta.annualLeaseCost * leaseYears) - novatedMeta.totalBenefit;
      if (financeTotal < 0) financeTotal = 0; // benefit exceeds lease cost
    }
    financePerKm  = km > 0 ? financeTotal / km : 0;
    financePerYear = scenario.years > 0 ? financeTotal / scenario.years : 0;
  }

  // Grand totals
  const grandTotal = depreciation.total + fuel.total + battery.total
    + tyreCostTotal + registration.total + insurance.total
    + servicingTotal + roadsideTotal + parkingTotal + tollsTotal
    + lostCapitalTotal + financeTotal + repairReserveTotal + stampDutyTotal
    - gstCredit;
  const costPerKm  = km > 0 ? grandTotal / km : 0;
  const costPerYear = scenario.years > 0 ? grandTotal / scenario.years : 0;

  return {
    // Top-level summary (UI-facing)
    summary: {
      totalOwnershipCost: grandTotal,
      costPerYear,
      costPerKm,
    },
    // Per-category totals (UI-facing — flat numbers)
    total: {
      depreciation:    depreciation.total,
      fuel:            fuel.total,
      battery:         battery.total,
      tyres:           tyreCostTotal,
      registration:    registration.total,
      insurance:       insurance.total,
      servicing:       servicingTotal,
      roadside:        roadsideTotal,
      parking:         parkingTotal,
      tolls:           tollsTotal,
      lostCapital:     lostCapitalTotal,
      financeInterest: financeTotal,
      finance:         financeTotal,   // alias used in detail.js
      gstCredit:       gstCredit,
      repairReserve:   repairReserveTotal,
      stampDuty:       stampDutyTotal,
    },
    // Full per-category breakdown with perKm / perYear
    breakdown: {
      depreciation:    { total: depreciation.total,  perKm: depreciation.perKm,  perYear: depreciation.perYear },
      fuel:            { total: fuel.total,           perKm: fuel.perKm,          perYear: fuel.perYear },
      battery:         { total: battery.total,        perKm: battery.perKm,       perYear: battery.perYear },
      tyres:           { total: tyreCostTotal,        perKm: tyresPerKm,          perYear: tyresPerYear },
      registration:    { total: registration.total,  perKm: registration.perKm,  perYear: registration.perYear },
      insurance:       { total: insurance.total,     perKm: insurance.perKm,     perYear: insurance.perYear },
      servicing:       { total: servicingTotal,      perKm: servicingPerKm,      perYear: servicingPerYear },
      roadside:        { total: roadsideTotal,       perKm: roadsidePerKm,       perYear: roadsidePerYear },
      parking:         { total: parkingTotal,        perKm: parkingPerKm,        perYear: vehicle.parkingAnnual || 0 },
      tolls:           { total: tollsTotal,          perKm: tollsPerKm,          perYear: vehicle.tollsAnnual   || 0 },
      lostCapital:     { total: lostCapitalTotal,    perKm: lostCapitalPerKm,    perYear: lostCapitalPerYear },
      financeInterest: { total: financeTotal,        perKm: financePerKm,        perYear: financePerYear },
      repairReserve:   { total: repairReserveTotal,  perKm: repairReservePerKm,  perYear: repairReservePerYear },
      stampDuty:       { total: stampDutyTotal,       perKm: stampDutyPerKm,      perYear: stampDutyPerYear },
    },
    // Extra metadata for the disclaimer and detail view
    meta: {
      isUsed: _isUsed,
      vehicleAgeAtPurchase: _ageAtPurchase,
      purchaseOdometer: _odoKm,
      repairReservePerYear,
      stampDuty: _stampDutyResult,
      novated: novatedMeta,
      financeType: fType,
      gstCredit,
    },
  };
}

// Formatting utilities
function fmtAUD(amount) {
  return '$' + Math.round(amount).toLocaleString('en-AU');
}
function fmtPerKm(perKm) {
  return (perKm * 100).toFixed(1) + 'c/km';
}
