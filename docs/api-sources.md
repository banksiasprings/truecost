# TRUE COST — Data Sources & API Integration

## URL-Based Listing Import (HIGH PRIORITY FEATURE)
Users paste a Carsales, Gumtree or Facebook Marketplace listing URL.
The app extracts: make, model, year, variant, price, odometer, fuel type, location/state.
This pre-populates the Add Vehicle form so the user just fills in running costs.

### Carsales
URL pattern: https://www.carsales.com.au/cars/details/[slug]/
Data available in page: make, model, year, price, odometer, fuel type, transmission, state
Approach: fetch URL via CORS proxy or Claude in Chrome, parse structured data (JSON-LD schema.org)
JSON-LD path: script[type=application/ld+json] → @type:Car

### Gumtree
URL pattern: https://www.gumtree.com.au/s-ad/[slug]/
Data in page: title (contains make/model/year), price, description
Approach: parse og:title, og:description meta tags + JSON-LD if present

### Facebook Marketplace
URL pattern: https://www.facebook.com/marketplace/item/[id]/
Challenge: requires login, heavy JS rendering, no public API
Approach: user pastes listing text manually (title + price), app parses it
Or: use Chrome extension integration to read currently open FB listing

### RedBook API (official)
Developer program at redbook.com.au
Returns: make/model/year lookup, list price, standard fuel consumption, vehicle specs
Best for: validating/enriching manually entered vehicle data

### GreenVehicleGuide.gov.au
Australian Government database of new vehicle fuel consumption and emissions
URL: https://www.greenvehicleguide.gov.au/
Free to access — no API key required for basic queries
Returns: official combined L/100km, CO2 g/km for new vehicles

### Live Fuel Prices
NSW FuelCheck API: https://api.nsw.gov.au/api/fuelcheck/v2/fuel/prices/bylocation
WA FuelWatch: http://www.fuelwatch.wa.gov.au/fuelwatch/pages/public/homePage.jspx (RSS)
Fallback: hardcoded sensible defaults (update quarterly)
Default: 195c/L 91 unleaded, 210c/L 98 premium, 200c/L diesel, 30c/kWh electricity

## Implementation Priority
1. Manual input (Phase 1) — no APIs needed
2. URL import — Carsales JSON-LD parsing (Phase 3)
3. Live fuel prices — NSW FuelCheck (Phase 3)
4. RedBook lookup (Phase 3)
5. Gumtree/FB Marketplace (Phase 4+)
