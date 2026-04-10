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
    // If the saved vehicle has no imageUrl, look it up from the preset database
    if (!vehicle.imageUrl && window.VehiclePresets && window.VehiclePresets.all) {
      const preset = window.VehiclePresets.all.find(
        p => p.make === vehicle.make && p.model === vehicle.model && p.imageUrl
      );
      if (preset) vehicle.imageUrl = preset.imageUrl;
    }

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
      { key: 'depreciation',  label: 'Depreciation',   value: costs.total.depreciation                            },
      { key: 'fuel',          label: 'Fuel / Energy',  value: (costs.total.fuel || 0) + (costs.total.battery || 0)},
      { key: 'registration',  label: 'Registration',   value: costs.total.registration                            },
      { key: 'insurance',     label: 'Insurance',      value: costs.total.insurance                               },
      { key: 'servicing',     label: 'Servicing',      value: costs.total.servicing                               },
      { key: 'tyres',         label: 'Tyres',          value: costs.total.tyres                                   },
      { key: 'lostCapital',   label: 'Lost capital',   value: costs.total.lostCapital                             },
    ].filter(r => r.value > 0);
    if ((costs.total.roadside || 0) > 0)
      rows.push({ key: 'roadside',  label: 'Roadside assist', value: costs.total.roadside });
    if ((costs.total.finance || 0) > 0)
      rows.push({ key: 'finance',   label: 'Finance interest', value: costs.total.finance });
    if ((costs.total.repairReserve || 0) > 0)
      rows.push({ key: 'repairReserve', label: 'Repair reserve ⚠️', value: costs.total.repairReserve });
    if ((costs.total.stampDuty || 0) > 0) {
      const sdMeta = (costs.meta && costs.meta.stampDuty) || {};
      rows.push({ key: 'stampDuty', label: sdMeta.hasEvConcession ? 'Stamp duty 🟢' : 'Stamp duty', value: costs.total.stampDuty });
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
    // Store state for click handlers
    this._vehicle = vehicle;
    this._scenario = scenario;
    this._costs = costs;
    this._rows = rows;
    this._total = total;

    const meta = costs.meta || {};
    const self = this;
    document.getElementById('detail-breakdown').innerHTML = rows.map(function(r, i) {
      var col = DETAIL_PALETTE[i % DETAIL_PALETTE.length];
      var pct = total > 0 ? ((r.value / total) * 100).toFixed(0) : 0;
      return '<div class="detail-row detail-row-tappable" data-cat="' + r.key + '" data-idx="' + i + '" style="cursor:pointer;">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + col + ';flex-shrink:0"></span>' +
          '<span class="cost-label">' + r.label + '</span>' +
          '<span style="font-size:10px;color:var(--color-text-muted);opacity:0.5">›</span>' +
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

    // Wire tap handlers after DOM is updated
    this._wireRowTaps();
  },

  _destroyChart() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
  },

  _wireRowTaps() {
    const self = this;
    document.querySelectorAll('.detail-row-tappable').forEach(function(el) {
      el.addEventListener('click', function() {
        const cat = el.dataset.cat;
        const idx = parseInt(el.dataset.idx, 10);
        const row = self._rows[idx];
        if (row) self._showCostDetail(cat, row.label, DETAIL_PALETTE[idx % DETAIL_PALETTE.length]);
      });
    });
  },

  _showCostDetail(categoryKey, label, color) {
    const vehicle  = this._vehicle;
    const scenario = this._scenario;
    const costs    = this._costs;
    const meta     = costs.meta || {};

    const existing = document.getElementById('tc-cost-detail-sheet');
    if (existing) existing.remove();

    const content = this._buildDetailContent(categoryKey, vehicle, scenario, costs, meta);

    const overlay = document.createElement('div');
    overlay.id = 'tc-cost-detail-sheet';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9500;display:flex;align-items:flex-end;justify-content:center';

    overlay.innerHTML = `
      <style>
        @keyframes tcSheetIn { from { opacity:0 } to { opacity:1 } }
        @keyframes tcSheetUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        #tc-cost-detail-sheet { animation: tcSheetIn 0.15s ease; }
        #tc-cost-detail-sheet .tcd-sheet {
          background: var(--color-surface, #141E2E);
          border-radius: 20px 20px 0 0;
          padding: 0 0 40px;
          width: 100%;
          max-width: 520px;
          max-height: 80vh;
          overflow-y: auto;
          animation: tcSheetUp 0.28s cubic-bezier(0.32,0.72,0,1);
          box-shadow: 0 -8px 40px rgba(0,0,0,0.4);
        }
        #tc-cost-detail-sheet .tcd-header {
          position: sticky; top: 0;
          background: var(--color-surface, #141E2E);
          padding: 12px 20px 16px;
          border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.08));
          display: flex; align-items: center; justify-content: space-between;
        }
        #tc-cost-detail-sheet .tcd-handle {
          width:40px;height:4px;border-radius:2px;
          background:rgba(255,255,255,0.15);
          margin: 0 auto 12px;
        }
        #tc-cost-detail-sheet .tcd-title {
          font-size: 1rem; font-weight: 700;
          color: var(--color-text, #F0F4FF);
          display: flex; align-items: center; gap: 8px;
        }
        #tc-cost-detail-sheet .tcd-dot {
          width: 10px; height: 10px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
        }
        #tc-cost-detail-sheet .tcd-close {
          background: none; border: none; cursor: pointer;
          color: var(--color-text-muted, rgba(240,244,255,0.5));
          font-size: 1.4rem; padding: 0; line-height: 1;
        }
        #tc-cost-detail-sheet .tcd-body {
          padding: 20px;
        }
        #tc-cost-detail-sheet .tcd-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.06));
          font-size: 0.85rem;
        }
        #tc-cost-detail-sheet .tcd-row:last-child { border-bottom: none; }
        #tc-cost-detail-sheet .tcd-row-label {
          color: var(--color-text-muted, rgba(240,244,255,0.6));
          flex: 1;
        }
        #tc-cost-detail-sheet .tcd-row-value {
          color: var(--color-text, #F0F4FF);
          font-weight: 600;
          text-align: right;
          margin-left: 16px;
        }
        #tc-cost-detail-sheet .tcd-formula {
          background: var(--color-surface-2, rgba(255,255,255,0.04));
          border: 1px solid var(--color-border, rgba(255,255,255,0.08));
          border-radius: 10px;
          padding: 14px 16px;
          margin: 16px 0 8px;
          font-size: 0.82rem;
          color: var(--color-text-muted, rgba(240,244,255,0.6));
          line-height: 1.6;
        }
        #tc-cost-detail-sheet .tcd-formula strong {
          color: var(--color-text, #F0F4FF);
        }
        #tc-cost-detail-sheet .tcd-total {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px;
          background: var(--color-surface-2, rgba(255,255,255,0.04));
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 10px;
          margin-top: 16px;
        }
        #tc-cost-detail-sheet .tcd-total-label {
          font-size: 0.85rem; font-weight: 600;
          color: var(--color-text-muted, rgba(240,244,255,0.6));
        }
        #tc-cost-detail-sheet .tcd-total-value {
          font-size: 1.15rem; font-weight: 800;
          color: var(--color-text, #F0F4FF);
        }
      </style>
      <div class="tcd-sheet">
        <div class="tcd-header">
          <div style="flex:1">
            <div class="tcd-handle"></div>
            <div class="tcd-title">
              <span class="tcd-dot" style="background:${color}"></span>
              ${label}
            </div>
          </div>
          <button class="tcd-close" id="tcd-close-btn">✕</button>
        </div>
        <div class="tcd-body">${content}</div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#tcd-close-btn').addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  },

  _buildDetailContent(key, vehicle, scenario, costs, meta) {
    const yrs = scenario.years;
    const kmPY = scenario.kmPerYear;
    const totalKm = yrs * kmPY;
    const fmt = fmtAUD;

    function row(label, value) {
      return '<div class="tcd-row"><span class="tcd-row-label">' + label + '</span><span class="tcd-row-value">' + value + '</span></div>';
    }
    function formula(html) {
      return '<div class="tcd-formula">' + html + '</div>';
    }
    function totalRow(value) {
      return '<div class="tcd-total"><span class="tcd-total-label">Total over ' + yrs + ' years</span><span class="tcd-total-value">' + fmt(value) + '</span></div>';
    }

    if (key === 'depreciation') {
      const depResult = costs.breakdown.depreciation;
      const resale = vehicle.purchasePrice - depResult.total;
      return formula(
        '<strong>Purchase price − Resale value</strong><br>' +
        fmt(vehicle.purchasePrice) + ' − ' + fmt(resale) + ' = <strong>' + fmt(depResult.total) + '</strong> over ' + yrs + ' years'
      ) +
      row('Purchase price', fmt(vehicle.purchasePrice)) +
      row('Resale value (' + yrs + ' yr estimate)', fmt(resale)) +
      row('Total depreciation', fmt(depResult.total)) +
      row('Per year', fmt(depResult.perYear)) +
      row('Per km (' + kmPY.toLocaleString() + ' km/yr)', (depResult.perKm * 100).toFixed(1) + 'c/km') +
      totalRow(depResult.total);
    }

    if (key === 'fuel') {
      const fuelBreak = costs.breakdown.fuel;
      const battBreak = costs.breakdown.battery;
      const fuelTotal = (costs.total.fuel || 0) + (costs.total.battery || 0);
      const ft = vehicle.fuelType;

      if (ft === 'electric') {
        const homeRate = vehicle.evHomeRate !== undefined ? vehicle.evHomeRate : (vehicle.evChargingTariff || 30) / 100;
        const pubRate  = vehicle.evPublicRate !== undefined ? vehicle.evPublicRate : 0.45;
        const homePct  = vehicle.evHomePercent !== undefined ? vehicle.evHomePercent : 100 - (vehicle.evPublicChargingPct || 0);
        const pubPct   = 100 - homePct;
        const consumption = vehicle.evConsumptionKwh || ((vehicle.evBatteryKwh && vehicle.evRangeKm) ? (vehicle.evBatteryKwh / vehicle.evRangeKm * 100) : 18);
        return formula(
          '<strong>Consumption × blended energy rate × distance</strong><br>' +
          consumption.toFixed(1) + ' kWh/100km × blended ' + ((homeRate * homePct/100 + pubRate * pubPct/100) * 100).toFixed(1) + 'c/kWh × ' + (totalKm/1000).toFixed(0) + 'k km'
        ) +
        row('Consumption', consumption.toFixed(1) + ' kWh/100km') +
        row('Home charging (' + homePct + '%)', (homeRate * 100).toFixed(1) + 'c/kWh') +
        row('Public charging (' + pubPct + '%)', (pubRate * 100).toFixed(1) + 'c/kWh') +
        row('Total km over ' + yrs + ' years', totalKm.toLocaleString() + ' km') +
        row('Per km', (fuelBreak.perKm * 100).toFixed(2) + 'c/km') +
        totalRow(fuelTotal);

      } else if (ft === 'phev') {
        const elecFrac = (vehicle.phevElectricPct || 50) / 100;
        const petFrac  = 1 - elecFrac;
        const fuelPrice = vehicle.fuelPricePerLitre || 175;
        const evConsump = vehicle.evConsumptionKwh || 18;
        return formula(
          '<strong>Blended electric + petrol legs</strong><br>' +
          (elecFrac * 100).toFixed(0) + '% electric driving + ' + (petFrac * 100).toFixed(0) + '% petrol driving'
        ) +
        row('Electric driving share', (elecFrac * 100).toFixed(0) + '%') +
        row('Petrol driving share', (petFrac * 100).toFixed(0) + '%') +
        row('EV consumption', evConsump.toFixed(1) + ' kWh/100km') +
        row('Petrol consumption', (vehicle.fuelConsumption || 6).toFixed(1) + ' L/100km') +
        row('Petrol price', fuelPrice + 'c/L') +
        row('Total km', totalKm.toLocaleString() + ' km') +
        row('Per km (blended)', (fuelBreak.perKm * 100).toFixed(2) + 'c/km') +
        totalRow(fuelTotal);

      } else {
        const fuelPrice = vehicle.fuelPricePerLitre || 175;
        const consumption = vehicle.fuelConsumption || 8;
        return formula(
          '<strong>Consumption (L/100km) × fuel price × distance</strong><br>' +
          consumption + ' L/100km × ' + fuelPrice + 'c/L × ' + (totalKm/1000).toFixed(0) + 'k km'
        ) +
        row('Fuel type', ft === 'diesel' ? 'Diesel' : ft === 'lpg' ? 'LPG' : 'Petrol (ULP 91)') +
        row('Consumption', consumption + ' L/100km') +
        row('Fuel price', fuelPrice + 'c/L (' + fmt(fuelPrice / 100) + '/L)') +
        row('Total km over ' + yrs + ' years', totalKm.toLocaleString() + ' km') +
        row('Per km', (fuelBreak.perKm * 100).toFixed(2) + 'c/km') +
        row('Per year', fmt(fuelBreak.perYear)) +
        totalRow(fuelTotal);
      }
    }

    if (key === 'registration') {
      const regBreak = costs.breakdown.registration;
      return formula(
        '<strong>Annual rego × years owned</strong><br>' +
        fmt(regBreak.perYear) + '/yr × ' + yrs + ' years'
      ) +
      (vehicle.state ? row('State', vehicle.state.toUpperCase()) : '') +
      row('Annual registration', fmt(regBreak.perYear)) +
      row('Years', yrs) +
      row('Per km', (regBreak.perKm * 100).toFixed(2) + 'c/km') +
      totalRow(regBreak.total);
    }

    if (key === 'insurance') {
      const insBreak = costs.breakdown.insurance;
      return formula(
        '<strong>Annual premium × years owned</strong><br>' +
        fmt(insBreak.perYear) + '/yr × ' + yrs + ' years'
      ) +
      row('Annual premium', fmt(insBreak.perYear)) +
      row('Years', yrs) +
      row('Per km', (insBreak.perKm * 100).toFixed(2) + 'c/km') +
      totalRow(insBreak.total);
    }

    if (key === 'servicing') {
      const svcBreak = costs.breakdown.servicing;
      const intKm = vehicle.serviceIntervalKm || 0;
      const intMo = vehicle.serviceIntervalMonths || 0;
      const byKm = intKm > 0 ? totalKm / intKm : 0;
      const byMo = intMo > 0 ? (yrs * 12) / intMo : 0;
      const services = Math.max(byKm, byMo);
      return formula(
        '<strong>Services × cost per service</strong><br>' +
        services.toFixed(1) + ' services × ' + fmt(vehicle.serviceCostPerService || 350) + ' = ' + fmt(svcBreak.total)
      ) +
      (intKm > 0 ? row('Service interval (km)', 'Every ' + intKm.toLocaleString() + ' km') : '') +
      (intMo > 0 ? row('Service interval (time)', 'Every ' + intMo + ' months') : '') +
      row('Rule', 'Whichever comes first') +
      row('Cost per service', fmt(vehicle.serviceCostPerService || 350)) +
      row('Services over ' + yrs + ' years', services.toFixed(1)) +
      row('Per year', fmt(svcBreak.perYear)) +
      totalRow(svcBreak.total);
    }

    if (key === 'tyres') {
      const tyreBreak = costs.breakdown.tyres;
      const lifeKm = vehicle.tyreLifeKm || 45000;
      const costSet = vehicle.tyreCostPerSet || 900;
      const sets = totalKm / lifeKm;
      return formula(
        '<strong>(Total km ÷ tyre life) × cost per set</strong><br>' +
        '(' + totalKm.toLocaleString() + ' km ÷ ' + lifeKm.toLocaleString() + ' km) × ' + fmt(costSet)
      ) +
      row('Total km over ' + yrs + ' years', totalKm.toLocaleString() + ' km') +
      row('Expected tyre life', lifeKm.toLocaleString() + ' km per set') +
      row('Cost per set', fmt(costSet)) +
      row('Sets needed', sets.toFixed(1)) +
      row('Per km', (tyreBreak.perKm * 100).toFixed(2) + 'c/km') +
      totalRow(tyreBreak.total);
    }

    if (key === 'lostCapital') {
      const lcBreak  = costs.breakdown.lostCapital;
      const oppRate  = scenario.opportunityCostRate || 4.5;
      const onRoad   = vehicle.onRoadCost || vehicle.purchasePrice;
      const cash     = (vehicle.financed && vehicle.loanAmount > 0) ? Math.max(0, onRoad - vehicle.loanAmount) : onRoad;
      return formula(
        '<strong>Cash tied up × opportunity cost rate × years</strong><br>' +
        fmt(cash) + ' × ' + oppRate + '% × ' + yrs + ' years = ' + fmt(lcBreak.total) +
        (vehicle.financed && vehicle.loanAmount > 0 ? '<br><em style="font-size:0.78rem">Cash = purchase price minus loan amount</em>' : '')
      ) +
      row('Purchase price', fmt(onRoad)) +
      (vehicle.financed && vehicle.loanAmount > 0 ? row('Loan amount', fmt(vehicle.loanAmount)) : '') +
      row('Cash outlay', fmt(cash)) +
      row('Opportunity cost rate', oppRate + '%/year') +
      row('Annual lost return', fmt(cash * oppRate / 100)) +
      row('Years', yrs) +
      totalRow(lcBreak.total);
    }

    if (key === 'finance') {
      const finBreak = costs.breakdown.financeInterest;
      const fType = meta.financeType || 'loan';
      const novated = meta.novated;
      if (fType === 'novated' && novated) {
        return formula(
          '<strong>Novated lease: lease payments − tax benefit</strong>'
        ) +
        row('Annual lease cost', fmt(novated.annualLeaseCost)) +
        row('Pre-tax deduction', fmt(novated.preTaxDeduction)) +
        row('Tax saved per year', fmt(novated.taxSavedPerYear)) +
        row('FBT per year', fmt(novated.fbtPerYear)) +
        row('Net benefit per year', fmt(novated.netAnnualBenefit)) +
        row('FBT status', novated.fbtNote || '') +
        totalRow(finBreak.total);
      }
      const loanAmt = vehicle.loanAmount || 0;
      const rate    = vehicle.interestRate || 0;
      const termMo  = vehicle.loanTermMonths || 60;
      const monthlyRate = (rate / 100) / 12;
      const monthly = monthlyRate > 0 ? loanAmt * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMo)) : 0;
      return formula(
        '<strong>Total repayments − loan amount = interest paid</strong><br>' +
        fmt(monthly) + '/mo × ' + termMo + ' months − ' + fmt(loanAmt)
      ) +
      row('Loan amount', fmt(loanAmt)) +
      row('Interest rate', rate + '%/year') +
      row('Loan term', termMo + ' months (' + (termMo / 12).toFixed(1) + ' years)') +
      row('Monthly repayment', fmt(monthly)) +
      row('Total repayments', fmt(monthly * termMo)) +
      row('Total interest', fmt(finBreak.total)) +
      (meta.gstCredit > 0 ? row('GST credit (chattel)', '−' + fmt(meta.gstCredit)) : '') +
      totalRow(finBreak.total);
    }

    if (key === 'roadside') {
      const roadBreak = costs.breakdown.roadside;
      return formula(
        '<strong>Annual roadside cost × years</strong><br>' +
        fmt(vehicle.roadsideAssistance || 0) + '/yr × ' + yrs + ' years'
      ) +
      row('Annual cost', fmt(vehicle.roadsideAssistance || 0)) +
      row('Years', yrs) +
      totalRow(roadBreak.total);
    }

    if (key === 'repairReserve') {
      const rrBreak = costs.breakdown.repairReserve;
      const age = meta.vehicleAgeAtPurchase || 0;
      const odo = meta.purchaseOdometer || 0;
      const ageFactor = age * 80;
      const odoFactor = Math.max(0, (odo - 30000) / 1000) * 7;
      const annual = Math.min(4500, ageFactor + odoFactor);
      return formula(
        '<strong>Age factor + odometer factor = annual reserve</strong><br>' +
        age + ' yrs × $80 + ' + Math.max(0, (odo - 30000) / 1000).toFixed(0) + 'k excess km × $7 = ' + fmt(annual) + '/yr'
      ) +
      row('Vehicle age at purchase', age + ' years') +
      row('Odometer at purchase', (odo / 1000).toFixed(0) + 'k km') +
      row('Age factor', fmt(ageFactor) + '/yr') +
      row('Odometer factor', fmt(odoFactor) + '/yr') +
      row('Annual reserve (max $4,500)', fmt(annual) + '/yr') +
      row('Years', yrs) +
      totalRow(rrBreak.total);
    }

    if (key === 'stampDuty') {
      const sdBreak = costs.breakdown.stampDuty;
      const sdMeta  = meta.stampDuty || {};
      return formula(
        '<strong>One-off government duty on vehicle purchase</strong><br>' +
        (sdMeta.note || 'Calculated using state rate for ' + (vehicle.state || 'your state').toUpperCase())
      ) +
      (vehicle.state ? row('State', vehicle.state.toUpperCase()) : '') +
      row('Purchase price', fmt(vehicle.purchasePrice)) +
      (sdMeta.hasEvConcession ? row('Rate applied', 'EV concession rate') : '') +
      (sdMeta.savedVsStandard > 0 ? row('Saving vs standard rate', fmt(sdMeta.savedVsStandard)) : '') +
      totalRow(sdBreak.total);
    }

    // Fallback
    return '<p style="color:var(--color-text-muted);font-size:0.9rem">No breakdown available for this category.</p>';
  },
};
