// TRUE COST - storage.js
// IndexedDB read/write for vehicles and settings.

const DB_NAME = 'truecost-db';
const DB_VERSION = 1;
const STORE_VEHICLES = 'vehicles';
const STORE_SETTINGS = 'settings';
let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_VEHICLES)) {
        const vs = db.createObjectStore(STORE_VEHICLES, { keyPath: "id" });
        vs.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS))
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function saveVehicle(vehicle) {
  vehicle.updatedAt = new Date().toISOString();
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VEHICLES, "readwrite");
    tx.objectStore(STORE_VEHICLES).put(vehicle);
    tx.oncomplete = () => resolve(vehicle);
    tx.onerror = (e) => reject(e.target.error);
  }));
}

function getVehicle(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(STORE_VEHICLES, "readonly").objectStore(STORE_VEHICLES).get(id);
    req.onsuccess = () => resolve(req.result ? normalizeVehicle(req.result) : null);
    req.onerror = (e) => reject(e.target.error);
  }));
}

// Migrate any vehicle stored in a legacy/partial format to the full schema.
// Handles: old `price` field name → `purchasePrice`, missing fields → defaults.
function normalizeVehicle(raw) {
  if (!raw) return raw;
  const v = { ...raw };
  // Legacy field rename
  if (!v.purchasePrice && v.price) v.purchasePrice = v.price;
  // Fill any missing fields with typed defaults via createVehicle
  return createVehicle(v);
}

function getAllVehicles() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(STORE_VEHICLES, "readonly").objectStore(STORE_VEHICLES).getAll();
    req.onsuccess = () => resolve((req.result || []).map(normalizeVehicle));
    req.onerror = (e) => reject(e.target.error);
  }));
}

function deleteVehicle(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VEHICLES, "readwrite");
    tx.objectStore(STORE_VEHICLES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  }));
}

function saveSetting(key, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  }));
}

function getSetting(key, defaultValue = null) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SETTINGS, "readonly").objectStore(STORE_SETTINGS).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
    req.onerror = (e) => reject(e.target.error);
  }));
}

async function getAllSettings() {
  return {
    years:               await getSetting("years",               Defaults.scenario.years),
    kmPerYear:           await getSetting("kmPerYear",           Defaults.scenario.kmPerYear),
    state:               await getSetting("state",               Defaults.scenario.state),
    opportunityCostRate: await getSetting("opportunityCostRate", Defaults.scenario.opportunityCostRate),
    theme:               await getSetting("theme",               "dark"),
  };
}

async function exportAllData() {
  const vehicles = await getAllVehicles();
  const settings = await getAllSettings();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'truecost-pro',
    vehicles,
    settings
  };
}

async function importAllData(data) {
  if (!data || data.version !== 1 || (data.app !== 'truecost-pro' && data.app !== 'truecost')) {
    throw new Error('Invalid or incompatible backup file.');
  }
  // Wipe existing vehicles
  const existing = await getAllVehicles();
  for (const v of existing) await deleteVehicle(v.id);
  // Restore vehicles
  for (const v of (data.vehicles || [])) {
    v.updatedAt = new Date().toISOString();
    await saveVehicle(v);
  }
  // Restore settings
  const s = data.settings || {};
  const allowed = ['years', 'kmPerYear', 'state', 'opportunityCostRate', 'theme'];
  for (const key of allowed) {
    if (key in s) await saveSetting(key, s[key]);
  }
}
