// TRUE COST — data/rates-manager.js
// Fetches rates.json, caches in IndexedDB, merges with user overrides.
// Exposes window.LiveRates so calc modules can use live data.

const RatesManager = {
  _official: null,   // from rates.json (or IndexedDB cache)
  _overrides: {},    // user-set values stored in IndexedDB

  // Merged view: official + overrides
  get rates() {
    const base = this._official || this._fallback();
    return this._deepMerge(base, this._overrides);
  },

  async init() {
    // 1. Load any cached official rates from IndexedDB
    try {
      const cached = await getSetting('_officialRates');
      if (cached) this._official = cached;
      const overrides = await getSetting('_rateOverrides');
      if (overrides) this._overrides = overrides;
    } catch (e) { /* fresh DB */ }

    // 2. Expose as global for calc modules
    window.LiveRates = this.rates;

    // 3. Fetch fresh rates.json in background
    this._fetchAndCache();
  },

  async _fetchAndCache() {
    try {
      const res = await fetch('./data/rates.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      this._official = data;
      await saveSetting('_officialRates', data);
      await saveSetting('_ratesFetchedAt', new Date().toISOString());
      window.LiveRates = this.rates;
      document.dispatchEvent(new CustomEvent('rates-updated', { detail: this.rates }));
    } catch (e) {
      console.warn('TrueCost: rates.json fetch failed, using cached/fallback', e);
    }
  },

  async refresh() {
    await this._fetchAndCache();
  },

  async setOverride(path, value) {
    const parts = path.split('.');
    let obj = this._overrides;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    await saveSetting('_rateOverrides', this._overrides);
    window.LiveRates = this.rates;
  },

  async resetOverride(path) {
    const parts = path.split('.');
    let obj = this._overrides;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) return;
      obj = obj[parts[i]];
    }
    delete obj[parts[parts.length - 1]];
    await saveSetting('_rateOverrides', this._overrides);
    window.LiveRates = this.rates;
  },

  async resetAllOverrides() {
    this._overrides = {};
    await saveSetting('_rateOverrides', {});
    window.LiveRates = this.rates;
  },

  hasOverride(path) {
    const parts = path.split('.');
    let obj = this._overrides;
    for (const p of parts) {
      if (!obj || typeof obj !== 'object' || !(p in obj)) return false;
      obj = obj[p];
    }
    return true;
  },

  getOfficialValue(path) {
    const base = this._official || this._fallback();
    const parts = path.split('.');
    let obj = base;
    for (const p of parts) {
      if (!obj || !(p in obj)) return null;
      obj = obj[p];
    }
    return obj;
  },

  getLastUpdated() {
    return this._official?.meta?.updated || null;
  },

  getFetchedAt() {
    return null; // populated from IndexedDB on next render
  },

  _fallback() {
    // Mirror AustraliaData structure for calc module compatibility
    return {
      meta: { updated: null, source: 'Built-in defaults', version: '0' },
      fuel: {
        ulp91:       AustraliaData.fuel.unleaded,
        premium95:   AustraliaData.fuel.premium - 10,
        premium98:   AustraliaData.fuel.premium,
        diesel:      AustraliaData.fuel.diesel,
        lpg:         AustraliaData.fuel.lpg,
        evHomeRate:  AustraliaData.fuel.evHomeRate,
        evPublicRate: AustraliaData.fuel.evPublicRate,
      },
      registration: JSON.parse(JSON.stringify(AustraliaData.registration)),
      stampDuty:    JSON.parse(JSON.stringify(AustraliaData.stampDuty)),
    };
  },

  _deepMerge(base, overrides) {
    const result = JSON.parse(JSON.stringify(base));
    this._mergeInto(result, overrides);
    return result;
  },

  _mergeInto(target, source) {
    for (const key of Object.keys(source || {})) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        this._mergeInto(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  },
};

// Expose globally
window.RatesManager = RatesManager;
