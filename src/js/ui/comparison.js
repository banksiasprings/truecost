// TRUE COST - ui/comparison.js
// Phase 5: Year-by-year cumulative cost line chart + table added.
const CHART_COLORS = {
  depreciation:    '#8B6355',
  fuel:            '#E8572A',
  battery:         '#4A90D9',
  registration:    '#2D5016',
  insurance:       '#7FB069',
  servicing:       '#D4A843',
  tyres:           '#A0785A',
  lostCapital:     '#6B7A8D',
  financeInterest: '#C1666B',
};

// Per-vehicle line colours for the Yearly chart
const LINE_COLORS = ['#E8572A', '#2D5016', '#4A90D9', '#D4A843'];

const COST_CATEGORIES = [
  { key: 'depreciation',    label: 'Depreciation' },
  { key: 'fuel',            label: 'Fuel/Energy' },
  { key: 'battery',         label: 'Battery' },
  { key: 'registration',    label: 'Registration' },
  { key: 'insurance',       label: 'Insurance' },
  { key: 'servicing',       label: 'Servicing' },
  { key: 'tyres',           label: 'Tyres' },
  { key: 'lostCapital',     label: 'Lost Capital' },
  { key: 'financeInterest', label: 'Finance' },
];

const _charts = {};
function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

const Comparison = {
  async render(settings) {
    const vehicles = await getAllVehicles();
    const container = document.getElementById('compare-container');
    if (!container) return;

    if (vehicles.length < 2) {
      ['stacked','total','perkm','yearly'].forEach(destroyChart);
      container.innerHTML = '<div class="empty-state">'
        + '<div class="empty-state-icon">\uD83D\uDCCA</div>'
        + '<h2 class="empty-state-title">Add at least 2 vehicles</h2>'
        + '<p class="empty-state-desc">Compare up to 4 vehicles side-by-side across every cost category.</p>'
        + '<button class="btn btn-primary btn-pill" onclick="Router.navigate(\'vehicles\')">Go to Vehicles</button>'
        + '</div>';
      return;
    }

    const s = settings || App.settings || Defaults.scenario;
    const scenario = {
      years: s.years || 5,
      kmPerYear: s.kmPerYear || 15000,
      opportunityCostRate: s.opportunityCostRate || 4.5,
    };

    const results = vehicles.map(function(v) {
      return { vehicle: v, costs: calculateCosts(v, scenario) };
    });

    const count = Math.min(results.length, 4);
    const subset = results.slice(0, count);

    const minCost = Math.min.apply(null, subset.map(function(r) {
      return r.costs.summary.totalOwnershipCost;
    }));

    document.getElementById('compare-subtitle').textContent =
      count + ' vehicles \u00b7 ' + scenario.years + 'yr / '
      + (scenario.kmPerYear / 1000).toFixed(0) + 'k km/yr';

    const activeCategories = COST_CATEGORIES.filter(function(c) {
      return subset.some(function(r) { return (r.costs.total[c.key] || 0) > 0; });
    });

    // Precompute year-by-year cumulative costs for the Yearly tab
    var yearRange = [];
    for (var yr = 1; yr <= scenario.years; yr++) yearRange.push(yr);
    var yearlyData = subset.map(function(r) {
      return {
        vehicle: r.vehicle,
        byYear: yearRange.map(function(y) {
          return calculateCosts(r.vehicle, {
            years: y,
            kmPerYear: scenario.kmPerYear,
            opportunityCostRate: scenario.opportunityCostRate,
          }).summary.totalOwnershipCost;
        }),
      };
    });

    var html = '';

    // Vehicle header cards
    html += '<div class="compare-grid" data-count="' + count + '">';
    subset.forEach(function(r) {
      var isWinner = r.costs.summary.totalOwnershipCost === minCost;
      html += '<div class="card"' + (isWinner ? ' style="border:2px solid var(--color-primary)"' : '') + '>';
      if (isWinner) html += '<div class="badge badge-success" style="margin-bottom:8px">Best Value</div>';
      html += '<div style="font-weight:700;font-size:13px;line-height:1.3;margin-bottom:8px">' + vehicleLabel(r.vehicle) + '</div>';
      html += '<span class="badge ' + fuelBadgeClass(r.vehicle.fuelType) + '">' + fuelTypeLabel(r.vehicle.fuelType) + '</span>';
      html += '<div style="margin-top:12px;text-align:center">';
      html += '<div style="font-size:22px;font-weight:700;color:' + (isWinner ? 'var(--color-primary)' : 'var(--color-text)') + '">' + fmtAUD(r.costs.summary.totalOwnershipCost) + '</div>';
      html += '<div style="font-size:11px;color:var(--color-text-muted)">' + scenario.years + 'yr total</div>';
      html += '<div style="font-size:13px;color:var(--color-text-secondary);margin-top:4px">' + fmtPerKm(r.costs.summary.costPerKm) + '</div>';
      html += '</div></div>';
    });
    html += '</div>';

    // Chart tabs (4 tabs now)
    html += '<div style="display:flex;gap:8px;margin:16px 0 12px;flex-wrap:wrap">';
    html += '<button class="btn btn-sm btn-pill chart-tab active" data-tab="stacked" style="background:var(--color-accent);color:#fff">Breakdown</button>';
    html += '<button class="btn btn-sm btn-pill chart-tab" data-tab="total" style="background:var(--color-bg-input);color:var(--color-text)">Total</button>';
    html += '<button class="btn btn-sm btn-pill chart-tab" data-tab="perkm" style="background:var(--color-bg-input);color:var(--color-text)">Per km</button>';
    html += '<button class="btn btn-sm btn-pill chart-tab" data-tab="yearly" style="background:var(--color-bg-input);color:var(--color-text)">Yearly \u2197</button>';
    html += '</div>';

    // Chart canvases
    html += '<div class="card" style="padding:16px">';
    html += '<div id="chart-stacked-wrap" style="position:relative;height:' + (Math.max(260, activeCategories.length * 52 + 80)) + 'px"><canvas id="chart-stacked"></canvas></div>';
    html += '<div id="chart-total-wrap" class="hidden" style="position:relative;height:220px"><canvas id="chart-total"></canvas></div>';
    html += '<div id="chart-perkm-wrap" class="hidden" style="position:relative;height:220px"><canvas id="chart-perkm"></canvas></div>';
    html += '<div id="chart-yearly-wrap" class="hidden" style="position:relative;height:280px"><canvas id="chart-yearly"></canvas></div>';
    html += '</div>';

    // Legend (for stacked chart)
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px 16px;padding:8px 0 16px">';
    activeCategories.forEach(function(c) {
      html += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--color-text-secondary)">';
      html += '<span style="width:12px;height:12px;border-radius:3px;background:' + CHART_COLORS[c.key] + ';flex-shrink:0"></span>';
      html += c.label + '</div>';
    });
    html += '</div>';

    // Year-by-year cumulative cost table
    html += '<div class="card"><h2 class="card-title">Year-by-Year Cumulative Cost</h2>';
    html += '<div style="overflow-x:auto">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    html += '<thead><tr>';
    html += '<th style="text-align:left;padding:8px 6px;border-bottom:2px solid var(--color-border);color:var(--color-text-muted);font-weight:600;white-space:nowrap">Year</th>';
    subset.forEach(function(r, idx) {
      html += '<th style="text-align:right;padding:8px 6px;border-bottom:2px solid var(--color-border);font-weight:700;color:' + LINE_COLORS[idx % LINE_COLORS.length] + '">';
      html += r.vehicle.make + ' ' + r.vehicle.model;
      html += '</th>';
    });
    html += '</tr></thead><tbody>';
    yearRange.forEach(function(y, i) {
      var rowVals = yearlyData.map(function(d) { return d.byYear[i]; });
      var minVal = Math.min.apply(null, rowVals);
      var isLast = y === scenario.years;
      html += '<tr>';
      html += '<td style="padding:8px 6px;border-bottom:1px solid var(--color-border);color:var(--color-text-muted);font-weight:' + (isLast ? '700' : '400') + '">' + y + 'yr</td>';
      rowVals.forEach(function(val, vi) {
        var isBest = val === minVal;
        var style = 'text-align:right;padding:8px 6px;border-bottom:1px solid var(--color-border);';
        style += 'font-weight:' + (isBest ? '700' : isLast ? '600' : '400') + ';';
        style += 'color:' + (isBest ? 'var(--color-primary)' : 'var(--color-text)') + ';';
        html += '<td style="' + style + '">' + fmtAUD(Math.round(val)) + (isBest ? ' \u2713' : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    // Savings callout
    var finalVals = yearlyData.map(function(d) { return d.byYear[scenario.years - 1]; });
    var sortedFinal = finalVals.slice().sort(function(a,b){return a-b;});
    if (sortedFinal.length >= 2) {
      var saving = Math.round(sortedFinal[sortedFinal.length - 1] - sortedFinal[0]);
      html += '<p style="margin-top:12px;font-size:12px;color:var(--color-text-muted)">Best value saves <strong>' + fmtAUD(saving) + '</strong> over ' + scenario.years + ' years vs the most expensive option.</p>';
    }
    html += '</div></div>';

    // Detailed category breakdown table
    html += '<div class="card"><h2 class="card-title">Category Breakdown</h2>';
    COST_CATEGORIES.forEach(function(cat) {
      var vals = subset.map(function(r) { return r.costs.total[cat.key] || 0; });
      if (!vals.some(function(v) { return v > 0; })) return;
      var maxVal = Math.max.apply(null, vals);
      var minVal = Math.min.apply(null, vals.filter(function(v) { return v > 0; }));
      html += '<div style="margin-bottom:20px">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      html += '<span style="width:10px;height:10px;border-radius:2px;background:' + CHART_COLORS[cat.key] + ';flex-shrink:0"></span>';
      html += '<span style="font-size:13px;font-weight:600;color:var(--color-text-secondary)">' + cat.label + '</span></div>';
      html += '<div class="compare-grid" data-count="' + count + '">';
      vals.forEach(function(val) {
        var pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        var isBest = val === minVal && val > 0;
        html += '<div>';
        html += '<div style="font-size:13px;font-weight:' + (isBest ? '700' : '400') + ';color:' + (isBest ? 'var(--color-primary)' : 'var(--color-text)') + '">' + fmtAUD(val) + '</div>';
        html += '<div style="height:4px;border-radius:2px;background:var(--color-border);margin-top:4px;overflow:hidden">';
        html += '<div style="height:100%;width:' + pct.toFixed(1) + '%;background:' + (isBest ? 'var(--color-primary)' : CHART_COLORS[cat.key]) + ';border-radius:2px"></div>';
        html += '</div></div>';
      });
      html += '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Wire tab buttons (now includes 'yearly')
    container.querySelectorAll('.chart-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        container.querySelectorAll('.chart-tab').forEach(function(b) {
          b.style.background = 'var(--color-bg-input)';
          b.style.color = 'var(--color-text)';
          b.classList.remove('active');
        });
        btn.style.background = 'var(--color-accent)';
        btn.style.color = '#fff';
        btn.classList.add('active');
        ['stacked','total','perkm','yearly'].forEach(function(tab) {
          var el = document.getElementById('chart-' + tab + '-wrap');
          if (el) el.classList.toggle('hidden', tab !== btn.dataset.tab);
        });
        // Double-rAF: wait for layout reflow before resizing the chart
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            if (_charts[btn.dataset.tab]) _charts[btn.dataset.tab].resize();
          });
        });
      });
    });

    requestAnimationFrame(function() {
      Comparison.renderCharts(subset, scenario, activeCategories, yearlyData, yearRange);
    });
  },

  renderCharts: function(subset, scenario, activeCategories, yearlyData, yearRange) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded - charts unavailable');
      return;
    }
    // Temporarily unhide all chart containers so Chart.js initializes with correct dimensions
    ['total','perkm','yearly'].forEach(function(id) {
      var el = document.getElementById('chart-' + id + '-wrap');
      if (el) el.classList.remove('hidden');
    });
    Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#6B6B6B';

    var labels = subset.map(function(r) { return vehicleLabel(r.vehicle); });

    // Horizontal grouped bar: cost breakdown by category, one bar per vehicle
    destroyChart('stacked');
    var stackedCtx = document.getElementById('chart-stacked');
    if (stackedCtx) {
      var vehicleColors = ['#E8572A', '#2D5016', '#4A90D9', '#D4A843'];
      var catLabels = activeCategories.map(function(c) { return c.label; });
      var vehicleDatasets = subset.map(function(r, idx) {
        var col = vehicleColors[idx % vehicleColors.length];
        return {
          label: vehicleLabel(r.vehicle),
          data: activeCategories.map(function(cat) {
            return Math.round(r.costs.total[cat.key] || 0);
          }),
          backgroundColor: col + 'CC',
          borderColor: col,
          borderWidth: 0,
          borderRadius: 3,
          borderSkipped: false,
        };
      });
      var breakdownLabelPlugin = {
        id: 'breakdownLabels',
        afterDatasetsDraw: function(chart) {
          var ctx2 = chart.ctx;
          chart.data.datasets.forEach(function(dataset, i) {
            var meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach(function(bar, j) {
              var val = dataset.data[j];
              if (!val || val <= 0) return;
              ctx2.save();
              ctx2.fillStyle = '#444';
              ctx2.font = 'bold 10px system-ui, -apple-system, sans-serif';
              ctx2.textAlign = 'left';
              ctx2.textBaseline = 'middle';
              var label = val >= 1000 ? '$' + (val / 1000).toFixed(1) + 'k' : '$' + val;
              ctx2.fillText(label, bar.x + 4, bar.y);
              ctx2.restore();
            });
          });
        },
      };
      _charts['stacked'] = new Chart(stackedCtx, {
        type: 'bar',
        data: { labels: catLabels, datasets: vehicleDatasets },
        plugins: [breakdownLabelPlugin],
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { boxWidth: 12, padding: 14, font: { size: 11 } },
            },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ' ' + ctx.dataset.label + ': $' + ctx.parsed.x.toLocaleString('en-AU');
                },
              },
            },
          },
          layout: { padding: { right: 60 } },
          scales: {
            x: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 11 } },
            },
          },
        },
      });
    }
    // Horizontal bar: total cost
    destroyChart('total');
    var totalCtx = document.getElementById('chart-total');
    if (totalCtx) {
      var totals = subset.map(function(r) { return Math.round(r.costs.summary.totalOwnershipCost); });
      var minTotal = Math.min.apply(null, totals);
      _charts['total'] = new Chart(totalCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total cost',
            data: totals,
            backgroundColor: totals.map(function(v) { return v === minTotal ? '#2D5016' : '#E8572A'; }),
            borderWidth: 0,
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) { return ' $' + ctx.parsed.x.toLocaleString('en-AU'); },
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
            },
            y: { grid: { display: false } },
          },
        },
      });
    }

    // Horizontal bar: per km
    destroyChart('perkm');
    var perkmCtx = document.getElementById('chart-perkm');
    if (perkmCtx) {
      var perKms = subset.map(function(r) {
        return parseFloat((r.costs.summary.costPerKm * 100).toFixed(2));
      });
      var minPerKm = Math.min.apply(null, perKms);
      _charts['perkm'] = new Chart(perkmCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cost per km',
            data: perKms,
            backgroundColor: perKms.map(function(v) { return v === minPerKm ? '#2D5016' : '#7FB069'; }),
            borderWidth: 0,
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) { return ' ' + ctx.parsed.x.toFixed(1) + 'c/km'; },
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: function(v) { return v + 'c'; } },
            },
            y: { grid: { display: false } },
          },
        },
      });
    }

    // Line chart: cumulative cost by year
    destroyChart('yearly');
    var yearlyCtx = document.getElementById('chart-yearly');
    if (yearlyCtx && yearlyData && yearRange) {
      var yearLabels = yearRange.map(function(y) { return 'Yr ' + y; });
      _charts['yearly'] = new Chart(yearlyCtx, {
        type: 'line',
        data: {
          labels: yearLabels,
          datasets: yearlyData.map(function(d, idx) {
            var col = LINE_COLORS[idx % LINE_COLORS.length];
            return {
              label: vehicleLabel(d.vehicle),
              data: d.byYear.map(function(v) { return Math.round(v); }),
              borderColor: col,
              backgroundColor: col + '18',
              borderWidth: 2.5,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.35,
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
              labels: { boxWidth: 14, padding: 12, font: { size: 11 } },
            },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ' ' + ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString('en-AU');
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
            },
          },
        },
      });
    }
    // Re-hide non-active chart containers
    ['total','perkm','yearly'].forEach(function(id) {
      var el = document.getElementById('chart-' + id + '-wrap');
      if (el) el.classList.add('hidden');
    });
  },
};
