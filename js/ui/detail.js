// TRUE COST Pro — ui/detail.js
// Single-vehicle detail view: donut chart + cost breakdown.

const DETAIL_PALETTE = [
  '#3B82F6', // Depreciation  (blue)
  '#F59E0B', // Fuel / Energy  (gold)
  '#10B981', // Registration   (green)
  '#8B5CF6', // Insurance      (purple)
  '#EC4899', // Servicing      (pink)
  '#06B6D4', // Tyres          (cyan)
  '#F97316', // Lost capital   (orange)
  '#6366F1', // Roadside assist
  '#14B8A6', // Finance interest
  '#EF4444', // Repair reserve
  '#84CC16', // Stamp duty
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

    // ── Full-bleed hero image ──
    const heroEl = document.getElementById('detail-hero');
    if (heroEl) {
      if (vehicle.imageUrl) {
        heroEl.innerHTML = `
          <div style="position:relative;width:100%;height:250px;overflow:hidden;margin:-16px -16px 20px;width:calc(100% + 32px)">
            <img src="${vehicle.imageUrl}" alt="${vehicle.make} ${vehicle.model}"
              style="width:100%;height:100%;object-fit:cover;object-position:center 60%">
            <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(11,18,32,0.95) 0%,rgba(11,18,32,0.3) 55%,transparent 100%)"></div>
            <div style="position:absolute;bottom:16px;left:16px;right:16px">
              <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--color-primary);margin-bottom:4px">${vehicle.make || ''}</div>
              <div style="font-size:1.25rem;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.3px">${vehicle.model || ''}${vehicle.variant ? ' <span style="font-weight:500;opacity:0.8">— ' + vehicle.variant + '</span>' : ''}</div>
            </div>
          </div>`;
      } else {
        heroEl.innerHTML = `
          <div style="width:calc(100% + 32px);margin:-16px -16px 20px;height:140px;
            background:linear-gradient(135deg,var(--color-surface-2),var(--color-surface-3));
            display:flex;align-items:center;justify-content:center;font-size:4rem;overflow:hidden">
            🚗
          </div>`;
      }
    }

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

    // ── Key stats ──
    document.getElementById('detail-stats').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:4px 0 18px;border-bottom:1px solid var(--color-border);margin-bottom:4px">
        <div style="font-size:2.4rem;font-weight:900;letter-spacing:-1px;color:var(--color-text);line-height:1">${fmtAUD(costs.summary.totalOwnershipCost)}</div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-top:5px;text-transform:uppercase;letter-spacing:0.07em">
          Total cost of ownership · ${scenario.years} years
        </div>
      </div>
      <div class="cost-chip" style="grid-column:1/2">
        <div class="cost-chip-value">${fmtAUD(costs.summary.costPerYear)}</div>
        <div class="cost-chip-label">Per year</div>
      </div>
      <div class="cost-chip" style="grid-column:2/3">
        <div class="cost-chip-value">${fmtPerKm(costs.summary.costPerKm)}</div>
        <div class="cost-chip-label">Per km</div>
      </div>`;

    // Fuel/vehicle meta line
    const ftLabel = fuelTypeLabel(vehicle.fuelType);
    const ftBadge = fuelBadgeClass(vehicle.fuelType);
    const priceStr = vehicle.purchasePrice ? fmtAUD(vehicle.purchasePrice) + ' purchase · ' : '';
    document.getElementById('detail-meta').innerHTML =
      '<span class="badge ' + ftBadge + '">' + ftLabel + '</span>' +
      '<span style="font-size:11px;color:var(--color-text-muted)">' +
        vehicle.year + ' · ' + priceStr + scenario.kmPerYear.toLocaleString() + '\u202fkm/yr' +
      '</span>';

    // Breakdown rows
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
      rows.push({ label: 'Repair reserve ⚠️', value: costs.total.repairReserve });
    if ((costs.total.stampDuty || 0) > 0) {
      const sdMeta = (costs.meta && costs.meta.stampDuty) || {};
      rows.push({ label: sdMeta.hasEvConcession ? 'Stamp duty 🟢' : 'Stamp duty', value: costs.total.stampDuty });
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
          borderColor: '#141E2E',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,30,46,0.96)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            titleColor: '#F0F4FF',
            bodyColor: 'rgba(240,244,255,0.7)',
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
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + col + ';flex-shrink:0"></span>' +
          '<span class="cost-label">' + r.label + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span style="font-size:10px;color:var(--color-text-muted);min-width:28px;text-align:right">' + pct + '%</span>' +
          '<span class="cost-value">' + fmtAUD(r.value) + '</span>' +
        '</div>' +
      '</div>';
    }).join('') +

    // EV stamp duty note
    (((costs.meta && costs.meta.stampDuty && costs.meta.stampDuty.hasEvConcession) && costs.meta.stampDuty.savedVsStandard > 0)
      ? '<div style="margin-top:12px;padding:10px 12px;background:var(--color-success-light);border:1px solid rgba(16,185,129,0.25);border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
          '🟢 <strong style="color:var(--color-success)">EV stamp duty concession applied</strong> — saved ' +
          fmtAUD(costs.meta.stampDuty.savedVsStandard) + ' vs standard rate. ' +
          (costs.meta.stampDuty.note || '') +
        '</div>'
      : '') +

    // Repair reserve note
    ((costs.total.repairReserve || 0) > 0
      ? '<div style="margin-top:12px;padding:10px 12px;background:var(--color-error-light);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
          '<strong style="color:var(--color-error)">⚠️ Repair reserve</strong> — estimated ' +
          fmtAUD(meta.repairReservePerYear || 0) + '/yr based on vehicle age (' +
          (meta.vehicleAgeAtPurchase || 0) + ' yrs) and odometer (' +
          ((meta.purchaseOdometer || 0) / 1000).toFixed(0) + 'k km). ' +
          'Allowance for unscheduled maintenance only.' +
        '</div>'
      : '') +

    // Disclaimer
    '<div style="margin-top:12px;padding:10px 12px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:11px;color:var(--color-text-muted);line-height:1.5">' +
      '<strong>Estimates only.</strong> Figures assume scheduled servicing is completed on time, no major faults, and standard conditions. Use as a guide for comparison, not a financial guarantee.' +
    '</div>' +

    // ── Insurance CTA ──
    '<div class="partner-cta-card">' +
      '<div class="partner-cta-icon">🛡️</div>' +
      '<div class="partner-cta-text">' +
        '<strong>Get insured in 60 seconds</strong>' +
        '<span>Pre-filled with your vehicle details</span>' +
      '</div>' +
      '<a class="partner-cta-btn" ' +
         'href="https://www.budgetdirect.com.au/car-insurance.html?utm_source=truecost-pro&utm_medium=referral&utm_campaign=vehicle-detail"' +
         'target="_blank" rel="noopener">Quote →</a>' +
    '</div>';
  },

  _destroyChart() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
  },
};
