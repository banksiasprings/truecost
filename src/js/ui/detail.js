// TRUE COST — ui/detail.js
// Single-vehicle detail view: donut chart + cost breakdown.

const DETAIL_PALETTE = [
  '#E8572A', // Depreciation
  '#4A90D9', // Fuel / Energy
  '#2D5016', // Registration
  '#D4A843', // Insurance
  '#7B5EA7', // Servicing
  '#3A8C6E', // Tyres
  '#8C6E3A', // Lost capital
  '#5E8C3A', // Finance
];

const VehicleDetail = {
  _chart: null,

  async render(params = {}) {
    const id = params.id;
    if (!id) { Router.navigate('vehicles'); return; }

    const vehicle = await getVehicle(id);
    if (!vehicle) { Router.navigate('vehicles'); return; }

    const settings = App.settings || await getAllSettings();
    const scenario = {
      years:               settings.years               || 5,
      kmPerYear:           settings.kmPerYear           || 15000,
      opportunityCostRate: settings.opportunityCostRate || 4.5,
    };

    const costs = calculateCosts(vehicle, scenario);

    // Header
    document.getElementById('detail-vehicle-title').textContent = vehicleLabel(vehicle);
    document.getElementById('btn-detail-edit').onclick = () =>
      Router.navigate('add-vehicle', { id: vehicle.id, mode: 'edit' });
    document.getElementById('btn-detail-back').onclick = () =>
      Router.navigate('vehicles');
    document.getElementById('btn-detail-delete').onclick = async () => {
      if (confirm('Delete ' + vehicleLabel(vehicle) + '?')) {
        await deleteVehicle(vehicle.id);
        Router.navigate('vehicles');
      }
    };

    // Summary chips
    document.getElementById('detail-stats').innerHTML =
      '<div class="cost-chip">' +
        '<div class="cost-chip-value">' + fmtAUD(costs.summary.totalOwnershipCost) + '</div>' +
        '<div class="cost-chip-label">Total ' + scenario.years + 'yr</div>' +
      '</div>' +
      '<div class="cost-chip">' +
        '<div class="cost-chip-value">' + fmtAUD(costs.summary.costPerYear) + '</div>' +
        '<div class="cost-chip-label">Per year</div>' +
      '</div>' +
      '<div class="cost-chip">' +
        '<div class="cost-chip-value">' + fmtPerKm(costs.summary.costPerKm) + '</div>' +
        '<div class="cost-chip-label">Per km</div>' +
      '</div>';

    // Fuel/vehicle meta line
    const ftLabel = fuelTypeLabel(vehicle.fuelType);
    const ftBadge = fuelBadgeClass(vehicle.fuelType);
    const priceStr = vehicle.purchasePrice ? fmtAUD(vehicle.purchasePrice) + ' purchase · ' : '';
    document.getElementById('detail-meta').innerHTML =
      '<span class="badge ' + ftBadge + '">' + ftLabel + '</span>' +
      '<span style="font-size:var(--font-size-xs);color:var(--color-text-muted)">' +
        vehicle.year + ' · ' + priceStr + scenario.kmPerYear.toLocaleString() + '\u202fkm/yr' +
      '</span>';

    // Breakdown rows (filter zero values)
    const rows = [
      { label: 'Depreciation',   value: costs.total.depreciation                            },
      { label: 'Fuel / Energy',  value: (costs.total.fuel || 0) + (costs.total.battery || 0)},
      { label: 'Registration',   value: costs.total.registration                            },
      { label: 'Insurance',      value: costs.total.insurance                               },
      { label: 'Servicing',      value: costs.total.servicing                               },
      { label: 'Tyres',          value: costs.total.tyres                                   },
      { label: 'Lost capital',   value: costs.total.lostCapital                             },
    ].filter(r => r.value > 0);
    if ((costs.total.finance || 0) > 0)
      rows.push({ label: 'Finance interest', value: costs.total.finance });

    const total = costs.summary.totalOwnershipCost;

    // ── Donut chart ──
    this._destroyChart();
    const ctx = document.getElementById('detail-donut-chart').getContext('2d');
    this._chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: rows.map(r => r.label),
        datasets: [{
          data: rows.map(r => Math.round(r.value)),
          backgroundColor: rows.map((_, i) => DETAIL_PALETTE[i % DETAIL_PALETTE.length]),
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var v = ctx.parsed;
                var pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
                return '  ' + fmtAUD(v) + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });

    // ── Breakdown table ──
    document.getElementById('detail-breakdown').innerHTML = rows.map(function(r, i) {
      var col = DETAIL_PALETTE[i % DETAIL_PALETTE.length];
      var pct = total > 0 ? ((r.value / total) * 100).toFixed(0) : 0;
      return '<div class="detail-row">' +
        '<div style="display:flex;align-items:center;gap:var(--space-2)">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + col + ';flex-shrink:0"></span>' +
          '<span class="cost-label">' + r.label + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:var(--space-3)">' +
          '<span style="font-size:var(--font-size-xs);color:var(--color-text-muted);min-width:28px;text-align:right">' + pct + '%</span>' +
          '<span class="cost-value">' + fmtAUD(r.value) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  },

  _destroyChart() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
  },
};
