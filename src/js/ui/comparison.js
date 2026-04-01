// TRUE COST - ui/comparison.js
// Phase 6: Single chart card with 5 clean tabs (Breakdown, Total, Per km, Yearly, Year by Year)

function chartLabel(v) {
  if (!v) return "Unknown";
  var year = String(v.year || "");
  if (year.length === 2) year = (parseInt(year, 10) >= 50 ? "19" : "20") + year;
  var base = [year, v.make, v.model].filter(Boolean).join(" ");
  var full = v.variant ? base + " " + v.variant : base;
  if (full.length <= 25) return full;
  return full.slice(0, 24) + "\u2026";
}

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

const ALL_TABS = ['stacked', 'total', 'perkm', 'yearly', 'yearbyyear'];

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
      ALL_TABS.forEach(destroyChart);
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

    // Precompute year-by-year cumulative costs
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
      html += '<div class="card" style="padding:12px' + (isWinner ? ';border:2px solid var(--color-accent)' : '') + '">';
      if (isWinner) html += '<div class="badge badge-success" style="margin-bottom:6px">Best Value</div>';
      html += '<div style="font-weight:700;font-size:13px;line-height:1.3;margin-bottom:6px">' + vehicleLabel(r.vehicle) + '</div>';
      html += '<span class="badge ' + fuelBadgeClass(r.vehicle.fuelType) + '">' + fuelTypeLabel(r.vehicle.fuelType) + '</span>';
      html += '<div style="margin-top:10px;text-align:center">';
      html += '<div style="font-size:20px;font-weight:800;color:' + (isWinner ? 'var(--color-accent)' : 'var(--color-text)') + '">' + fmtAUD(r.costs.summary.totalOwnershipCost) + '</div>';
      html += '<div style="font-size:10px;color:var(--color-text-muted);margin-top:1px">' + scenario.years + 'yr total</div>';
      html += '<div style="font-size:12px;color:var(--color-text-secondary);margin-top:3px">' + fmtAUD(r.costs.summary.costPerYear) + '/yr &middot; ' + fmtPerKm(r.costs.summary.costPerKm) + '</div>';
      html += '</div></div>';
    });
    html += '</div>';

    // Single chart card with tab bar
    html += '<div class="card" style="padding:16px 16px 20px">';

    // Tab bar - pill style, active = brand orange #E8572A
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">';
    var tabDefs = [
      { id: 'stacked',    label: 'Breakdown' },
      { id: 'total',      label: 'Total' },
      { id: 'perkm',      label: 'Per km' },
      { id: 'yearly',     label: 'Yearly' },
      { id: 'yearbyyear', label: 'Year by Year' },
    ];
    tabDefs.forEach(function(t, i) {
      var isActive = i === 0;
      html += '<button class="chart-tab" data-tab="' + t.id + '" style="'
        + 'padding:6px 14px;border-radius:20px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.15s;'
        + (isActive
          ? 'background:#E8572A;color:#fff;'
          : 'background:rgba(0,0,0,0.07);color:var(--color-text-secondary);')
        + '">' + t.label + '</button>';
    });
    html += '</div>';

    // Chart canvases (hidden by default except first)
    var breakdownH = Math.max(260, activeCategories.length * 52 + 80);
    html += '<div id="chart-stacked-wrap"    style="position:relative;height:' + breakdownH + 'px"><canvas id="chart-stacked"></canvas></div>';
    html += '<div id="chart-total-wrap"      style="position:relative;height:240px;display:none"><canvas id="chart-total"></canvas></div>';
    html += '<div id="chart-perkm-wrap"      style="position:relative;height:240px;display:none"><canvas id="chart-perkm"></canvas></div>';
    html += '<div id="chart-yearly-wrap"     style="position:relative;height:280px;display:none"><canvas id="chart-yearly"></canvas></div>';
    html += '<div id="chart-yearbyyear-wrap" style="position:relative;height:300px;display:none"><canvas id="chart-yearbyyear"></canvas></div>';

    html += '</div>'; // end card

    // Category legend (only shown for Breakdown tab)
    html += '<div id="chart-legend" style="display:flex;flex-wrap:wrap;gap:6px 14px;padding:6px 0 12px">';
    activeCategories.forEach(function(c) {
      html += '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--color-text-secondary)">';
      html += '<span style="width:10px;height:10px;border-radius:2px;background:' + CHART_COLORS[c.key] + ';flex-shrink:0"></span>';
      html += c.label + '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Wire tab buttons
    container.querySelectorAll('.chart-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetTab = btn.dataset.tab;

        // Update tab button styles
        container.querySelectorAll('.chart-tab').forEach(function(b) {
          var active = b.dataset.tab === targetTab;
          b.style.background = active ? '#E8572A' : 'rgba(0,0,0,0.07)';
          b.style.color = active ? '#fff' : 'var(--color-text-secondary)';
        });

        // Show/hide chart panels
        ALL_TABS.forEach(function(tab) {
          var el = document.getElementById('chart-' + tab + '-wrap');
          if (el) el.style.display = tab === targetTab ? '' : 'none';
        });

        // Show/hide legend (only for breakdown)
        var legendEl = document.getElementById('chart-legend');
        if (legendEl) legendEl.style.display = targetTab === 'stacked' ? '' : 'none';

        // Resize chart after layout reflow
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            if (_charts[targetTab]) _charts[targetTab].resize();
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

    // Temporarily show all chart containers so Chart.js measures correct dimensions
    ALL_TABS.forEach(function(id) {
      var el = document.getElementById('chart-' + id + '-wrap');
      if (el) el.style.display = '';
    });

    Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#6B6B6B';

    var labels = subset.map(function(r) { return chartLabel(r.vehicle); });

    // TAB 1: Breakdown - horizontal grouped bar (cost by category per vehicle)
    destroyChart('stacked');
    var stackedCtx = document.getElementById('chart-stacked');
    if (stackedCtx) {
      var catLabels = activeCategories.map(function(c) { return c.label; });
      var vehicleDatasets = subset.map(function(r, idx) {
        var col = LINE_COLORS[idx % LINE_COLORS.length];
        return {
          label: chartLabel(r.vehicle),
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
              var lbl = val >= 1000 ? '$' + (val / 1000).toFixed(1) + 'k' : '$' + val;
              ctx2.fillText(lbl, bar.x + 4, bar.y);
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

    // TAB 2: Total - horizontal bar (5yr total per vehicle, winner in green)
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
            label: scenario.years + '-year total cost',
            data: totals,
            backgroundColor: totals.map(function(v) { return v === minTotal ? '#2D5016CC' : '#E8572ACC'; }),
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
              min: 0,
              ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
            },
            y: { grid: { display: false }, ticks: { font: { size: 12 } } },
          },
        },
      });
    }

    // TAB 3: Per km - horizontal bar (winner in green)
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
            backgroundColor: perKms.map(function(v) { return v === minPerKm ? '#2D5016CC' : '#7FB069CC'; }),
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
              min: 0,
              ticks: { callback: function(v) { return v + 'c'; } },
            },
            y: { grid: { display: false }, ticks: { font: { size: 12 } } },
          },
        },
      });
    }

    // TAB 4: Yearly - vertical bar (annual cost per vehicle)
    destroyChart('yearly');
    var yearlyBarCtx = document.getElementById('chart-yearly');
    if (yearlyBarCtx) {
      var annuals = subset.map(function(r) { return Math.round(r.costs.summary.costPerYear); });
      var minAnnual = Math.min.apply(null, annuals);
      _charts['yearly'] = new Chart(yearlyBarCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Annual cost',
            data: annuals,
            backgroundColor: annuals.map(function(v) { return v === minAnnual ? '#2D5016CC' : '#E8572ACC'; }),
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) { return ' $' + ctx.parsed.y.toLocaleString('en-AU') + '/yr'; },
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: {
              grid: { color: 'rgba(0,0,0,0.05)' },
              min: 0,
              ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
            },
          },
        },
      });
    }

    // TAB 5: Year by Year - cumulative line chart (shows cost crossover points)
    destroyChart('yearbyyear');
    var ybyCtx = document.getElementById('chart-yearbyyear');
    if (ybyCtx && yearlyData && yearRange) {
      var yearLabels = yearRange.map(function(y) { return 'Yr ' + y; });
      _charts['yearbyyear'] = new Chart(ybyCtx, {
        type: 'line',
        data: {
          labels: yearLabels,
          datasets: yearlyData.map(function(d, idx) {
            var col = LINE_COLORS[idx % LINE_COLORS.length];
            return {
              label: chartLabel(d.vehicle),
              data: d.byYear.map(function(v) { return Math.round(v); }),
              borderColor: col,
              backgroundColor: col + '15',
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
              labels: { boxWidth: 14, padding: 14, font: { size: 11 } },
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
              min: 0,
              ticks: { callback: function(v) { return '$' + (v / 1000).toFixed(0) + 'k'; } },
            },
          },
        },
      });
    }

    // Re-hide all non-active chart panels (only breakdown shown by default)
    ALL_TABS.forEach(function(id) {
      var el = document.getElementById('chart-' + id + '-wrap');
      if (el) el.style.display = id === 'stacked' ? '' : 'none';
    });
  },
};
