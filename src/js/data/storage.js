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
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  }));
}

function getAllVehicles() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(STORE_VEHICLES, "readonly").objectStore(STORE_VEHICLES).getAll();
    req.onsuccess = () => resolve(req.result || []);
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
  };
}
