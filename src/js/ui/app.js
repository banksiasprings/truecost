// TRUE COST - ui/app.js
// App initialisation, navigation, settings, rates UI, toast utility.

const FUEL_RATE_FIELDS = [
  { path: 'fuel.ulp91',       label: 'ULP 91 (c/L)',      unit: 'c/L'  },
  { path: 'fuel.premium95',   label: 'Premium 95 (c/L)',  unit: 'c/L'  },
  { path: 'fuel.premium98',   label: 'Premium 98 (c/L)',  unit: 'c/L'  },
  { path: 'fuel.diesel',      label: 'Diesel (c/L)',      unit: 'c/L'  },
  { path: 'fuel.lpg',         label: 'LPG (c/L)',         unit: 'c/L'  },
  { path: 'fuel.evHomeRate',  label: 'EV Home (c/kWh)',   unit: 'c/kWh'},
  { path: 'fuel.evPublicRate',label: 'EV Public (c/kWh)', unit: 'c/kWh'},
];

const STATES = ["QLD","NSW","VIC","SA","WA","ACT","TAS","NT"];

const App = {
  settings: null,

  async init() {
    // Load settings
    this.settings = await getAllSettings();

    // Init RatesManager (loads IndexedDB cache, fires background fetch)
    await RatesManager.init();

    // Wire bottom nav
    document.querySelectorAll(".nav-btn[data-page]").forEach(btn => {
      btn.addEventListener("click", () => Router.navigate(btn.dataset.page));
    });

    // Wire add-vehicle buttons
    document.getElementById("btn-add-vehicle")?.addEventListener("click", () => Router.navigate("add-vehicle"));
    document.getElementById("btn-add-first")?.addEventListener("click",   () => Router.navigate("add-vehicle"));
    document.getElementById("btn-back-to-vehicles")?.addEventListener("click", () => {
      // If mid-form (steps 1+), go to previous step; only go to vehicles list from step 0
      if (typeof Forms !== 'undefined' && Forms._step > 0) {
        Forms.collectStep(Forms._step);
        Forms.renderStep(Forms._step - 1);
      } else {
        Router.navigate('vehicles');
      }
    });

    // Wire settings save
    document.getElementById("btn-save-settings")?.addEventListener("click", () => this.saveSettings());

    // Wire rates buttons
    document.getElementById("btn-refresh-rates")?.addEventListener("click", async () => {
      App.toast("Fetching latest official rates...", "default");
      await RatesManager.refresh();
      this.loadRatesUI();
      App.toast("Official rates updated — your customisations preserved", "success");
    });
    document.getElementById("btn-save-all-rates")?.addEventListener("click", async () => {
      const pending = document.querySelectorAll(".rate-input.editing");
      if (pending.length === 0) { App.toast("All rates already saved", "default", 1500); return; }
      for (const inp of pending) {
        const val = parseFloat(inp.value);
        if (!isNaN(val)) {
          await RatesManager.setOverride(inp.dataset.ratePath, val);
          inp.classList.remove("editing");
          inp.classList.add("overridden", "saved");
          setTimeout(() => inp.classList.remove("saved"), 2000);
        }
      }
      App.toast("Changes saved", "success");
    });
    document.getElementById("btn-reset-all-rates")?.addEventListener("click", async () => {
      await RatesManager.resetAllOverrides();
      this.loadRatesUI();
      App.toast("All rates reset to official values", "success");
    });

    // Re-render rates panel whenever background fetch completes
    document.addEventListener("rates-updated", () => {
      if (Router.current() === "settings") this.loadRatesUI();
    });

    // Register page handlers
    Router.register("vehicles",    () => VehicleCard.renderList());
    Router.register("compare",     () => Comparison.render(this.settings));
    Router.register("settings",    () => this.loadSettingsUI());
    Router.register("add-vehicle", (params) => Forms.renderAddVehicle(params));
    Router.register("detail",      (params) => VehicleDetail.render(params));

    // Start on vehicles page
    Router.navigate("vehicles");

    // Handle import / Web Share Target URL params
    var _urlP = new URLSearchParams(location.search);
    if (_urlP.get("import") === "1" && window.VehicleImport) {
      var _importData = VehicleImport.fromUrlParams();
      if (_importData) Router.navigate("add-vehicle", { importData: _importData });
    } else if (_urlP.get("share") === "1" && window.VehicleImport) {
      var _shareUrl = _urlP.get("url") || _urlP.get("text") || "";
      if (_shareUrl && _shareUrl.includes('carsales.com.au')) {
        // Use proxy to get full vehicle data from shared Carsales URL
        VehicleImport.fromProxyUrl(_shareUrl, function(_proxyData) {
          Router.navigate("add-vehicle", { importData: _proxyData });
        }, function() {
          // Fallback to URL slug parse if proxy fails
          var _sharedData = VehicleImport.fromSharedUrl(_shareUrl);
          if (_sharedData) Router.navigate("add-vehicle", { importData: _sharedData });
        });
      } else if (_shareUrl) {
        var _sharedData = VehicleImport.fromSharedUrl(_shareUrl);
        if (_sharedData) Router.navigate("add-vehicle", { importData: _sharedData });
      }
    }
  },

  async saveSettings() {
    const years               = parseInt(document.getElementById("setting-years").value);
    const kmPerYear           = parseInt(document.getElementById("setting-km").value);
    const state               = document.getElementById("setting-state").value;
    const opportunityCostRate = parseFloat(document.getElementById("setting-opportunity").value);
    await Promise.all([
      saveSetting("years",               years),
      saveSetting("kmPerYear",           kmPerYear),
      saveSetting("state",               state),
      saveSetting("opportunityCostRate", opportunityCostRate),
    ]);
    this.settings = { years, kmPerYear, state, opportunityCostRate };
    App.toast("Settings saved", "success");
  },

  loadSettingsUI() {
    if (this.settings) {
      const s  = this.settings;
      const el = (id) => document.getElementById(id);
      if (el("setting-years"))       el("setting-years").value       = s.years;
      if (el("setting-km"))          el("setting-km").value          = s.kmPerYear;
      if (el("setting-state"))       el("setting-state").value       = s.state;
      if (el("setting-opportunity")) el("setting-opportunity").value = s.opportunityCostRate;
    }
    this.loadRatesUI();
  },

  loadRatesUI() {
    const rates   = RatesManager.rates;
    const updated = RatesManager.getLastUpdated();
    const metaEl  = document.getElementById("rates-meta");
    if (metaEl) {
      const source  = rates?.meta?.source  || "Built-in defaults";
      const dateStr = updated ? new Date(updated).toLocaleDateString("en-AU", { day:"numeric",month:"short",year:"numeric" }) : "Unknown";
      metaEl.textContent = "Data: " + source + " (" + dateStr + ")";
    }

    // Fuel grid
    const fuelGrid = document.getElementById("rates-fuel-grid");
    if (fuelGrid) {
      fuelGrid.innerHTML = FUEL_RATE_FIELDS.map(f => {
        const parts = f.path.split(".");
        let val = rates;
        for (const p of parts) val = val ? val[p] : undefined;
        const isOverridden = RatesManager.hasOverride(f.path);
        return "<div class='rate-row'>" +
          "<label>" + f.label + "</label>" +
          "<input type='number' step='0.5' class='rate-input" + (isOverridden ? " overridden" : "") + "'" +
          " data-rate-path='" + f.path + "' value='" + (val || 0) + "'>" +
          "<button class='btn-rate-reset' data-rate-reset='" + f.path + "' title='Reset to official'>&#8635;</button>" +
          "</div>";
      }).join("");
    }

    // Rego grid
    const regoGrid = document.getElementById("rates-rego-grid");
    if (regoGrid) {
      regoGrid.innerHTML = STATES.map(s => {
        const path = "registration." + s + ".total";
        const val  = rates?.registration?.[s]?.total || 0;
        const isOverridden = RatesManager.hasOverride(path);
        return "<div class='rate-row'>" +
          "<label>" + s + "</label>" +
          "<input type='number' step='1' class='rate-input" + (isOverridden ? " overridden" : "") + "'" +
          " data-rate-path='" + path + "' value='" + val + "'>" +
          "<button class='btn-rate-reset' data-rate-reset='" + path + "' title='Reset to official'>&#8635;</button>" +
          "</div>";
      }).join("");
    }

    // Wire change handlers for all rate inputs
    document.querySelectorAll(".rate-input").forEach(inp => {
      // Go red while editing (user is typing)
      inp.addEventListener("input", () => {
        inp.classList.add("editing");
        inp.classList.remove("saved");
      });
      // Auto-save on blur / Enter — go green briefly then fade back
      inp.addEventListener("change", async () => {
        const path = inp.dataset.ratePath;
        const val  = parseFloat(inp.value);
        if (!isNaN(val)) {
          await RatesManager.setOverride(path, val);
          inp.classList.remove("editing");
          inp.classList.add("overridden", "saved");
          setTimeout(() => inp.classList.remove("saved"), 2000);
          App.toast("Rate saved", "success", 1500);
        }
      });
    });

    // Wire reset buttons for individual rates
    document.querySelectorAll("[data-rate-reset]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const path = btn.dataset.rateReset;
        await RatesManager.resetOverride(path);
        this.loadRatesUI();
        App.toast("Rate reset", "default", 1500);
      });
    });
  },

  showConfirmModal(title, onConfirm) {
    const existing = document.getElementById('tc-confirm-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'tc-confirm-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center;animation:tcFadeIn 0.15s ease';

    overlay.innerHTML = `
      <style>
        @keyframes tcFadeIn  { from { opacity:0 }          to { opacity:1 } }
        @keyframes tcSlideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        #tc-confirm-modal .tc-sheet {
          background: var(--color-bg-card, #fff);
          border-radius: 20px 20px 0 0;
          padding: 24px 24px 36px;
          width: 100%;
          max-width: 480px;
          animation: tcSlideUp 0.25s cubic-bezier(0.32,0.72,0,1);
          box-shadow: 0 -4px 32px rgba(0,0,0,0.15);
        }
        #tc-confirm-modal .tc-handle {
          width:40px;height:4px;border-radius:2px;
          background:var(--color-border,#ddd);
          margin: 0 auto 20px;
        }
        #tc-confirm-modal .tc-title {
          font-size:1.05rem;font-weight:600;
          text-align:center;margin-bottom:22px;
          color:var(--color-text);
        }
        #tc-confirm-modal .tc-btn-delete {
          display:block;width:100%;padding:14px;
          background:var(--color-error,#e63946);
          color:#fff;border:none;border-radius:var(--radius-md,10px);
          font-size:1rem;font-weight:600;cursor:pointer;margin-bottom:10px;
        }
        #tc-confirm-modal .tc-btn-cancel {
          display:block;width:100%;padding:14px;
          background:var(--color-bg-input,#f0f0ec);
          color:var(--color-text);border:none;border-radius:var(--radius-md,10px);
          font-size:1rem;cursor:pointer;
        }
      </style>
      <div class="tc-sheet">
        <div class="tc-handle"></div>
        <div class="tc-title">${title}</div>
        <button class="tc-btn-delete" id="tc-confirm-delete">Delete</button>
        <button class="tc-btn-cancel" id="tc-confirm-cancel">Cancel</button>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('tc-confirm-delete').onclick = () => { overlay.remove(); onConfirm(); };
    document.getElementById('tc-confirm-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  },

  toast(message, type = "default", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast" + (type !== "default" ? " " + type : "");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
window.App = App;
