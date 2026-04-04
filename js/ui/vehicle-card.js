// TRUE COST — ui/vehicle-card.js  (Neon Blue Edition)
const VehicleCard = {

  // Cost bar colours matching the mockup
  BAR_COLORS: {
    'Depreciation': '#1877F2',
    'Fuel / Energy': '#34C759',
    'Registration':  '#FF9500',
    'Insurance':     '#FF3B30',
    'Servicing':     '#AF52DE',
    'Tyres':         '#5AC8FA',
    'Lost capital':  '#FF6B35',
    'Roadside':      '#32ADE6',
    'Finance':       '#BF5AF2',
  },

  async renderList() {
    const vehicles = await getAllVehicles();
    const list  = document.getElementById('vehicle-list');
    const empty = document.getElementById('vehicles-empty');
    if (!list) return;

    if (vehicles.length === 0) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    const settings = App.settings || await getAllSettings();
    const scenario = {
      years:               settings.years || 5,
      kmPerYear:           settings.kmPerYear || 15000,
      opportunityCostRate: settings.opportunityCostRate || 4.5,
    };

    list.innerHTML = vehicles.map(v => {
      const costs = calculateCosts(v, scenario);
      return VehicleCard.cardHTML(v, costs, scenario);
    }).join('');

    // Wire delete buttons
    list.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        App.showConfirmModal('Delete this vehicle?', async () => {
          await deleteVehicle(btn.dataset.id);
          VehicleCard.renderList();
        });
      });
    });

    // Wire card tap → detail
    list.querySelectorAll('.vehicle-card').forEach(card => {
      card.addEventListener('click', () => Router.navigate('detail', { id: card.dataset.id }));
    });
  },

  cardHTML(v, costs, scenario) {
    const label    = vehicleLabel(v);
    const ftLabel  = fuelTypeLabel(v.fuelType);
    const ftBadge  = fuelBadgeClass(v.fuelType);
    const totalStr = fmtAUD(costs.summary.totalOwnershipCost);
    const perYrStr = fmtAUD(costs.summary.costPerYear);
    const perKmStr = fmtPerKm(costs.summary.costPerKm);
    const years    = (scenario && scenario.years) || (App.settings && App.settings.years) || 5;

    // Fuel type accent color for card border
    const fuelColors = { electric: '#1877F2', hybrid: '#34C759', phev: '#5AC8FA',
                         diesel: '#8D7F75', lpg: '#FF9500', petrol: '#FF6B35' };
    const borderColor = fuelColors[v.fuelType] || '#1877F2';

    return `
      <div class="card vehicle-card" data-id="${v.id}" style="cursor:pointer;border-left:4px solid ${borderColor};position:relative;overflow:visible">

        <!-- Header row: name + delete -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3)">
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--font-size-md);font-weight:800;color:var(--color-text);line-height:1.2;margin-bottom:4px">${label}</div>
            <span class="badge ${ftBadge}">${ftLabel}</span>
            ${v.purchasePrice ? `<span style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-left:6px">Paid ${fmtAUD(v.purchasePrice)}</span>` : ''}
          </div>
          ${ (() => { const _a = new Date().getFullYear() - (v.year || new Date().getFullYear()); const _o = v.purchaseOdometer || 0; return (_a >= 7 || _o >= 100000) ? '<div style="margin-top:4px"><span style="display:inline-block;padding:1px 7px;border-radius:8px;background:rgba(255,149,0,0.12);color:#CC7700;font-size:10px;font-weight:700">\u26A0 ' + (_a >= 7 ? _a + 'yr old' : Math.round(_o/1000) + 'k km') + ' \u2014 higher maintenance risk</span></div>' : ''; })() }
          <button class="btn btn-ghost btn-sm btn-delete-vehicle" data-id="${v.id}"
            style="color:var(--color-error);padding:4px;margin:-4px -4px 0 8px" aria-label="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>

        <!-- Total cost hero number -->
        <div style="text-align:center;padding:var(--space-4) 0 var(--space-3)">
          <div style="font-size:2.2rem;font-weight:900;color:var(--color-text);letter-spacing:-1px;line-height:1">${totalStr}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.05em">Total ${years}-year cost</div>
        </div>

        <!-- Per year / per km chips -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
          <div class="cost-chip">
            <div class="cost-chip-value">${perYrStr}</div>
            <div class="cost-chip-label">Per year</div>
          </div>
          <div class="cost-chip">
            <div class="cost-chip-value">${perKmStr}</div>
            <div class="cost-chip-label">Per km</div>
          </div>
        </div>

        <!-- Horizontal cost bars -->
        ${VehicleCard.costBars(costs)}

        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-3);text-align:right">
          Tap for full breakdown →
        </p>
      </div>`;
  },

  costBars(costs) {
    const rows = [
      ['Depreciation', costs.total.depreciation],
      ['Fuel / Energy', costs.total.fuel + costs.total.battery],
      ['Insurance',    costs.total.insurance],
      ['Registration', costs.total.registration],
      ['Servicing',    costs.total.servicing],
      ['Tyres',        costs.total.tyres],
      ['Lost capital', costs.total.lostCapital],
      ['Roadside',     costs.total.roadside   || 0],
      ['Finance',      costs.total.finance    || 0],
    ].filter(([, v]) => v > 0);

    const total = rows.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return '';

    return `<div class="cost-bar-wrap">` + rows.map(([label, value]) => {
      const pct   = Math.round((value / total) * 100);
      const color = VehicleCard.BAR_COLORS[label] || '#1877F2';
      return `
        <div class="cost-bar-row">
          <div class="cost-bar-label">${label}</div>
          <div class="cost-bar-track">
            <div class="cost-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="cost-bar-pct">${pct}%</div>
        </div>`;
    }).join('') + `</div>`;
  },

  // Legacy method kept for any existing callers
  miniBreakdown(costs) {
    return VehicleCard.costBars(costs);
  },
};
