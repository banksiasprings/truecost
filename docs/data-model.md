# TRUE COST — Vehicle Data Model

This document defines the schema for a Vehicle object as stored in IndexedDB.
All calculation functions take this object as input. Updated whenever the schema changes.

## Vehicle Object Schema (src/js/data/model.js)

id: String — UUID generated on creation
createdAt / updatedAt: ISO8601 timestamps
notes: String — free text

### Vehicle Identity
make, model, year, variant, bodyType, fuelType, engineSize, transmission

### Purchase
listPrice, purchasePrice, isNew, purchaseOdometer, condition, state (QLD|NSW|VIC|SA|WA|ACT|TAS|NT)

### On-Road Costs (auto from state tables, all overridable)
stampDuty, ctpInsurance, dealerDelivery, onRoadCost

### Depreciation
resaleValue1yr / 3yr / 5yr / 10yr
resaleAt100k / 200k

### Fuel / Energy
fuelConsumption (L/100km), fuelConsumptionCity, fuelConsumptionHighway
fuelPricePerLitre (cents/L)
evRangeKm, evBatteryKwh, evConsumptionKwh
evChargingTariff (cents/kWh home), evPublicChargingPct, evPublicTariff
phevElectricRangeKm, phevElectricPct

### EV Battery
batteryReplacementCost, batteryWarrantyCycles, batteryExpectedKm

### Annual Costs
registrationAnnual, insuranceAnnual, insuranceCategory (budget|standard|premium)
serviceIntervalKm, serviceIntervalMonths, serviceCostPerService, serviceType (dealer|independent)
tyreCostPerSet, tyreLifeKm
roadsideAssistance, parkingAnnual (optional), tollsAnnual (optional)

### Finance
financed (Boolean), loanAmount, interestRate (% p.a.), loanTermMonths

### Scenario
opportunityCostRate (% p.a., default 4.5%)
scenarioYears (default 5), scenarioKm (default 100000)

### Source
dataSource (manual|redbook|greenguide), redbookId

## Cost Breakdown Object (output of calc engine)
perKm: { depreciation, fuel, battery, tyres, registration, insurance, servicing, roadside, parking, tolls, lostCapital, financeInterest, total }
perYear: { same keys }
total: { same keys }
summary: { purchaseOutlay, totalOwnershipCost, costPerKm, costPerYear, bestCategory, worstCategory }
