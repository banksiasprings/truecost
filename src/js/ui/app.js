// TRUE COST — ui/app.js
// App initialisation, navigation wiring, toast utility.

const App = {
  settings: null,

  async init() {
    // Load settings
    this.settings = await getAllSettings();

    // Wire bottom nav
    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate(btn.dataset.page));
    });

    // Wire add-vehicle buttons
    document.getElementById('btn-add-vehicle')?.addEventListener('click', () => {
      Router.navigate('add-vehicle');
    });
    document.getElementById('btn-add-first')?.addEventListener('click', () => {
      Router.navigate('add-vehicle');
    });
    document.getElementById('btn-back-to-vehicles')?.addEventListener('click', () => {
      Router.navigate('vehicles');
    });

    // Wire settings save
    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Register page handlers
    Router.register('vehicles', () => VehicleCard.renderList());
    Router.register('compare',  () => Comparison.render(this.settings));
    Router.register('settings', () => this.loadSettingsUI());
    Router.register('add-vehicle', (params) => Forms.renderAddVehicle(params));

    // Start on vehicles page
    Router.navigate('vehicles');
  },

  async saveSettings() {
    const years = parseInt(document.getElementById('setting-years').value);
    const kmPerYear = parseInt(document.getElementById('setting-km').value);
    const state = document.getElementById('setting-state').value;
    const opportunityCostRate = parseFloat(document.getElementById('setting-opportunity').value);

    await Promise.all([
      saveSetting('years', years),
      saveSetting('kmPerYear', kmPerYear),
      saveSetting('state', state),
      saveSetting('opportunityCostRate', opportunityCostRate),
    ]);
    this.settings = { years, kmPerYear, state, opportunityCostRate };
    App.toast('Settings saved', 'success');
  },

  loadSettingsUI() {
    if (!this.settings) return;
    const s = this.settings;
    const el = (id) => document.getElementById(id);
    if (el('setting-years')) el('setting-years').value = s.years;
    if (el('setting-km')) el('setting-km').value = s.kmPerYear;
    if (el('setting-state')) el('setting-state').value = s.state;
    if (el('setting-opportunity')) el('setting-opportunity').value = s.opportunityCostRate;
  },

  toast(message, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast' + (type !== 'default' ? ' ' + type : '');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
};

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Expose globally for nav onclick
window.App = App;