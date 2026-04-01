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
    document.getElementById("btn-back-to-vehicles")?.addEventListener("click", () => Router.navigate("vehicles"));

    // Wire settings save
    document.getElementById("btn-save-settings")?.addEventListener("click", () => this.saveSettings());

    // Wire rates buttons
    document.getElementById("btn-refresh-rates")?.addEventListener("click", async () => {
      App.toast("Refreshing rates...", "default");
      await RatesManager.refresh();
      this.loadRatesUI();
      App.toast("Rates updated", "success");
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
      inp.addEventListener("change", async () => {
        const path = inp.dataset.ratePath;
        const val  = parseFloat(inp.value);
        if (!isNaN(val)) {
          await RatesManager.setOverride(path, val);
          inp.classList.add("overridden");
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
