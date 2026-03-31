# TRUE COST — Calculation Engine Reference

## Architecture Rule
All functions in src/js/calc/ are PURE FUNCTIONS.
Input: vehicle object (see data-model.md)
Output: number (AUD) or cost breakdown object
NO DOM access. NO storage calls. NO side effects.
Fully unit testable — see tests/calc/

## Validation: Original 2014 Spreadsheet
When engine is complete, verify these outputs (5yr / 100,000km scenario):
- 2012 Nissan Leaf (Electric)        → ~2,493 total
- 2000 Honda Civic (Unleaded)        → ~1,031 total
- 2014 Mitsubishi Outlander (ULP)    → ~5,924 total
- 2015 BMW i3 (Electric)             → ~4,214 total
- 2013 Toyota Prado (Diesel)         → ~5,384 total

## Cost Calculations

### 1. Depreciation (calc/depreciation.js)
totalDepreciation = purchasePrice - resaleValueAtScenarioEnd
depreciationPerKm = totalDepreciation / scenarioKm
depreciationPerYear = totalDepreciation / scenarioYears

### 2. Fuel (calc/fuel.js)
Petrol/Diesel: fuelCostPerKm = (fuelConsumption / 100) * (fuelPricePerLitre / 100)
EV: chargeCostPerKm = (evConsumptionKwh / 100) * blendedTariff
  blendedTariff = (homeChargePct * evChargingTariff + publicChargePct * evPublicTariff) / 100
PHEV: blend electric and petrol cost by phevElectricPct

### 3. EV Battery (calc/battery.js)
batteryCostPerKm = batteryReplacementCost / batteryExpectedKm
replacementsInScenario = floor(scenarioKm / batteryExpectedKm)
totalBatteryCost = replacementsInScenario * batteryReplacementCost

### 4. Tyres (calc/tyres — inside engine.js)
tyreCostPerKm = tyreCostPerSet / tyreLifeKm
totalTyreCost = tyreCostPerKm * scenarioKm

### 5. Registration (calc/registration.js)
totalRegistration = registrationAnnual * scenarioYears
registrationPerKm = totalRegistration / scenarioKm

### 6. Insurance (calc/insurance.js)
totalInsurance = insuranceAnnual * scenarioYears
insurancePerKm = totalInsurance / scenarioKm

### 7. Servicing
servicesCount = scenarioKm / serviceIntervalKm
totalServicing = servicesCount * serviceCostPerService
servicingPerKm = totalServicing / scenarioKm

### 8. Lost Capital / Opportunity Cost
lostCapitalPerYear = onRoadCost * (opportunityCostRate / 100)
totalLostCapital = lostCapitalPerYear * scenarioYears
(This models the interest you would have earned investing that money instead)

### 9. Finance Interest
monthlyRate = interestRate / 12 / 100
monthlyRepayment = loanAmount * monthlyRate / (1 - (1+monthlyRate)^-loanTermMonths)
totalInterest = (monthlyRepayment * loanTermMonths) - loanAmount

## Australian Registration Tables (calc/registration.js)
State rego costs by vehicle category — update annually:
QLD: Light vehicle (under 4.5t) base ~50-400 + CTP varies by insurer
NSW: ~00 base + greenslip (CTP) ~00-700
VIC: ~00 combined (includes TAC levy)
[Full tables TBD — source: state revenue office websites]
