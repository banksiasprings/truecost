// TRUE COST — ui/forms.js
// Multi-step vehicle input form.

const Forms = {
  _step: 0,
  _vehicle: null,
  _editId: null,

  async renderAddVehicle(params = {}) {
    this._step = 0;
    this._editId = params.id || null;

    if (this._editId) {
      this._vehicle = await getVehicle(this._editId) || createVehicle();
      document.getElementById('add-vehicle-title').textContent = 'Edit Vehicle';
    } else {
      const settings = App.settings || Defaults.scenario;
      this._vehicle = createVehicle({ state: settings.state });
      document.getElementById('add-vehicle-title').textContent = 'Add Vehicle';
    }

    this.renderStep(0);
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
    return `<div class="card"><h2 class="card-title">Vehicle Details</h2><div class="form-row"><div class="form-group"><label class="label" for="f-year">Year</label><input type="number" class="input" id="f-year" value="${v.year}" min="1950" max="${new Date().getFullYear()+2}"></div><div class="form-group" style="flex:2"><label class="label" for="f-make">Make</label><input type="text" class="input" id="f-make" value="${v.make}" placeholder="e.g. Toyota"></div></div><div class="form-group"><label class="label" for="f-model">Model</label><input type="text" class="input" id="f-model" value="${v.model}" placeholder="e.g. Corolla Cross"></div><div class="form-group"><label class="label" for="f-variant">Variant (optional)</label><input type="text" class="input" id="f-variant" value="${v.variant}" placeholder="e.g. GX Hybrid"></div><div class="form-group"><label class="label" for="f-fueltype">Fuel type</label><div class="select-wrapper"><select class="select" id="f-fueltype"><option value="petrol"   ${v.fuelType==='petrol'   ?'selected':''}>Petrol</option><option value="diesel"   ${v.fuelType==='diesel'   ?'selected':''}>Diesel</option><option value="hybrid"   ${v.fuelType==='hybrid'   ?'selected':''}>Hybrid</option><option value="phev"     ${v.fuelType==='phev'     ?'selected':''}>Plug-in Hybrid (PHEV)</option><option value="electric" ${v.fuelType==='electric' ?'selected':''}>Electric (EV)</option><option value="lpg"      ${v.fuelType==='lpg'      ?'selected':''}>LPG</option></select></div></div></div><button class="btn btn-primary btn-full btn-pill" id="step-next">Continue</button>`;
  },

  stepPurchase() {
    const v = this._vehicle;
    const isEV = v.fuelType === 'electric';
    return `<div class="card"><h2 class="card-title">Purchase & Costs</h2><div class="form-group"><label class="label" for="f-price">Purchase price</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-price" value="${v.purchasePrice || ''}" placeholder="25000" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-resale5">Estimated resale value (5yr)</label><div class="input-prefix"><span class="prefix-label">$</span><input type="number" class="input" id="f-resale5" value="${v.resaleValue5yr || ''}" placeholder="Leave blank to estimate" style="padding-left:32px"></div></div><div class="form-group"><label class="label" for="f-state">State</label><div class="select-wrapper"><select class="select" id="f-state">${['QLD','NSW','VIC','SA','WA','ACT','TAS','NT'].map(s => `<option value="${s}" ${v.state===s?'selected':''}>${s}</option>`).join('')}</select></div></div><div class="form-group" id="fuel-consumption-group" ${isEV?'style="display:none"':''} ><label class="label" for="f-fuel-cons">Fuel consumption (L/100km)</label><input type="number" class="input" id="f-fuel-cons" value="${v.fuelConsumption}" step="0.1" min="0"></div><div class="form-group" id="ev-group" ${!isEV?'style="display:none"':''} ><label class="label" for="f-ev-kwh">Battery size (kWh)</label><input type="number" class="input" id="f-ev-kwh" value="${v.evBatteryKwh || ''}" placeholder="e.g. 82"><label class="label" for="f-ev-range" style="margin-top:var(--space-4)">Range (km)</label><input type="number" class="input" id="f-ev-range" value="${v.evRangeKm || ''}" placeholder="e.g. 400"></div></div><div style="display:flex;gap:var(--space-3)"><button class="btn btn-secondary btn-pill" id="step-back">Back</button><button class="btn btn-primary btn-pill" id="step-next" style="flex:1">Continue</button></div>`;
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
    } else if (step === 1) {
      v.purchasePrice = num('f-price');
      v.resaleValue5yr = num('f-resale5');
      v.state = val('f-state') || 'QLD';
      v.fuelConsumption = num('f-fuel-cons') || v.fuelConsumption;
      v.evBatteryKwh = num('f-ev-kwh');
      v.evRangeKm = num('f-ev-range');
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