// TRUE COST — ui/forms.js
// Multi-step vehicle input form.
const Forms = {
  _step: 0,
  _vehicle: null,
  _editId: null,
  _importData: null,

  async renderAddVehicle(params = {}) {
    this._step = 0;
    this._editId = params.id || null;
    this._importData = params.importData || null;
    if (this._editId) {
      this._vehicle = await getVehicle(this._editId) || createVehicle();
      document.getElementById('add-vehicle-title').textContent = 'Edit Vehicle';
      this.renderStep(0);
    } else {
      const settings = App.settings || Defaults.scenario;
      this._vehicle = createVehicle({ state: settings.state });
      document.getElementById('add-vehicle-title').textContent = 'Add Vehicle';
      if (this._importData) {
        VehicleImport.applyToVehicle(this._importData, this._vehicle);
        this.renderStep(0);
      } else {
        this.renderImportEntry();
      }
    }
  },
  renderImportEntry() {
    const container = document.getElementById('vehicle-form-container');
    container.innerHTML = VehicleImport.renderEntryScreen();
    document.getElementById('import-manual-btn')?.addEventListener('click', () => {
      this.renderStep(0);
    });
    document.getElementById('import-paste-btn')?.addEventListener('click', () => {
      container.innerHTML = VehicleImport.renderPasteScreen();
      this._bindPasteEvents(container);
    });

    document.getElementById('import-url-btn')?.addEventListener('click', () => {
      container.innerHTML = VehicleImport.renderUrlScreen();
      document.getElementById('import-url-back-btn')?.addEventListener('click', () => {
        this.renderImportEntry();
      });
      document.getElementById('import-url-fetch-btn')?.addEventListener('click', () => {
        const urlInput = document.getElementById('import-url-input');
        const url = urlInput ? urlInput.value.trim() : '';
        if (!url) { App.toast('Please paste a Carsales URL', 'error'); return; }
        const btn = document.getElementById('import-url-fetch-btn');
        if (btn) { btn.textContent = 'Fetching…'; btn.disabled = true; }
        VehicleImport.fromProxyUrl(url, (data) => {
          VehicleImport.applyToVehicle(data, this._vehicle);
          App.toast('Car details imported!', 'success');
          this.renderStep(0);
        }, (err) => {
          if (btn) { btn.textContent = 'Import Car Details'; btn.disabled = false; }
          App.toast(err || 'Import failed', 'error');
        });
      });
    });
    document.getElementById('import-bookmarklet-btn')?.addEventListener('click', () => {
      container.innerHTML = VehicleImport.renderBookmarkletScreen();
      this._bindBookmarkletEvents(container);
    });
  },
  _bindPasteEvents(container) {
    document.getElementById('import-paste-parse-btn')?.addEventListener('click', () => {
      const textarea = document.getElementById('import-paste-text');
      const parsed = VehicleImport.fromPastedText(textarea ? textarea.value : '');
      if (!parsed) {
        App.toast('Could not extract details - try pasting more text', 'error');
        return;
      }
      VehicleImport.applyToVehicle(parsed, this._vehicle);
      App.toast('Details extracted - review and continue', 'success');
      this.renderStep(0);
    });
    document.getElementById('import-paste-back-btn')?.addEventListener('click', () => {
      this.renderImportEntry();
    });
  },
  _bindBookmarkletEvents(container) {
    document.getElementById('import-bookmarklet-copy-btn')?.addEventListener('click', () => {
      const textarea = document.getElementById('import-bookmarklet-code');
      if (textarea) {
        navigator.clipboard.writeText(textarea.value)
          .then(() => App.toast('Bookmarklet code copied!', 'success'))
          .catch(() => { textarea.select(); document.execCommand('copy'); App.toast('Copied!', 'success'); });
      }
    });
    document.getElementById('import-bookmarklet-back-btn')?.addEventListener('click', () => {
      this.renderImportEntry();
    });
  },

  renderStep(step) {
    this._step = step;
    const steps = document.querySelectorAll('.step-dot');
    steps.forEach((dot, i) => {
      dot.classList.toggle('active', i === step);
      dot.classList.toggle('done', i < step);
    });
    const container = document.getElementById('vehicle-form-container');
    const stepFns = [
      () => this.stepIdentity(),
      () => this.stepPurchase(),
      () => this.stepRunningCosts(),
      () => this.stepFinance(),
    ];
    container.innerHTML = (stepFns[step] || stepFns[0])();
    this.bindStepEvents(step);
  },

  stepIdentity() {
    const v = this._vehicle;
    const presetSearch = `<div class="form-group preset-search-wrap"><label class="label" for="f-preset-search">Quick fill from preset <span class="preset-hint">— optional, 28 popular AU vehicles</span></label><div class="preset-search-box"><input type="text" class="input" id="f-preset-search" placeholder="e.g. HiLux, RAV4 Hybrid, Tesla Model 3…" autocomplete="off"><ul class="preset-dropdown" id="preset-dropdown"></ul></div></div>`;
    return `<div class="card"><h2 class="card-title">Vehicle Details</h2>${presetSearch}<div class="form-row"><div class="form-group"><label class="label" for="f-year">Year</label><input type="number" class="input" id="f-year" value="${v.year}" min="1950" max="${new Date().getFullYear()+2}"></div><div class="form-group" style="flex:2"><label class="label" for="f-make">Make</label><input type="text" class="input" id="f-make" value="${v.make}" placeholder="e.g. Toyota" list="make-list" autocomplete="off"></div></div><div class="form-group"><label class="label" for="f-model">Model</label><input type="text" class="input" id="f-model" value="${v.model}" placeholder="e.g. Corolla Cross" list="model-list" autocomplete="off"></div><div class="form-group"><label class="label" for="f-variant">Variant (optional)</label><input type="text" class="input" id="f-variant" value="${v.variant}" placeholder="e.g. GX Hybrid"></div><div class="form-group"><label class="label" for="f-fueltype">Fuel type</label><div class="select-wrapper"><select class="select" id="f-fueltype"><option value="petrol"   ${v.fuelType==='petrol'   ?'selected':''}>Petrol</option><option value="diesel"   ${v.fuelType==='diesel'   ?'selected':''}>Diesel</option><option value="hybrid"   ${v.fuelType==='hybrid'   ?'selected':''}>Hybrid</option><option value="phev"     ${v.fuelType==='phev'     ?'selected':''}>Plug-in Hybrid (PHEV)</option><option value="electric" ${v.fuelType==='electric' ?'selected':''}>Electric (EV)</option><option value="lpg"      ${v.fuelType==='lpg'      ?'selected':''}>LPG</option></select></div></div></div><div class="form-row"><div class="form-group" style="flex:1"><label class="label" for="f-drive">Drive type</label><div class="select-wrapper"><select class="select" id="f-drive"><option value="">Not specified</option><option value="FWD" ${v.driveType==="FWD"?"selected":""}>FWD – Front Wheel</option><option value="RWD" ${v.driveType==="RWD"?"selected":""}>RWD – Rear Wheel</option><option value="AWD" ${v.driveType==="AWD"?"selected":""}>AWD – All Wheel</option><option value="4WD" ${v.driveType==="4WD"?"selected":""}>4WD – Four Wheel</option></select></div></div><div class="form-group" style="flex:1"><label class="label" for="f-colour">Colour</label><input type="text" class="input" id="f-colour" value="${v.colour||''}" placeholder="e.g. Silver"></div></div><div class="form-row"><div class="form-group" style="flex:1"><label class="label" for="f-ancap">ANCAP Safety</label><div class="select-wrapper"><select class="select" id="f-ancap"><option value="">Not rated</option><option value="5" ${v.ancap===5?"selected":""}>5 stars ★★★★★</option><option value="4" ${v.ancap===4?"selected":""}>4 stars ★★★★</option><option value="3" ${v.ancap===3?"selected":""}>3 stars ★★★</option><option value="2" ${v.ancap===2?"selected":""}>2 stars ★★</option><option value="1" ${v.ancap===1?"selected":""}>1 star ★</option></select></div></div><div class="form-group" style="flex:1"><label class="label" for="f-seats">Seats</label><input type="number" class="input" id="f-seats" value="${v.seats||''}" min="1" max="12" placeholder="e.g. 5"></div></div></div><datalist id="make-list">
  ${["Alfa Romeo","Audi","BMW","BYD","Chery","Chevrolet","Chrysler","Citroen","Cupra","Fiat","Ford","Genesis","GWM","Haval","Honda","Hyundai","Isuzu","Jaguar","Jeep","Kia","Land Rover","Lexus","Lynk & Co","Mazda","Mercedes-Benz","MG","Mini","Mitsubishi","Nissan","Peugeot","Polestar","Porsche","Ram","Renault","Skoda","Subaru","Suzuki","Tesla","Toyota","Volkswagen","Volvo"].map(m => `<option value="${m}">`).join('')}
</datalist>
<datalist id="model-list"></datalist>
<button class="btn btn-primary btn-full btn-pill" id="step-next">Continue</button>`;
  },

  stepPurchase() {
    const v = this._vehicle;
    const isEVorPHEV = v.fuelType === 'electric' || v.fuelType === 'phev';
    return `<div class="card"><h2 class="card-title">Purchase & Costs</h2><div class="form-group"><label class="label" for="f-price">Purchase price</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-price" value="${v.purchasePrice || ''}" placeholder="25000" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-resale5">Estimated resale value (5yr)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-resale5" value="${v.resaleValue5yr || ''}" placeholder="Leave blank to estimate" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-state">State</label><div class="select-wrapper"><select class="select" id="f-state">${['QLD','NSW','VIC','SA','WA','ACT','TAS','NT'].map(s => `<option value="${s}" ${v.state===s?'selected':''}>${s}</option>`).join('')}</select></div></div><div class="form-group" id="fuel-consumption-group" ${isEVorPHEV?'style="display:none"':''} ><label class="label" for="f-fuel-cons">Fuel consumption (L/100km)</label><input type="number" class="input" id="f-fuel-cons" value="${v.fuelConsumption}" step="0.1" min="0"></div><div class="form-group" id="ev-group" ${!isEVorPHEV?'style="display:none"':''} ><label class="label" for="f-ev-kwh">Battery size (kWh)</label><input type="number" class="input" id="f-ev-kwh" value="${v.evBatteryKwh || ''}" placeholder="e.g. 82"><label class="label" for="f-ev-range" style="margin-top:var(--space-4)">Range (km)</label><input type="number" class="input" id="f-ev-range" value="${v.evRangeKm || ''}" placeholder="e.g. 400"></div><div id="ev-charging-group" ${isEVorPHEV?'':'style="display:none"'}><div class="form-group" style="margin-top:var(--space-4)"><label class="label" style="font-weight:700;display:flex;align-items:center;gap:6px"><span>&#9889;</span> Charging Costs</label><div style="background:var(--color-bg-secondary,#f5f5f0);border-radius:var(--radius-md);padding:var(--space-4);border:1px solid var(--color-border);margin-top:var(--space-2)"><div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-3);color:var(--color-text-secondary)">&#127968; Home charging</div><div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4)"><div style="flex:1"><label class="label" style="font-size:var(--font-size-xs)">% of charging</label><input type="number" class="input" id="f-ev-home-pct" value="${v.evHomePercent!=null?v.evHomePercent:80}" min="0" max="100"></div><div style="flex:1"><label class="label" style="font-size:var(--font-size-xs)">$/kWh (0 = solar)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-ev-home-rate" value="${(v.evHomeRate!=null?v.evHomeRate:0.30).toFixed(2)}" step="0.01" min="0" style="padding-left:32px"></div></div></div><div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-3);color:var(--color-text-secondary)">&#128268; Public charging</div><div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-3)"><div style="flex:1"><label class="label" style="font-size:var(--font-size-xs)">% of charging</label><input type="number" class="input" id="f-ev-pub-pct" value="${v.evPublicPercent!=null?v.evPublicPercent:20}" min="0" max="100"></div><div style="flex:1"><label class="label" style="font-size:var(--font-size-xs)">$/kWh</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-ev-pub-rate" value="${(v.evPublicRate!=null?v.evPublicRate:0.45).toFixed(2)}" step="0.01" min="0" style="padding-left:32px"></div></div></div><div id="ev-effective-rate" style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-text-secondary);border-top:1px solid var(--color-border);padding-top:var(--space-2)">Effective rate: $${((((v.evHomePercent!=null?v.evHomePercent:80)/100)*(v.evHomeRate!=null?v.evHomeRate:0.30))+(((v.evPublicPercent!=null?v.evPublicPercent:20)/100)*(v.evPublicRate!=null?v.evPublicRate:0.45))).toFixed(2)}/kWh</div></div></div><div id="phev-split-group" ${v.fuelType!=='phev'?'style="display:none"':''} ><div class="form-group" style="margin-top:var(--space-4)"><label class="label">Electric: <strong><span id="phev-pct-display">${v.phevElectricPct||40}</span>%</strong> / Petrol: <strong><span id="phev-ice-display">${100-(v.phevElectricPct||40)}</span>%</strong></label><input type="range" id="f-phev-elec-pct" value="${v.phevElectricPct||40}" min="0" max="100" step="5" style="width:100%;margin-top:var(--space-2);accent-color:var(--color-accent)"></div></div><div style="display:flex;gap:var(--space-3)"><button class="btn btn-secondary btn-pill" id="step-back">Back</button><button class="btn btn-primary btn-pill" id="step-next" style="flex:1">Continue</button></div>`;
  },

  stepRunningCosts() {
    const v = this._vehicle;
    return `<div class="card"><h2 class="card-title">Running Costs</h2><div class="form-group"><label class="label" for="f-rego">Registration ($/year)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-rego" value="${v.registrationAnnual}" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-insurance">Insurance ($/year)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-insurance" value="${v.insuranceAnnual}" style="padding-left:32px"></div></div><div class="form-row"><div class="form-group"><label class="label" for="f-svc-cost">Service cost ($)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-svc-cost" value="${v.serviceCostPerService}" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-svc-km">Service interval (km)</label><input type="number" class="input" id="f-svc-km" value="${v.serviceIntervalKm}" step="1000"></div></div><div class="form-row"><div class="form-group"><label class="label" for="f-tyre-cost">Tyre set cost ($)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-tyre-cost" value="${v.tyreCostPerSet}" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-tyre-km">Tyre life (km)</label><input type="number" class="input" id="f-tyre-km" value="${v.tyreLifeKm}" step="5000"></div></div></div><div style="display:flex;gap:var(--space-3)"><button class="btn btn-secondary btn-pill" id="step-back">Back</button><button class="btn btn-primary btn-pill" id="step-next" style="flex:1">Continue</button></div>`;
  },

  stepFinance() {
    const v = this._vehicle;
    return `<div class="card"><h2 class="card-title">Finance (optional)</h2><div class="form-group"><label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer"><input type="checkbox" id="f-financed" ${v.financed?'checked':''} style="width:20px;height:20px"><span>This vehicle is financed</span></label></div><div id="finance-fields" ${!v.financed?'style="display:none"':''} ><div class="form-group"><label class="label" for="f-loan">Loan amount</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-loan" value="${v.loanAmount || ''}" style="padding-left:32px"></div></div><div class="form-row"><div class="form-group"><label class="label" for="f-rate">Interest rate (%)</label><input type="number" class="input" id="f-rate" value="${v.interestRate}" step="0.1" min="0" max="30"></div><div class="form-group"><label class="label" for="f-term">Term (months)</label><input type="number" class="input" id="f-term" value="${v.loanTermMonths}" step="12" min="12" max="84"></div></div></div></div><div style="display:flex;gap:var(--space-3)"><button class="btn btn-secondary btn-pill" id="step-back">Back</button><button class="btn btn-primary btn-pill" id="step-save" style="flex:1">${this._editId ? 'Save Changes' : 'Add Vehicle'}</button></div>`;
  },

  bindStepEvents(step) {
    document.getElementById('step-next')?.addEventListener('click', () => {
      if (this.collectStep(step)) this.renderStep(step + 1);
    });
    document.getElementById('step-back')?.addEventListener('click', () => {
      this.collectStep(step);
      this.renderStep(step - 1);
    });
    document.getElementById('step-save')?.addEventListener('click', async () => {
      this.collectStep(step);
      const errors = validateVehicle(this._vehicle);
      if (errors.length) { App.toast(errors[0], 'error'); return; }
      await saveVehicle(this._vehicle);
      App.toast(vehicleLabel(this._vehicle) + ' saved!', 'success');
      Router.navigate('vehicles');
    });
    document.getElementById('f-financed')?.addEventListener('change', (e) => {
      document.getElementById('finance-fields').style.display = e.target.checked ? '' : 'none';
    });

    // EV charging live effective-rate calculator (step 1)
    if (step === 1) {
      const updateEffRate = () => {
        const hp  = parseFloat(document.getElementById('f-ev-home-pct')?.value)  || 0;
        const hr  = parseFloat(document.getElementById('f-ev-home-rate')?.value) || 0;
        const pp  = parseFloat(document.getElementById('f-ev-pub-pct')?.value)   || 0;
        const pr  = parseFloat(document.getElementById('f-ev-pub-rate')?.value)  || 0;
        const eff = (hp / 100 * hr) + (pp / 100 * pr);
        const el  = document.getElementById('ev-effective-rate');
        if (el) el.textContent = 'Effective rate: $' + eff.toFixed(2) + '/kWh';
      };
      // Link home % and public % so they always sum to 100
      const homePctEl = document.getElementById('f-ev-home-pct');
      const pubPctEl  = document.getElementById('f-ev-pub-pct');
      if (homePctEl && pubPctEl) {
        homePctEl.addEventListener('input', () => {
          const pv = Math.min(100, Math.max(0, parseFloat(homePctEl.value) || 0));
          homePctEl.value = pv;
          pubPctEl.value  = 100 - pv;
          if (this._vehicle) { this._vehicle.evHomePercent = pv; this._vehicle.evPublicPercent = 100 - pv; }
          updateEffRate();
        });
        pubPctEl.addEventListener('input', () => {
          const pv = Math.min(100, Math.max(0, parseFloat(pubPctEl.value) || 0));
          pubPctEl.value  = pv;
          homePctEl.value = 100 - pv;
          if (this._vehicle) { this._vehicle.evPublicPercent = pv; this._vehicle.evHomePercent = 100 - pv; }
          updateEffRate();
        });
      }
      ['f-ev-home-rate','f-ev-pub-rate'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateEffRate);
      });
      document.getElementById('f-phev-elec-pct')?.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value);
        const pd = document.getElementById('phev-pct-display');
        const id = document.getElementById('phev-ice-display');
        if (pd) pd.textContent = pct;
        if (id) id.textContent = 100 - pct;
      });
    }

    // Make → Model autocomplete (step 0 only)
  if (step === 0) {
    var MODEL_MAP = {
      'Toyota':       ['Camry','Corolla','RAV4','HiLux','LandCruiser','Kluger','Prado','Yaris','C-HR','Fortuner','HiAce','Tarago'],
      'Ford':         ['Ranger','Everest','Escape','Puma','Mustang','Territory','Transit','Bronco'],
      'Mazda':        ['CX-5','CX-3','CX-8','CX-90','Mazda3','Mazda2','BT-50','MX-5'],
      'Hyundai':      ['i30','Tucson','Santa Fe','Kona','Ioniq 5','Ioniq 6','Staria','Palisade','i20'],
      'Kia':          ['Sportage','Cerato','Sorento','Carnival','EV6','EV9','Stinger','Seltos','Picanto','Niro'],
      'Tesla':        ['Model 3','Model Y','Model S','Model X','Cybertruck'],
      'Volkswagen':   ['Golf','Tiguan','Touareg','Amarok','Polo','T-Roc','ID.4','Passat'],
      'BMW':          ['3 Series','5 Series','7 Series','X3','X5','X7','iX','i4','1 Series','2 Series'],
      'Mercedes-Benz':['A-Class','C-Class','E-Class','GLC','GLE','GLS','EQA','EQB','EQC','EQS'],
      'Mitsubishi':   ['Outlander','ASX','Eclipse Cross','Triton','Pajero Sport','Pajero'],
      'Nissan':       ['X-Trail','Navara','Patrol','Qashqai','Leaf','Juke','Pathfinder'],
      'Subaru':       ['Outback','Forester','XV','WRX','BRZ','Crosstrek','Impreza'],
      'Honda':        ['CR-V','HR-V','Jazz','Civic','City','Odyssey','ZR-V'],
      'MG':           ['ZS','HS','MG4','RX5','3','Marvel R'],
      'BYD':          ['Atto 3','Seal','Dolphin','Sealion 6','Shark'],
      'Isuzu':        ['D-MAX','MU-X'],
      'Land Rover':   ['Defender','Discovery','Range Rover','Range Rover Sport','Range Rover Evoque'],
      'Volvo':        ['XC40','XC60','XC90','S60','V60','C40'],
      'Audi':         ['A3','A4','A6','Q3','Q5','Q7','Q8','e-tron','Q4 e-tron'],
      'Lexus':        ['UX','NX','RX','GX','LX','ES','IS'],
      'Polestar':     ['Polestar 2','Polestar 3','Polestar 4'],
      'Porsche':      ['Cayenne','Macan','Taycan','911','Panamera'],
      'GWM':          ['Ute','Haval H6','Haval Jolion','Tank 300'],
      'Haval':        ['H6','Jolion','H2'],
      'Skoda':        ['Octavia','Kodiaq','Karoq','Superb','Scala','Enyaq'],
      'Renault':      ['Koleos','Arkana','Megane E-Tech','Duster','Captur'],
      'Peugeot':      ['2008','3008','5008','308','408','e-208','e-2008'],
      'Suzuki':       ['Vitara','Swift','Jimny','S-Cross','Ignis'],
    };
    var makeInput = document.getElementById('f-make');
    var modelDl   = document.getElementById('model-list');
    function updateModelList() {
      var make = (makeInput?.value || '').trim();
      var models = MODEL_MAP[make] || [];
      if (modelDl) modelDl.innerHTML = models.map(function(m){ return '<option value="' + m + '">'; }).join('');
    }
    if (makeInput) {
      makeInput.addEventListener('input', updateModelList);
      updateModelList(); // populate on render if make already set
    }
  }

  // Vehicle preset search (step 0 only)
    if (step === 0 && window.VehiclePresets) {
      const searchInput = document.getElementById('f-preset-search');
      const dropdown = document.getElementById('preset-dropdown');
      if (!searchInput || !dropdown) return;

      let _results = [];

      searchInput.addEventListener('input', () => {
        _results = window.VehiclePresets.search(searchInput.value);
        if (_results.length === 0) {
          dropdown.innerHTML = '';
          dropdown.classList.remove('open');
          return;
        }
        dropdown.innerHTML = _results.map((p, i) => {
          const fuelBadge = `<span class="preset-fuel preset-fuel--${p.fuelType}">${p.fuelType}</span>`;
          return `<li class="preset-item" data-idx="${i}"><span class="preset-name">${p.year} ${p.make} ${p.model}</span><span class="preset-variant">${p.variant}</span>${fuelBadge}</li>`;
        }).join('');
        dropdown.classList.add('open');
      });

      dropdown.addEventListener('click', (e) => {
        const li = e.target.closest('.preset-item');
        if (!li) return;
        const idx = parseInt(li.dataset.idx);
        const preset = _results[idx];
        if (!preset) return;
        // Apply all preset fields to vehicle
        Object.assign(this._vehicle, preset);
        // Re-render step to show pre-filled values
        this.renderStep(0);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.preset-search-box')) {
          dropdown.classList.remove('open');
        }
      });
    }
  },

  collectStep(step) {
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
    const num = (id) => parseFloat(val(id)) || 0;
    const v = this._vehicle;
    if (step === 0) {
      v.year = parseInt(val('f-year')) || v.year;
      v.make = val('f-make')?.trim() || '';
      v.model = val('f-model')?.trim() || '';
      v.variant = val('f-variant')?.trim() || '';
      v.fuelType = val('f-fueltype') || 'petrol';
      v.driveType = val('f-drive') || null;
      v.colour = val('f-colour')?.trim() || null;
      v.ancap = parseInt(val('f-ancap')) || null;
      v.seats = parseInt(val('f-seats')) || null;
    } else if (step === 1) {
      v.purchasePrice = num('f-price');
      v.resaleValue5yr = num('f-resale5');
      v.state = val('f-state') || 'QLD';
      v.fuelConsumption = num('f-fuel-cons') || v.fuelConsumption;
      v.evBatteryKwh = num('f-ev-kwh');
      v.evRangeKm = num('f-ev-range');
      if (v.fuelType === 'electric' || v.fuelType === 'phev') {
        v.evHomePercent   = num('f-ev-home-pct');
        v.evHomeRate      = parseFloat(val('f-ev-home-rate')) || 0;
        v.evPublicPercent = num('f-ev-pub-pct');
        v.evPublicRate    = parseFloat(val('f-ev-pub-rate')) || 0;
      }
      if (v.fuelType === 'phev') {
        v.phevElectricPct = parseInt(val('f-phev-elec-pct')) || 40;
      }
      v.onRoadCost = v.purchasePrice;
    } else if (step === 2) {
      v.registrationAnnual = num('f-rego');
      v.insuranceAnnual = num('f-insurance');
      v.serviceCostPerService = num('f-svc-cost');
      v.serviceIntervalKm = num('f-svc-km');
      v.tyreCostPerSet = num('f-tyre-cost');
      v.tyreLifeKm = num('f-tyre-km');
    } else if (step === 3) {
      const financed = document.getElementById('f-financed')?.checked || false;
      v.financed = financed;
      v.loanAmount = num('f-loan');
      v.interestRate = num('f-rate') || 7.5;
      v.loanTermMonths = parseInt(val('f-term')) || 60;
    }
    return true;
  },
};
