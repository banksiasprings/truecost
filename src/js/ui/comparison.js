// TRUE COST — ui/comparison.js  (Neon Blue Edition)
// Compare page: Total cost card + per-category % bars + sparkline + year-by-year

function chartLabel(v) {
  if (!v) return 'Unknown';
  var year = String(v.year || '');
  if (year.length === 2) year = (parseInt(year, 10) >= 50 ? '19' : '20') + year;
  var base = [year, v.make, v.model].filter(Boolean).join(' ');
  var full = v.variant ? base + ' ' + v.variant : base;
  if (full.length <= 22) return full;
  return full.slice(0, 21) + '\u2026';
}

function chartLabelShort(v) {
  if (!v) return '?';
  var parts = [v.make, v.model].filter(Boolean).join(' ');
  if (parts.length <= 13) return parts;
  return parts.slice(0, 12) + '\u2026';
}

const CAT_COLORS = {
  depreciation:    '#1877F2',
  fuel:            '#34C759',
  battery:         '#34C759',
  registration:    '#FF9500',
  insurance:       '#FF3B30',
  servicing:       '#AF52DE',
  tyres:           '#FF9500',
  lostCapital:     '#FF6B35',
  financeInterest: '#FF6B35',
};

const CATEGORIES = [
  { key: 'fuel',            label: 'Fuel / Energy' },
  { key: 'battery',         label: 'Battery' },
  { key: 'tyres',           label: 'Tyres' },
  { key: 'servicing',       label: 'Servicing' },
  { key: 'insurance',       label: 'Insurance' },
  { key: 'registration',    label: 'Registration' },
  { key: 'depreciation',    label: 'Depreciation' },
  { key: 'lostCapital',     label: 'Lost Capital' },
  { key: 'financeInterest', label: 'Finance' },
];

var _sparkChart = null;
var _ybyChart   = null;

function destroyCharts() {
  if (_sparkChart) { try { _sparkChart.destroy(); } catch(e) {} _sparkChart = null; }
  if (_ybyChart)   { try { _ybyChart.destroy();   } catch(e) {} _ybyChart   = null; }
}

const Comparison = {

  async render(settings) {
    destroyCharts();

    const vehicles  = await getAllVehicles();
    const container = document.getElementById('compare-container');
    if (!container) return;

    if (vehicles.length < 2) {
      container.innerHTML =
        '<div class="empty-state">'
        + '<div style="margin-bottom:20px">'
        + '<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">'
        + '<rect width="80" height="80" rx="24" fill="#0D1E3A"/>'
        // Car body
        + '<path d="M14 50 L18 36 Q20 31 25 31 L55 31 Q60 31 62 36 L66 50 Q67 51 66 53 L66 57 Q66 60 63 60 L59 60 Q56 60 56 57 L56 55 L24 55 L24 57 Q24 60 21 60 L17 60 Q14 60 14 57 L14 53 Q13 51 14 50Z" fill="#1877F2"/>'
        // Windshield
        + '<path d="M22 46 L26 34 L54 34 L58 46Z" fill="#0D3A6E" opacity="0.7"/>'
        // Wheels
        + '<circle cx="24" cy="56" r="5.5" fill="#08101E" stroke="#38BFFF" stroke-width="2"/>'
        + '<circle cx="56" cy="56" r="5.5" fill="#08101E" stroke="#38BFFF" stroke-width="2"/>'
        + '<circle cx="24" cy="56" r="2" fill="#38BFFF"/>'
        + '<circle cx="56" cy="56" r="2" fill="#38BFFF"/>'
        // Dollar badge
        + '<circle cx="61" cy="26" r="10" fill="#FF6B35" opacity="0.15"/>'
        + '<circle cx="61" cy="26" r="7.5" stroke="#FF6B35" stroke-width="1.5" fill="none"/>'
        + '<text x="61" y="30" text-anchor="middle" font-size="9" font-weight="800" fill="#FF6B35">$</text>'
        + '</svg>'
        + '</div>'
        + '<h2 class="empty-state-title">Add at least 2 vehicles</h2>'
        + '<p class="empty-state-desc">Compare up to 4 vehicles side-by-side across every cost category.</p>'
        + '<button class="btn btn-primary btn-pill" onclick="Router.navigate(\'vehicles\')">Go to Vehicles</button>'
        + '</div>';
      return;
    }

    const s = settings || App.settings || Defaults.scenario;
    const scenario = {
      years:               s.years               || 5,
      kmPerYear:           s.kmPerYear            || 15000,
      opportunityCostRate: s.opportunityCostRate  || 4.5,
    };

    const results = vehicles.slice(0, 4).map(function(v) {
      return { vehicle: v, costs: calculateCosts(v, scenario) };
    });
    const count   = results.length;
    const totals  = results.map(function(r) { return r.costs.summary.totalOwnershipCost; });
    const minCost = Math.min.apply(null, totals);

    document.getElementById('compare-subtitle').textContent =
      count + ' vehicles \u00b7 ' + scenario.years + 'yr / '
      + (scenario.kmPerYear / 1000).toFixed(0) + 'k km/yr';

    const activeCats = CATEGORIES.filter(function(c) {
      return results.some(function(r) { return (r.costs.total[c.key] || 0) > 0; });
    });

    // Year-by-year data for sparkline + trend chart
    var yearRange = [];
    for (var y = 1; y <= scenario.years; y++) yearRange.push(y);
    var yearlyData = results.map(function(r) {
      return {
        vehicle: r.vehicle,
        byYear: yearRange.map(function(yr) {
          return calculateCosts(r.vehicle, {
            years: yr,
            kmPerYear: scenario.kmPerYear,
            opportunityCostRate: scenario.opportunityCostRate,
          }).summary.totalOwnershipCost;
        }),
      };
    });

    var html = '';

    // ── Vehicle summary cards ────────────────────────────────────────────
    html += '<div class="compare-grid" data-count="' + count + '">';
    results.forEach(function(r) {
      var winner = r.costs.summary.totalOwnershipCost === minCost;
      html += '<div class="card" style="padding:12px;text-align:center'
        + (winner ? ';border:2px solid var(--color-accent)' : '') + '">';
      if (winner) html += '<div class="badge badge-success" style="margin-bottom:6px;font-size:10px">Best Value</div>';
      html += '<div style="font-size:12px;font-weight:700;line-height:1.3;margin-bottom:4px">' + chartLabel(r.vehicle) + '</div>';
      html += '<span class="badge ' + fuelBadgeClass(r.vehicle.fuelType) + '" style="font-size:9px">' + fuelTypeLabel(r.vehicle.fuelType) + '</span>';
      html += '<div style="margin-top:10px">';
      html += '<div style="font-size:18px;font-weight:900;color:' + (winner ? 'var(--color-accent)' : 'var(--color-text)') + ';letter-spacing:-0.5px">' + fmtAUD(r.costs.summary.totalOwnershipCost) + '</div>';
      html += '<div style="font-size:10px;color:var(--color-text-muted);margin-top:1px">' + scenario.years + '-yr total</div>';
      html += '<div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px">' + fmtAUD(r.costs.summary.costPerYear) + '/yr &middot; ' + fmtPerKm(r.costs.summary.costPerKm) + '</div>';
      html += '</div></div>';
    });
    html += '</div>';

    // ── Main analysis card ───────────────────────────────────────────────
    html += '<div class="card" style="padding:18px 16px 22px">';

    // Top row: "Total Ownership Cost" + big number + sparkline
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between">';
    html += '<div>';
    html +=   '<div style="font-size:12px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.06em">Total Ownership Cost</div>';
    html +=   '<div style="font-size:28px;font-weight:900;color:var(--color-text);letter-spacing:-1px;margin-top:2px">'
           +    fmtAUD(minCost) + '</div>';
    html +=   '<div style="font-size:11px;color:var(--color-text-muted);margin-top:1px">best vehicle &bull; ' + scenario.years + '-year total</div>';
    html += '</div>';
    // Sparkline canvas
    html += '<div style="flex-shrink:0;width:88px;height:54px;position:relative;margin-top:2px"><canvas id="chart-spark"></canvas></div>';
    html += '</div>';

    // Divider
    html += '<div style="height:1px;background:var(--color-border);margin:16px 0 14px"></div>';

    // Vehicle name legend row
    if (count <= 2) {
      html += '<div style="display:flex;align-items:center;margin-bottom:12px;gap:8px">';
      html += '<div style="flex:1;display:flex;align-items:center;gap:5px;justify-content:flex-end">';
      html += '<div style="width:10px;height:10px;border-radius:50%;background:#1877F2;flex-shrink:0"></div>';
      html += '<div style="font-size:11px;font-weight:700;color:#1877F2;text-align:right">' + chartLabelShort(results[0].vehicle) + '</div>';
      html += '</div>';
      html += '<div style="width:60px;text-align:center;font-size:10px;color:var(--color-text-muted)">vs</div>';
      html += '<div style="flex:1;display:flex;align-items:center;gap:5px">';
      html += '<div style="width:10px;height:10px;border-radius:50%;background:#FF6B35;flex-shrink:0"></div>';
      html += '<div style="font-size:11px;font-weight:700;color:#FF6B35">' + chartLabelShort(results[1].vehicle) + '</div>';
      html += '</div>';
      html += '</div>';
    }

    // Category bars
    if (count <= 2) {
      html += Comparison._dualBars(results[0], results[1], activeCats);
    } else {
      html += Comparison._multiBars(results, activeCats);
    }

    html += '</div>'; // end card

    // ── Year by Year card ────────────────────────────────────────────────
    html += '<div class="card" style="padding:16px 16px 20px">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px">Cost Over Time</div>';
    html += '<div style="position:relative;height:210px"><canvas id="chart-yby"></canvas></div>';
    html += '</div>';

    container.innerHTML = html;

    requestAnimationFrame(function() {
      Comparison._renderSparkline(yearlyData, yearRange);
      Comparison._renderYbyY(results, yearlyData, yearRange);
    });
  },

  // ── Dual horizontal bars (2-vehicle comparison) ───────────────────────
  // Each category row:  [V1%] [bar] Category [bar] [V2%]
  _dualBars: function(r1, r2, activeCats) {
    var t1 = r1.costs.summary.totalOwnershipCost;
    var t2 = r2.costs.summary.totalOwnershipCost;
    var html = '';

    activeCats.forEach(function(cat) {
      var v1   = r1.costs.total[cat.key] || 0;
      var v2   = r2.costs.total[cat.key] || 0;
      var pct1 = t1 > 0 ? Math.round((v1 / t1) * 100) : 0;
      var pct2 = t2 > 0 ? Math.round((v2 / t2) * 100) : 0;
      var col  = CAT_COLORS[cat.key] || '#1877F2';

      // Row: label left-aligned, then two bars with %
      html += '<div style="margin-bottom:11px">';

      // Category label
      html += '<div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:5px">';
      html += '<div style="width:8px;height:8px;border-radius:2px;background:' + col + ';flex-shrink:0"></div>';
      html += cat.label;
      html += '</div>';

      // Vehicle 1 bar
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">';
      html += '<div style="flex:1;height:10px;background:var(--color-bg-input);border-radius:5px;overflow:hidden">';
      html += '<div style="height:100%;width:' + pct1 + '%;background:' + col + ';border-radius:5px;transition:width 0.5s ease"></div>';
      html += '</div>';
      html += '<div style="font-size:11px;font-weight:700;color:#1877F2;width:30px;text-align:right">' + pct1 + '%</div>';
      html += '</div>';

      // Vehicle 2 bar
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<div style="flex:1;height:10px;background:var(--color-bg-input);border-radius:5px;overflow:hidden">';
      html += '<div style="height:100%;width:' + pct2 + '%;background:' + col + ';border-radius:5px;opacity:0.5;transition:width 0.5s ease"></div>';
      html += '</div>';
      html += '<div style="font-size:11px;font-weight:700;color:#FF6B35;width:30px;text-align:right">' + pct2 + '%</div>';
      html += '</div>';

      html += '</div>';
    });

    return html;
  },

  // ── Multi-vehicle bars (3-4 vehicles) ────────────────────────────────
  _multiBars: function(results, activeCats) {
    var COLS = ['#1877F2', '#FF6B35', '#34C759', '#AF52DE'];
    var html = '';

    activeCats.forEach(function(cat) {
      var col = CAT_COLORS[cat.key] || '#1877F2';
      var totals = results.map(function(r) { return r.costs.summary.totalOwnershipCost; });

      html += '<div style="margin-bottom:12px">';
      html += '<div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:5px;display:flex;align-items:center;gap:5px">';
      html += '<div style="width:8px;height:8px;border-radius:2px;background:' + col + ';flex-shrink:0"></div>';
      html += cat.label;
      html += '</div>';

      results.forEach(function(r, idx) {
        var val  = r.costs.total[cat.key] || 0;
        var tot  = r.costs.summary.totalOwnershipCost;
        var pct  = tot > 0 ? Math.round((val / tot) * 100) : 0;
        var rcol = COLS[idx % COLS.length];
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">';
        html += '<div style="font-size:10px;color:var(--color-text-muted);width:12px;font-weight:700">' + (idx + 1) + '</div>';
        html += '<div style="flex:1;height:9px;background:var(--color-bg-input);border-radius:5px;overflow:hidden">';
        html += '<div style="height:100%;width:' + pct + '%;background:' + rcol + ';border-radius:5px"></div>';
        html += '</div>';
        html += '<div style="font-size:10px;font-weight:700;color:' + rcol + ';width:28px;text-align:right">' + pct + '%</div>';
        html += '</div>';
      });

      html += '</div>';
    });

    return html;
  },

  // ── Sparkline (top-right of main card) ───────────────────────────────
  _renderSparkline: function(yearlyData, yearRange) {
    var ctx = document.getElementById('chart-spark');
    if (!ctx || typeof Chart === 'undefined') return;

    _sparkChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yearRange,
        datasets: yearlyData.map(function(d, idx) {
          var col = idx === 0 ? '#1877F2' : '#FF6B35';
          return {
            data: d.byYear.map(function(v) { return Math.round(v); }),
            borderColor: col,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: false,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 0 } },
      },
    });
  },

  // ── Year by Year line chart ───────────────────────────────────────────
  _renderYbyY: function(results, yearlyData, yearRange) {
    var ctx = document.getElementById('chart-yby');
    if (!ctx || typeof Chart === 'undefined') return;

    var COLS = ['#1877F2', '#FF6B35', '#34C759', '#AF52DE'];
    Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#6B6B6B';

    _ybyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yearRange.map(function(y) { return 'Yr ' + y; }),
        datasets: yearlyData.map(function(d, idx) {
          var col = COLS[idx % COLS.length];
          return {
            label: chartLabelShort(d.vehicle),
            data: d.byYear.map(function(v) { return Math.round(v); }),
            borderColor: col,
            backgroundColor: col + '15',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.3,
            fill: false,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 12, padding: 14, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: function(c) {
                return ' ' + c.dataset.label + ': $' + c.parsed.y.toLocaleString('en-AU');
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            min: 0,
            ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
          },
        },
      },
    });
  },
};
