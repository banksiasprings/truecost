// TRUE COST — ui/comparison.js
// Side-by-side vehicle comparison renderer.

const Comparison = {
  async render(settings) {
    const vehicles = await getAllVehicles();
    const container = document.getElementById('compare-container');
    if (!container) return;

    if (vehicles.length < 2) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h2 class="empty-state-title">Add at least 2 vehicles</h2>
          <p class="empty-state-desc">Compare up to 4 vehicles side-by-side across every cost category.</p>
          <button class="btn btn-primary btn-pill" onclick="Router.navigate('vehicles')">Go to Vehicles</button>
        </div>`;
      return;
    }

    const s = settings || App.settings || Defaults.scenario;
    const scenario = {
      years: s.years || 5,
      kmPerYear: s.kmPerYear || 15000,
      opportunityCostRate: s.opportunityCostRate || 4.5,
    };

    const results = vehicles.map(v => ({
      vehicle: v,
      costs: calculateCosts(v, scenario),
    }));

    const count = Math.min(results.length, 4);
    const subset = results.slice(0, count);

    // Find winner (lowest total cost)
    const minCost = Math.min(...subset.map(r => r.costs.summary.totalOwnershipCost));

    const costCategories = [
      { key: 'depreciation', label: 'Depreciation' },
      { key: 'fuel',         label: 'Fuel/Energy' },
      { key: 'battery',      label: 'Battery' },
      { key: 'registration', label: 'Registration' },
      { key: 'insurance',    label: 'Insurance' },
      { key: 'servicing',    label: 'Servicing' },
      { key: 'tyres',        label: 'Tyres' },
      { key: 'lostCapital',  label: 'Lost Capital' },
      { key: 'financeInterest', label: 'Finance' },
    ];

    document.getElementById('compare-subtitle').textContent =
      `${count} vehicles · ${scenario.years}yr / ${(scenario.kmPerYear/1000).toFixed(0)}k km/yr`;

    container.innerHTML = `
      <div class="compare-grid" data-count="${count}">
        ${subset.map(r => {
          const isWinner = r.costs.summary.totalOwnershipCost === minCost;
          return `<div class="card" style="${isWinner ? 'border:2px solid var(--color-primary)' : ''}">
            ${isWinner ? '<div class="badge badge-success" style="margin-bottom:var(--space-2)">Best Value</div>' : ''}
            <div style="font-weight:var(--font-weight-bold);font-size:var(--font-size-sm);margin-bottom:var(--space-2)">${vehicleLabel(r.vehicle)}</div>
            <span class="badge ${fuelBadgeClass(r.vehicle.fuelType)}">${fuelTypeLabel(r.vehicle.fuelType)}</span>
            <div style="margin-top:var(--space-4);text-align:center">
              <div style="font-size:var(--font-size-xl);font-weight:var(--font-weight-bold)">${fmtAUD(r.costs.summary.totalOwnershipCost)}</div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted)">${scenario.years}yr total</div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="card" style="margin-top:var(--space-4)">
        <h2 class="card-title">Cost Breakdown</h2>
        ${costCategories.map(cat => {
          const vals = subset.map(r => r.costs.total[cat.key] || 0);
          const hasData = vals.some(v => v > 0);
          if (!hasData) return '';
          const minVal = Math.min(...vals);
          return `
            <div style="margin-bottom:var(--space-4)">
              <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);
                          color:var(--color-text-secondary);margin-bottom:var(--space-2)">${cat.label}</div>
              <div class="compare-grid" data-count="${count}">
                ${vals.map(val => `
                  <div style="text-align:center;font-size:var(--font-size-sm);
                               font-weight:${val===minVal?'var(--font-weight-bold)':'var(--font-weight-normal)'};
                               color:${val===minVal?'var(--color-primary)':'var(--color-text)'}">
                    ${fmtAUD(val)}
                  </div>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },
};