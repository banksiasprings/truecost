// TRUE COST — ui/vehicle-card.js
// Renders the vehicle list and individual vehicle cards.
const VehicleCard = {
  async renderList() {
    const vehicles = await getAllVehicles();
    const list = document.getElementById('vehicle-list');
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
      years: settings.years || 5,
      kmPerYear: settings.kmPerYear || 15000,
      opportunityCostRate: settings.opportunityCostRate || 4.5,
    };
    list.innerHTML = vehicles.map(v => {
      const costs = calculateCosts(v, scenario);
      return VehicleCard.cardHTML(v, costs);
    }).join('');

    // Wire delete buttons
    list.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        App.showConfirmModal('Delete this vehicle?', async () => {
          await deleteVehicle(id);
          VehicleCard.renderList();
        });
      });
    });

    // Wire card tap → detail view
    list.querySelectorAll('.vehicle-card').forEach(card => {
      card.addEventListener('click', () => {
        Router.navigate('detail', { id: card.dataset.id });
      });
    });
  },

  cardHTML(v, costs) {
    const label = vehicleLabel(v);
    const ftLabel = fuelTypeLabel(v.fuelType);
    const ftBadge = fuelBadgeClass(v.fuelType);
    const totalStr = fmtAUD(costs.summary.totalOwnershipCost);
    const perYrStr = fmtAUD(costs.summary.costPerYear);
    const perKmStr = fmtPerKm(costs.summary.costPerKm);
    return `
      <div class="card vehicle-card" data-id="${v.id}" style="cursor:pointer">
        <div class="flex-between mb-4">
          <div>
            <div style="font-size:var(--font-size-md);font-weight:var(--font-weight-bold)">${label}</div>
            <span class="badge ${ftBadge}">${ftLabel}</span>
            ${v.purchasePrice ? `<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px">Purchased ${fmtAUD(v.purchasePrice)}</div>` : ''}
          </div>
          <button class="btn btn-ghost btn-sm btn-delete-vehicle" data-id="${v.id}"
            style="color:var(--color-error)" aria-label="Delete vehicle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
        <div style="text-align:center;margin-bottom:10px">
          <div style="font-size:1.6rem;font-weight:800;color:var(--color-text);letter-spacing:-0.5px;line-height:1.1">${totalStr}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px">Total ${App.settings?.years || 5}-year cost</div>
        </div>
        <div style="display:flex;gap:var(--space-3)">
          <div class="cost-chip" style="flex:1">
            <div class="cost-chip-value">${perYrStr}</div>
            <div class="cost-chip-label">Per year</div>
          </div>
          <div class="cost-chip" style="flex:1">
            <div class="cost-chip-value">${perKmStr}</div>
            <div class="cost-chip-label">Per km</div>
          </div>
        </div>
        <div style="margin-top:var(--space-4)">
          ${VehicleCard.miniBreakdown(costs)}
        </div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-3);text-align:right">
          Tap for breakdown →
        </p>
      </div>`;
  },

  miniBreakdown(costs) {
    const rows = [
      ['Depreciation', costs.total.depreciation],
      ['Fuel / Energy', costs.total.fuel + costs.total.battery],
      ['Registration', costs.total.registration],
      ['Insurance', costs.total.insurance],
      ['Servicing', costs.total.servicing],
      ['Tyres', costs.total.tyres],
      ['Lost capital', costs.total.lostCapital],
    ].filter(([, v]) => v > 0);
    return rows.map(([label, value]) => `
      <div class="cost-row">
        <span class="cost-label">${label}</span>
        <span class="cost-value">${fmtAUD(value)}</span>
      </div>`).join('');
  },
};
