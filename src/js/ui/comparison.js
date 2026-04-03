// TRUE COST — ui/comparison.js  (Neon Blue Edition)
// Single-card cost analysis: butterfly bars + sparkline + year-by-year chart

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
  if (!v) return 'Unknown';
  var parts = [v.make, v.model].filter(Boolean).join(' ');
  if (parts.length <= 14) return parts;
  return parts.slice(0, 13) + '\u2026';
}

// Per-category colors matching vehicle-card.js
const CAT_COLORS = {
  depreciation:    '#1877F2',
  fuel:            '#34C759',
  battery:         '#34C759',
  registration:    '#FF9500',
  insurance:       '#FF3B30',
  servicing:       '#AF52DE',
  tyres:           '#5AC8FA',
  lostCapital:     '#FF6B35',
  financeInterest: '#FF6B35',
};

const CATEGORIES = [
  { key: 'depreciation',    label: 'Depreciation' },
  { key: 'fuel',            label: 'Fuel / Energy' },
  { key: 'battery',         label: 'Battery' },
  { key: 'insurance',       label: 'Insurance' },
  { key: 'registration',    label: 'Registration' },
  { key: 'servicing',       label: 'Servicing' },
  { key: 'tyres',           label: 'Tyres' },
  { key: 'lostCapital',     label: 'Lost Capital' },
  { key: 'financeInterest', label: 'Finance' },
];

// Chart.js instances
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
        + '<div class="empty-state-icon">\uD83D\uDCCA</div>'
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
    const count = results.length;

    const totals  = results.map(function(r) { return r.costs.summary.totalOwnershipCost; });
    const minCost = Math.min.apply(null, totals);

    document.getElementById('compare-subtitle').textContent =
      count + ' vehicles \u00b7 ' + scenario.years + 'yr / '
      + (scenario.kmPerYear / 1000).toFixed(0) + 'k km/yr';

    // Active categories (any vehicle has > 0 cost)
    const activeCats = CATEGORIES.filter(function(c) {
      return results.some(function(r) { return (r.costs.total[c.key] || 0) > 0; });
    });

    var html = '';

    // ── Vehicle summary cards ────────────────────────────────────────────
    html += '<div class="compare-grid" data-count="' + count + '">';
    results.forEach(function(r) {
      var winner = r.costs.summary.totalOwnershipCost === minCost;
      html += '<div class="card" style="padding:12px;text-align:center'
        + (winner ? ';border:2px solid var(--color-accent)' : '') + '">';
      if (winner) html += '<div class="badge badge-success" style="margin-bottom:6px;font-size:10px">Best Value</div>';
      html += '<div style="font-size:12px;font-weight:700;line-height:1.3;margin-bottom:4px;color:var(--color-text)">' + chartLabel(r.vehicle) + '</div>';
      html += '<span class="badge ' + fuelBadgeClass(r.vehicle.fuelType) + '" style="font-size:9px">' + fuelTypeLabel(r.vehicle.fuelType) + '</span>';
      html += '<div style="margin-top:10px">';
      html += '<div style="font-size:18px;font-weight:900;color:' + (winner ? 'var(--color-accent)' : 'var(--color-text)') + ';letter-spacing:-0.5px">' + fmtAUD(r.costs.summary.totalOwnershipCost) + '</div>';
      html += '<div style="font-size:10px;color:var(--color-text-muted);margin-top:1px">' + scenario.years + '-yr total</div>';
      html += '<div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px">' + fmtAUD(r.costs.summary.costPerYear) + '/yr &middot; ' + fmtPerKm(r.costs.summary.costPerKm) + '</div>';
      html += '</div></div>';
    });
    html += '</div>'; // end compare-grid

    // ── Cost Analysis card ───────────────────────────────────────────────
    html += '<div class="card" style="padding:16px 16px 20px">';

    // Header row: title + sparkline canvas
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">';
    html += '<div>';
    html +=   '<div style="font-size:13px;font-weight:700;color:var(--color-text);text-transform:uppercase;letter-spacing:0.05em">Cost Breakdown</div>';
    html +=   '<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px">% of each vehicle\'s total cost</div>';
    html += '</div>';
    html += '<div style="flex-shrink:0;width:90px;height:52px;position:relative"><canvas id="chart-spark"></canvas></div>';
    html += '</div>';

    // Butterfly bars (optimised for 2 vehicles; stacked for 3-4)
    if (count === 2) {
      html += Comparison._butterflyHTML(results[0], results[1], activeCats);
    } else {
      html += Comparison._multiBarHTML(results, activeCats, scenario.years);
    }

    html += '</div>'; // end card

    // ── Year by Year trend card ──────────────────────────────────────────
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

    html += '<div class="card" style="padding:16px 16px 20px">';
    html += '<div style="font-size:13px;font-weight:700;color:var(--color-text);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Cumulative Cost</div>';
    html += '<div style="position:relative;height:220px"><canvas id="chart-yby"></canvas></div>';
    html += '</div>';

    container.innerHTML = html;

    // Render charts after DOM is ready
    requestAnimationFrame(function() {
      Comparison._renderSparkline(results, yearlyData, yearRange, scenario);
      Comparison._renderYbyY(results, yearlyData, yearRange);
    });
  },

  // ── Butterfly bar layout (2 vehicles) ────────────────────────────────
  _butterflyHTML: function(r1, r2, activeCats) {
    var t1 = r1.costs.summary.totalOwnershipCost;
    var t2 = r2.costs.summary.totalOwnershipCost;

    var html = '';
    html += '<div style="display:flex;align-items:center;margin-bottom:8px">';
    html += '<div style="flex:1;text-align:right;font-size:11px;font-weight:700;color:var(--color-primary)">'
          + chartLabelShort(r1.vehicle) + '</div>';
    html += '<div style="width:56px;text-align:center;font-size:10px;color:var(--color-text-muted)">Category</div>';
    html += '<div style="flex:1;font-size:11px;font-weight:700;color:var(--color-accent)">'
          + chartLabelShort(r2.vehicle) + '</div>';
    html += '</div>';

    activeCats.forEach(function(cat) {
      var v1   = r1.costs.total[cat.key] || 0;
      var v2   = r2.costs.total[cat.key] || 0;
      var pct1 = t1 > 0 ? Math.round((v1 / t1) * 100) : 0;
      var pct2 = t2 > 0 ? Math.round((v2 / t2) * 100) : 0;
      var col  = CAT_COLORS[cat.key] || '#1877F2';

      html += '<div style="display:flex;align-items:center;margin-bottom:7px;gap:4px">';

      // Left side: vehicle 1 (bar grows from center leftward)
      html += '<div style="flex:1;display:flex;align-items:center;gap:4px;justify-content:flex-end">';
      html +=   '<div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);width:24px;text-align:right">' + pct1 + '%</div>';
      html +=   '<div style="flex:1;height:9px;background:var(--color-bg-input);border-radius:4px 0 0 4px;overflow:hidden;direction:rtl">';
      html +=     '<div style="height:100%;width:' + pct1 + '%;background:' + col + ';border-radius:4px 0 0 4px;opacity:0.9"></div>';
      html +=   '</div>';
      html += '</div>';

      // Center: category label
      html += '<div style="width:56px;text-align:center;font-size:10px;color:var(--color-text-muted);line-height:1.2;flex-shrink:0">' + cat.label + '</div>';

      // Right side: vehicle 2
      html += '<div style="flex:1;display:flex;align-items:center;gap:4px">';
      html +=   '<div style="flex:1;height:9px;background:var(--color-bg-input);border-radius:0 4px 4px 0;overflow:hidden">';
      html +=     '<div style="height:100%;width:' + pct2 + '%;background:' + col + ';border-radius:0 4px 4px 0"></div>';
      html +=   '</div>';
      html +=   '<div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);width:24px">' + pct2 + '%</div>';
      html += '</div>';

      html += '</div>'; // end row
    });

    return html;
  },

  // ── Multi-vehicle stacked bars (3-4 vehicles) ─────────────────────────
  _multiBarHTML: function(results, activeCats, years) {
    const LINE_COLS = ['#1877F2', '#FF6B35', '#34C759', '#AF52DE'];
    var html = '';

    activeCats.forEach(function(cat) {
      var col = CAT_COLORS[cat.key] || '#1877F2';
      var max = Math.max.apply(null, results.map(function(r) {
        return r.costs.total[cat.key] || 0;
      }));
      if (max === 0) return;

      html += '<div style="margin-bottom:10px">';
      html += '<div style="font-size:11px;color:var(--color-text-secondary);font-weight:600;margin-bottom:4px">' + cat.label + '</div>';
      results.forEach(function(r, idx) {
        var val = r.costs.total[cat.key] || 0;
        var pct = max > 0 ? Math.round((val / max) * 100) : 0;
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">';
        html += '<div style="font-size:10px;color:var(--color-text-muted);width:14px">' + (idx + 1) + '</div>';
        html += '<div style="flex:1;height:8px;background:var(--color-bg-input);border-radius:4px;overflow:hidden">';
        html += '<div style="height:100%;width:' + pct + '%;background:' + (LINE_COLS[idx] || col) + ';border-radius:4px"></div>';
        html += '</div>';
        html += '<div style="font-size:10px;color:var(--color-text-secondary);width:40px;text-align:right">' + fmtAUD(val) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    });

    return html;
  },

  // ── Tiny sparkline (top-right of breakdown card) ──────────────────────
  _renderSparkline: function(results, yearlyData, yearRange, scenario) {
    var ctx = document.getElementById('chart-spark');
    if (!ctx || typeof Chart === 'undefined') return;

    const SPARK_COLS = ['#1877F2', '#FF6B35', '#34C759', '#AF52DE'];

    _sparkChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yearRange,
        datasets: yearlyData.map(function(d, idx) {
          var col = SPARK_COLS[idx % SPARK_COLS.length];
          return {
            data: d.byYear.map(function(v) { return Math.round(v); }),
            borderColor: col,
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.3,
            fill: false,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: { display: false },
          y: { display: false, min: 0 },
        },
        elements: { line: { borderCapStyle: 'round' } },
      },
    });
  },

  // ── Year by Year line chart ───────────────────────────────────────────
  _renderYbyY: function(results, yearlyData, yearRange) {
    var ctx = document.getElementById('chart-yby');
    if (!ctx || typeof Chart === 'undefined') return;

    const LINE_COLS = ['#1877F2', '#FF6B35', '#34C759', '#AF52DE'];
    Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#6B6B6B';

    _ybyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yearRange.map(function(y) { return 'Yr ' + y; }),
        datasets: yearlyData.map(function(d, idx) {
          var col = LINE_COLS[idx % LINE_COLS.length];
          return {
            label: chartLabelShort(d.vehicle),
            data: d.byYear.map(function(v) { return Math.round(v); }),
            borderColor: col,
            backgroundColor: col + '18',
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
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
