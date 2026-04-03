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
  '#32ADE6', // Roadside assist
  '#BF5AF2', // Finance interest
  '#C0392B', // Repair reserve
  '#16A085', // Stamp duty
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
      App.showConfirmModal('Delete ' + vehicleLabel(vehicle) + '?', async () => {
        await deleteVehicle(vehicle.id);
        Router.navigate('vehicles');
      });
    };

    // Summary: hero total + sub-metrics
    document.getElementById('detail-stats').innerHTML =
      '<div style="text-align:center;padding:var(--space-3) 0 var(--space-4)">' +
        '<div style="font-size:2.2rem;font-weight:800;letter-spacing:-0.5px;color:var(--color-text)">' + fmtAUD(costs.summary.totalOwnershipCost) + '</div>' +
        '<div style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-top:4px">' +
          'Total cost of ownership · ' + scenario.years + ' years' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-3)">' +
        '<div class="cost-chip" style="flex:1">' +
          '<div class="cost-chip-value">' + fmtAUD(costs.summary.costPerYear) + '</div>' +
          '<div class="cost-chip-label">Per year</div>' +
        '</div>' +
        '<div class="cost-chip" style="flex:1">' +
          '<div class="cost-chip-value">' + fmtPerKm(costs.summary.costPerKm) + '</div>' +
          '<div class="cost-chip-label">Per km</div>' +
        '</div>' +
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
    if ((costs.total.roadside || 0) > 0)
      rows.push({ label: 'Roadside assist', value: costs.total.roadside });
    if ((costs.total.finance || 0) > 0)
      rows.push({ label: 'Finance interest', value: costs.total.finance });
    if ((costs.total.repairReserve || 0) > 0)
      rows.push({ label: 'Repair reserve ⚠️', value: costs.total.repairReserve, isRepair: true });
    if ((costs.total.stampDuty || 0) > 0) {
      const sdMeta = (costs.meta && costs.meta.stampDuty) || {};
      const sdLabel = sdMeta.hasEvConcession ? 'Stamp duty 🟢' : 'Stamp duty';
      rows.push({ label: sdLabel, value: costs.total.stampDuty, isStampDuty: true });
    }

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
    const meta = costs.meta || {};
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
    }).join('') +

    // ── Stamp duty EV concession note ──
    + (((costs.meta && costs.meta.stampDuty && costs.meta.stampDuty.hasEvConcession) && costs.meta.stampDuty.savedVsStandard > 0)
      ? '<div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);' +
          'background:rgba(52,199,89,0.07);border:1px solid rgba(52,199,89,0.28);' +
          'border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
          '🟢 <strong style="color:#27AE60">EV stamp duty concession applied</strong> — saved ' +
          fmtAUD(costs.meta.stampDuty.savedVsStandard) + ' vs standard rate. ' +
          (costs.meta.stampDuty.note || '') +
        '</div>'
      : '') +
    // ── Novated lease tax saving breakdown ──
    + ((costs.meta && costs.meta.novated)
      ? '<div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);' +
          'background:rgba(74,144,217,0.07);border:1px solid rgba(74,144,217,0.28);' +
          'border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
          '<strong style="color:#4A90D9">Novated lease salary sacrifice</strong><br>' +
          'Annual lease payment: ' + fmtAUD(costs.meta.novated.annualLeaseCost) +
          ' · Bundled running: ' + fmtAUD(costs.meta.novated.annualRunning) + '/yr<br>' +
          'Pre-tax deduction: ' + fmtAUD(costs.meta.novated.preTaxDeduction) + '/yr<br>' +
          'Tax saved: <strong style="color:#27AE60">' + fmtAUD(costs.meta.novated.taxSavedPerYear) + '/yr</strong>' +
          (costs.meta.novated.fbtPerYear > 0
            ? ' · FBT cost: <strong style="color:#C0392B">' + fmtAUD(costs.meta.novated.fbtPerYear) + '/yr</strong>'
            : '') +
          '<br>Net annual benefit: <strong style="color:' +
            (costs.meta.novated.netAnnualBenefit >= 0 ? '#27AE60' : '#C0392B') + '">' +
            fmtAUD(costs.meta.novated.netAnnualBenefit) + '/yr</strong>' +
          ' · Over ' + costs.meta.novated.termYears + ' yrs: ' +
            fmtAUD(costs.meta.novated.totalBenefit) + '<br>' +
          '<span style="font-size:10px;opacity:0.8">' + (costs.meta.novated.fbtNote || '') +
          ' · Residual: ' + costs.meta.novated.residualPct + '% (' +
            fmtAUD(costs.meta.novated.residualVal) + ')</span>' +
        '</div>'
      : '') +
    // ── Chattel mortgage GST credit note ──
    + ((costs.meta && costs.meta.gstCredit > 0)
      ? '<div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);' +
          'background:rgba(74,144,217,0.07);border:1px solid rgba(74,144,217,0.28);' +
          'border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
          '<strong style="color:#4A90D9">Chattel mortgage GST credit</strong> — ' +
          'ABN holder claiming ' + fmtAUD(costs.meta.gstCredit) + ' GST credit on purchase price. ' +
          'This reduces your effective total cost of ownership.' +
        '</div>'
      : '') +

    // ── Repair reserve explanation (if applicable) ──
    ((costs.total.repairReserve || 0) > 0
      ? '<div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);' +
          'background:rgba(192,57,43,0.07);border:1px solid rgba(192,57,43,0.22);' +
          'border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
          '<strong style="color:#C0392B">⚠️ Repair reserve</strong> — estimated ' +
          fmtAUD(meta.repairReservePerYear || 0) + '/yr based on vehicle age (' +
          (meta.vehicleAgeAtPurchase || 0) + ' yrs) and odometer (' +
          ((meta.purchaseOdometer || 0) / 1000).toFixed(0) + 'k km). ' +
          'This is a rough allowance for unscheduled maintenance. ' +
          'A single major repair — engine, transmission, gearbox, or suspension — can cost $3,000–$15,000+ and is not guaranteed by this estimate.' +
        '</div>'
      : '') +

    // ── General disclaimer ──
    '<div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);' +
      'background:var(--color-surface);border:1px solid var(--color-border);' +
      'border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
      '<strong>Estimates only.</strong> These figures assume all scheduled servicing is completed ' +
      'on time, no major unexpected faults occur, and standard insurance/registration conditions apply. ' +
      (meta.isUsed
        ? 'Older and higher-kilometre vehicles carry greater risk of breakdowns and unscheduled repairs — ' +
          'costs that can be significant and are <em>not</em> fully captured here. ' +
          'A bargain purchase price may be offset by higher ongoing costs. '
        : '') +
      'Use this as a guide for comparison, not a financial guarantee.' +
    '</div>';
  },

  _destroyChart() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
  },
};
