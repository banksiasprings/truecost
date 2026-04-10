// TRUE COST Pro — ui/vehicle-card.js  (Dark Premium Edition)
const VehicleCard = {

  BAR_COLORS: {
    'Depreciation': '#3B82F6',
    'Fuel / Energy': '#F59E0B',
    'Registration':  '#10B981',
    'Insurance':     '#EF4444',
    'Servicing':     '#8B5CF6',
    'Tyres':         '#06B6D4',
    'Lost capital':  '#F97316',
    'Roadside':      '#6366F1',
    'Finance':       '#EC4899',
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
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-vehicle')) return;
        Router.navigate('detail', { id: card.dataset.id });
      });
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

    // Fuel type border accent
    const fuelColors = { electric: '#3B82F6', hybrid: '#10B981', phev: '#06B6D4',
                         diesel: '#8B7355', lpg: '#F97316', petrol: '#F97316' };
    const borderColor = fuelColors[v.fuelType] || '#3B82F6';

    // Age/km warning
    const ageNow = new Date().getFullYear() - (v.year || new Date().getFullYear());
    const odo = v.purchaseOdometer || 0;
    const warningBadge = (ageNow >= 7 || odo >= 100000)
      ? `<div style="margin-top:6px"><span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(245,158,11,0.12);color:var(--color-accent);font-size:10px;font-weight:700">⚠ ${ageNow >= 7 ? ageNow + 'yr old' : Math.round(odo/1000) + 'k km'} — higher maintenance risk</span></div>`
      : '';

    // Hero image section
    const heroSection = v.imageUrl
      ? `<div style="position:relative;height:160px;overflow:hidden">
           <img src="${v.imageUrl}" alt="${v.make} ${v.model}" loading="lazy"
             style="width:100%;height:100%;object-fit:cover;object-position:center 60%">
           <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(11,18,32,0.9) 0%,transparent 60%)"></div>
         </div>`
      : '';

    return `
      <div class="card vehicle-card" data-id="${v.id}" style="cursor:pointer;border-left:3px solid ${borderColor};padding:0;overflow:hidden">

        ${heroSection}

        <div style="padding:16px">
          <!-- Header row: name + delete -->
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
            <div style="flex:1;min-width:0">
              <div style="font-size:var(--font-size-md);font-weight:800;color:var(--color-text);line-height:1.2;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
              <span class="badge ${ftBadge}">${ftLabel}</span>
              ${v.purchasePrice ? `<span style="font-size:10px;color:var(--color-text-muted);margin-left:6px">Paid ${fmtAUD(v.purchasePrice)}</span>` : ''}
              ${warningBadge}
            </div>
            <button class="btn btn-ghost btn-sm btn-delete-vehicle" data-id="${v.id}"
              style="color:var(--color-error);padding:4px;margin:-4px -4px 0 8px;flex-shrink:0" aria-label="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>

          <!-- Total cost hero number -->
          <div style="text-align:center;padding:12px 0 10px;border-top:1px solid var(--color-border);border-bottom:1px solid var(--color-border);margin-bottom:12px">
            <div style="font-size:2.1rem;font-weight:900;color:var(--color-text);letter-spacing:-1px;line-height:1">${totalStr}</div>
            <div style="font-size:10px;color:var(--color-text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.06em">Total ${years}-year cost</div>
          </div>

          <!-- Per year / per km chips -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
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

          <p style="font-size:10px;color:var(--color-text-muted);margin-top:10px;text-align:right">
            Tap for full breakdown →
          </p>
        </div>
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
      const color = VehicleCard.BAR_COLORS[label] || '#3B82F6';
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

  miniBreakdown(costs) {
    return VehicleCard.costBars(costs);
  },
};
