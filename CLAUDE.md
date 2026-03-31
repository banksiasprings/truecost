# TRUE COST — Vehicle Comparison App
## ALWAYS READ THIS FILE FIRST BEFORE DOING ANY WORK

---

## Project Overview
**App:** TRUE COST — Australia's most comprehensive vehicle total cost of ownership (TCO) calculator
**Tagline:** "Know what your car actually costs."
**Type:** Progressive Web App (PWA) — mobile-first, installable, works offline
**Owner:** Steven McNichol (smcnichol@outlook.com)
**Location:** ~/Documents/truecost/
**GitHub:** TBD — will be banksiasprings/truecost or similar
**Live URL:** TBD — GitHub Pages

---

## Why This App Exists
Steven built a detailed car comparison spreadsheet in 2014 that compared 5 vehicles (incl. EVs)
across 20+ real cost dimensions. Most car comparison tools only show sticker price.
This app productises that methodology for all Australians. Full proposal: docs/TrueCost_App_Proposal.docx

---

## Architecture Philosophy (READ THIS CAREFULLY)
The app is intentionally built in 3 separated layers so each can be changed independently:

### Layer 1 — Calculation Engine (src/js/calc/)
- Pure JavaScript functions, NO DOM access, NO UI dependencies
- Takes a vehicle object, returns a cost breakdown object
- Fully unit testable in isolation
- Changes here NEVER affect UI structure
- Files: engine.js, depreciation.js, fuel.js, battery.js, registration.js, insurance.js

### Layer 2 — Data / Storage (src/js/data/)
- Vehicle data model (schema)
- IndexedDB read/write operations
- Default values and Australian reference data (fuel prices, rego tables)
- API response normalisation
- Files: model.js, storage.js, defaults.js, australia.js

### Layer 3 — UI / Rendering (src/js/ui/)
- Reads from data layer, calls calc layer, renders results
- NEVER contains business logic or calculations
- All DOM manipulation lives here
- Files: app.js, vehicle-card.js, comparison.js, charts.js, forms.js, router.js

### Styling (src/css/)
- theme.css: ALL design tokens as CSS variables — swap this ONE file to completely retheme
- layout.css: structural/layout rules only — grid, flex, positioning
- components.css: component-specific rules referencing theme variables only
- RULE: layout.css and components.css NEVER contain colour values — only var(--xxx) references

---

## Design System
**Brand:** Earthy, Hipcamp-inspired (same as mcnichol-invoices app)
**Primary green:** #2D5016 (dark olive)
**Accent orange:** #E8572A (terracotta)
**Background:** #FAFAF8 (warm off-white)
**Text:** #1C1C1E
**Cards:** white with box-shadow: 0 2px 8px rgba(0,0,0,0.10)
**Border radius:** 14px on cards, 999px on pills, 12px on buttons
**Font:** system-ui, -apple-system (fast, native feel)

To completely retheme: edit ONLY src/css/theme.css — all other files use var() references.

---

## Project Structure
truecost/
├── CLAUDE.md                ← YOU ARE HERE — read before anything else
├── CHANGELOG.md             ← Every change logged with date and reason
├── README.md                ← Public-facing description
├── docs/
│   ├── TrueCost_App_Proposal.docx   ← Full feature & architecture proposal
│   ├── data-model.md        ← Vehicle object schema reference
│   ├── calc-engine.md       ← How each cost calculation works
│   └── api-sources.md       ← Data sources and API integration notes
├── design/
│   ├── design-system.md     ← Colours, typography, component specs
│   └── mockups/             ← Screen mockups and wireframes
├── src/
│   ├── index.html           ← Single HTML file, app shell only
│   ├── manifest.json        ← PWA manifest
│   ├── sw.js                ← Service worker (offline/caching)
│   ├── css/
│   │   ├── theme.css        ← ★ SWAP THIS FILE TO RETHEME ★
│   │   ├── layout.css       ← Structure only, no colours
│   │   └── components.css   ← Component rules, uses var() only
│   ├── js/
│   │   ├── calc/            ← Pure calculation functions (no UI)
│   │   │   ├── engine.js    ← Master orchestrator
│   │   │   ├── depreciation.js
│   │   │   ├── fuel.js
│   │   │   ├── battery.js
│   │   │   ├── registration.js
│   │   │   └── insurance.js
│   │   ├── data/            ← Data model and storage
│   │   │   ├── model.js     ← Vehicle schema
│   │   │   ├── storage.js   ← IndexedDB operations
│   │   │   ├── defaults.js  ← Australian default values
│   │   │   └── australia.js ← State rego tables, fuel defaults
│   │   ├── ui/              ← UI rendering (no logic)
│   │   │   ├── app.js       ← App init and routing
│   │   │   ├── vehicle-card.js
│   │   │   ├── comparison.js
│   │   │   ├── charts.js
│   │   │   ├── forms.js
│   │   │   └── router.js
│   │   └── api/             ← External data integrations
│   │       ├── redbook.js
│   │       ├── fuel-prices.js
│   │       └── greenguide.js
│   └── assets/
│       └── icons/           ← PWA icons
├── tests/
│   └── calc/                ← Unit tests for calculation engine
└── .github/                 ← GitHub Actions (future CI)

---

## Development Phases (from proposal)
- [x] Phase 0 — Project setup and documentation (CURRENT)
- [ ] Phase 1 — Core data model + calculation engine + manual input forms
- [ ] Phase 2 — Side-by-side comparison engine + Chart.js visualisations
- [ ] Phase 3 — Australian data integration (rego tables, live fuel prices)
- [ ] Phase 4 — EV deep dive (battery degradation, charging cost split)
- [ ] Phase 5 — Export & share (PDF, shareable links)
- [ ] Phase 6 — Polish & launch (onboarding, PWA store listing)

---

## Current Status
Phase 0 complete — project structure created, documentation written.
Next: Begin Phase 1 — data model schema (data/model.js) and calculation engine (calc/engine.js)

---

## Key Decisions Already Made
1. PWA (not native app) — same as mcnichol-invoices, proven approach
2. Vanilla JS — no framework, faster load, easier to maintain solo
3. IndexedDB for storage — local only, no backend, no accounts needed
4. CSS variables for all theming — one file swap = complete retheme
5. Calculation engine as pure functions — no UI coupling, fully testable
6. Up to 4 vehicles compared side by side
7. All costs output as: $/km, $/year, total over period
8. Australian-first: all state rego tables, AUD, AU fuel types

---

## Reference: Original 2014 Spreadsheet Vehicles
Used to validate the calculation engine outputs:
- 2012 Nissan Leaf (Electric) — 5yr/100k = $22,493 ✓
- 2000 Honda Civic (Unleaded) — 5yr/100k = $21,031 ✓
- 2014 Mitsubishi Outlander (Unleaded) — 5yr/100k = $35,924 ✓
- 2015 BMW i3 (Electric) — 5yr/100k = $44,214 ✓
- 2013 Toyota Prado (Diesel) — 5yr/100k = $45,384 ✓

When calculation engine is complete, run these as integration tests to verify accuracy.

---

## Related Projects
- mcnichol-invoices: ~/Documents/mcnichol-invoices — sister PWA, same tech stack
  Use as reference for: PWA shell, service worker pattern, IndexedDB usage, CSS design system

