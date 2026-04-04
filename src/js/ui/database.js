const Database = {
  state: {
    searchQuery: '',
    selectedFuelTypes: [],
    selectedCategories: [],
    sortBy: 'name',
    filteredVehicles: [],
    topThree: [],
    remainingVehicles: []
  },

  init() {
    this.state = {
      searchQuery: '',
      selectedFuelTypes: [],
      selectedCategories: [],
      sortBy: 'name',
      filteredVehicles: [],
      topThree: [],
      remainingVehicles: []
    };
    this.filterAndSort();
    this._bindSearchDelegation();
  },

  _bindSearchDelegation() {
    const container = document.querySelector('#database-container');
    if (!container || container._searchDelegationBound) return;
    container._searchDelegationBound = true;

    // Input: show suggestions live without full page re-render
    container.addEventListener('input', (e) => {
      if (e.target.id !== 'database-search') return;
      const query = e.target.value;
      this.state.searchQuery = query;
      if (query.trim().length === 0) {
        this._hideSuggestions();
        this.filterAndSort();
        this._renderAfterSearch();
      } else {
        this._showSuggestions(query, e.target);
      }
    });

    // Keyboard navigation inside the search input
    container.addEventListener('keydown', (e) => {
      if (e.target.id !== 'database-search') return;
      const list = document.querySelector('#db-suggestions');
      if (!list) return;
      const items = list.querySelectorAll('.db-suggestion-item');
      const active = list.querySelector('.db-suggestion-item.focused');
      const activeIdx = active ? [...items].indexOf(active) : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[activeIdx + 1] || items[0];
        items.forEach(i => i.classList.remove('focused'));
        next?.classList.add('focused');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[activeIdx - 1] || items[items.length - 1];
        items.forEach(i => i.classList.remove('focused'));
        prev?.classList.add('focused');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const focused = list.querySelector('.db-suggestion-item.focused');
        if (focused) focused.click();
        else this._commitSearch(e.target.value);
      } else if (e.key === 'Escape') {
        this._hideSuggestions();
        this._commitSearch(e.target.value);
      }
    });

    // Click outside → hide suggestions and commit
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#database-search') && !e.target.closest('#db-suggestions')) {
        const hadSuggestions = !!document.querySelector('#db-suggestions');
        this._hideSuggestions();
        if (hadSuggestions) this._commitSearch(this.state.searchQuery);
      }
    });
  },

  _showSuggestions(query, inputEl) {
    const q = query.toLowerCase();
    const all = window.VehiclePresets.all || [];

    // Build unique make+model+fuelType entries ranked by relevance
    const seen = new Set();
    const suggestions = [];
    for (const v of all) {
      const makeLc    = (v.make    || '').toLowerCase();
      const modelLc   = (v.model   || '').toLowerCase();
      const variantLc = (v.variant || '').toLowerCase();
      const matchesMake    = makeLc.includes(q);
      const matchesModel   = modelLc.includes(q);
      const matchesVariant = variantLc.includes(q);
      if (!matchesMake && !matchesModel && !matchesVariant) continue;

      const key = `${v.make}|${v.model}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Rank: make-start > model-start > anywhere
      let rank = matchesMake && makeLc.startsWith(q) ? 0
               : matchesModel && modelLc.startsWith(q) ? 1
               : 2;
      suggestions.push({ make: v.make, model: v.model, fuelType: v.fuelType, category: v.category, rank });
      if (suggestions.length >= 30) break;
    }
    suggestions.sort((a, b) => a.rank - b.rank || (a.make + a.model).localeCompare(b.make + b.model));
    const top = suggestions.slice(0, 8);

    this._hideSuggestions();
    if (top.length === 0) return;

    const wrap = document.querySelector('.database-search');
    if (!wrap) return;

    const fuelEmoji = { electric: '⚡', phev: '🔌', hybrid: '🌿', diesel: '🛢️', petrol: '⛽' };

    const ul = document.createElement('ul');
    ul.id = 'db-suggestions';
    ul.setAttribute('role', 'listbox');
    ul.innerHTML = top.map((s, i) => {
      const icon = fuelEmoji[s.fuelType] || '🚗';
      const label = [s.make, s.model].filter(Boolean).join(' ');
      const sub   = [s.category, s.fuelType ? s.fuelType.charAt(0).toUpperCase() + s.fuelType.slice(1) : ''].filter(Boolean).join(' · ');
      return `<li class="db-suggestion-item" role="option" data-value="${label}" tabindex="-1">
        <span class="db-sug-icon">${icon}</span>
        <span class="db-sug-text">
          <span class="db-sug-name">${label}</span>
          ${sub ? `<span class="db-sug-sub">${sub}</span>` : ''}
        </span>
      </li>`;
    }).join('');

    wrap.appendChild(ul);

    // Click a suggestion → commit search
    ul.addEventListener('click', (e) => {
      const item = e.target.closest('.db-suggestion-item');
      if (!item) return;
      const val = item.dataset.value;
      this.state.searchQuery = val;
      const inp = document.querySelector('#database-search');
      if (inp) inp.value = val;
      this._hideSuggestions();
      this._commitSearch(val);
    });
  },

  _hideSuggestions() {
    document.querySelector('#db-suggestions')?.remove();
  },

  _commitSearch(query) {
    this.state.searchQuery = query;
    this.filterAndSort();
    const cursorPos = (document.querySelector('#database-search') || {}).selectionStart || query.length;
    this.render();
    const inp = document.querySelector('#database-search');
    if (inp) { inp.focus(); inp.setSelectionRange(cursorPos, cursorPos); }
  },

  _renderAfterSearch() {
    const cursorPos = (document.querySelector('#database-search') || {}).selectionStart || 0;
    this.render();
    const inp = document.querySelector('#database-search');
    if (inp) { inp.focus(); inp.setSelectionRange(cursorPos, cursorPos); }
  },

  filterAndSort() {
    let vehicles = window.VehiclePresets.all || [];

    // Apply search filter
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      vehicles = vehicles.filter(v =>
        (v.make && v.make.toLowerCase().includes(query)) ||
        (v.model && v.model.toLowerCase().includes(query)) ||
        (v.variant && v.variant.toLowerCase().includes(query))
      );
    }

    // Apply fuel type filter
    if (this.state.selectedFuelTypes.length > 0) {
      vehicles = vehicles.filter(v =>
        this.state.selectedFuelTypes.includes(v.fuelType)
      );
    }

    // Apply category filter
    if (this.state.selectedCategories.length > 0) {
      vehicles = vehicles.filter(v =>
        this.state.selectedCategories.includes(v.category)
      );
    }

    // Apply price cap from natural language search
    if (this.state._maxPrice) {
      vehicles = vehicles.filter(v => !v.purchasePrice || v.purchasePrice <= this.state._maxPrice);
    }

    // Apply sorting
    vehicles = this.sortVehicles(vehicles);

    this.state.filteredVehicles = vehicles;

    // Compute top 3 by estimated annual running cost (independent of user sort)
    const byRunningCost = [...vehicles].sort((a, b) =>
      this.estimateAnnualRunningCost(a) - this.estimateAnnualRunningCost(b)
    );
    this.state.topThree = byRunningCost.slice(0, Math.min(3, vehicles.length));

    // Remaining = user-sorted list minus top 3 (by object reference)
    const top3Set = new Set(this.state.topThree);
    this.state.remainingVehicles = vehicles.filter(v => !top3Set.has(v));
  },

  sortVehicles(vehicles) {
    const sorted = [...vehicles];

    switch (this.state.sortBy) {
      case 'price-low':
        sorted.sort((a, b) => (a.purchasePrice || 0) - (b.purchasePrice || 0));
        break;
      case 'price-high':
        sorted.sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0));
        break;
      case 'economy':
        sorted.sort((a, b) => {
          const aConsump = a.fuelConsumption || a.evConsumptionKwh || Infinity;
          const bConsump = b.fuelConsumption || b.evConsumptionKwh || Infinity;
          return aConsump - bConsump;
        });
        break;
      case 'name':
      default:
        sorted.sort((a, b) => {
          const aName = (a.make || '') + (a.model || '');
          const bName = (b.make || '') + (b.model || '');
          return aName.localeCompare(bName);
        });
    }

    return sorted;
  },

  getStats() {
    const all = window.VehiclePresets.all || [];
    const evs = all.filter(v => v.fuelType === 'electric').length;
    const prices = all
      .filter(v => v.purchasePrice)
      .map(v => v.purchasePrice)
      .sort((a, b) => a - b);

    return {
      total: all.length,
      evCount: evs,
      minPrice: prices.length > 0 ? prices[0] : 0,
      maxPrice: prices.length > 0 ? prices[prices.length - 1] : 0
    };
  },

  formatPrice(price) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(price || 0);
  },

  formatConsumption(vehicle) {
    if (vehicle.fuelType === 'electric') {
      return vehicle.evRangeKm ? `${vehicle.evRangeKm}km range` : 'N/A';
    }
    return vehicle.fuelConsumption ? `${vehicle.fuelConsumption}L/100km` : 'N/A';
  },

  estimateAnnualRunningCost(v) {
    const kmPerYear = 15000;
    const petrolPrice = 2.00;      // AUD/L
    const dieselPrice = 2.10;      // AUD/L
    const electricityPrice = 0.30; // AUD/kWh

    let fuelCost = 0;
    if (v.fuelType === 'electric') {
      fuelCost = (v.evConsumptionKwh || 18) / 100 * kmPerYear * electricityPrice;
    } else if (v.fuelType === 'diesel') {
      fuelCost = (v.fuelConsumption || 8) / 100 * kmPerYear * dieselPrice;
    } else if (v.fuelType === 'phev') {
      const electricPct = (v.phevElectricPct || 30) / 100;
      fuelCost = (v.evConsumptionKwh || 15) / 100 * (kmPerYear * electricPct) * electricityPrice
               + (v.fuelConsumption || 5) / 100 * (kmPerYear * (1 - electricPct)) * petrolPrice;
    } else {
      // petrol or hybrid
      fuelCost = (v.fuelConsumption || 8) / 100 * kmPerYear * petrolPrice;
    }

    const servicesPerYear = v.serviceIntervalKm
      ? kmPerYear / v.serviceIntervalKm
      : (v.serviceIntervalMonths ? 12 / v.serviceIntervalMonths : 1);
    const serviceCost = (v.serviceCostPerService || 350) * servicesPerYear;

    const tyreCost = (v.tyreCostPerSet || 900) / (v.tyreLifeKm || 40000) * kmPerYear;

    const insuranceCost = v.insuranceAnnual || 1800;

    return Math.round(fuelCost + serviceCost + tyreCost + insuranceCost);
  },

  getFuelTypeBadgeClass(fuelType) {
    const classes = {
      'petrol': 'badge-petrol',
      'diesel': 'badge-diesel',
      'hybrid': 'badge-hybrid',
      'phev': 'badge-hybrid',
      'electric': 'badge-ev'
    };
    return classes[fuelType] || 'badge-petrol';
  },

  async handleAddToCompare(preset) {
    try {
      const vehicle = createVehicle();
      VehicleImport.applyPreset(preset, vehicle);
      await saveVehicle(vehicle);
      App.toast(preset.year + ' ' + preset.make + ' ' + preset.model + ' added!', 'success');
      Router.navigate('vehicles');
    } catch (error) {
      console.error('Error adding vehicle:', error);
      App.toast('Error adding vehicle', 'error');
    }
  },

  async handleViewDetails(preset) {
    try {
      const vehicle = createVehicle();
      VehicleImport.applyPreset(preset, vehicle);
      await saveVehicle(vehicle);
      Router.navigate('detail', { id: vehicle.id });
    } catch (error) {
      console.error('Error viewing details:', error);
      App.toast('Error loading details', 'error');
    }
  },

  renderQuickStats(container) {
    const stats = this.getStats();
    const statsHtml = `
      <div class="database-quick-stats">
        <div class="stat-item">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Vehicles</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this.formatPrice(stats.minPrice)} – ${this.formatPrice(stats.maxPrice)}</div>
          <div class="stat-label">Price Range</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.evCount}</div>
          <div class="stat-label">Electric Vehicles</div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', statsHtml);
  },

  renderSearchBar(container) {
    const suggestions = [
      'EV under $60k',
      'Cheapest to run',
      'Family SUV',
      'Ute under $70k',
      'Hybrid under $50k',
      'Luxury car',
    ];
    const hasSpeech = ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    const searchHtml = `
      <div class="database-search">
        <div class="db-search-row">
          <input
            type="text"
            id="database-search"
            class="database-search-input"
            placeholder="e.g. cheap EV, family SUV, ute under $70k…"
            value="${this.state.searchQuery}"
          >
          ${hasSpeech ? `
          <button class="db-mic-btn" id="db-mic-btn" aria-label="Voice search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </button>` : ''}
        </div>
        <div class="db-search-chips">
          ${suggestions.map(s => `<button class="db-search-chip" data-query="${s}">${s}</button>`).join('')}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', searchHtml);
    // Input/keyboard listeners attached via event delegation in _bindSearchDelegation()
    // Mic and chip listeners attached here (they don't trigger re-render immediately)
    this._bindMicAndChips();
  },

  // ── Natural language parser ───────────────────────────────────────────────
  _parseNaturalQuery(query) {
    const q = query.toLowerCase();
    const result = { searchQuery: '', fuelTypes: [], categories: [], sortBy: null, maxPrice: null };

    // Fuel type
    if (/\belectric\b|\bev\b|\bevs\b/.test(q))          result.fuelTypes.push('electric');
    if (/\bhybrid\b/.test(q) && !/phev|plug/.test(q))   result.fuelTypes.push('hybrid');
    if (/\bphev\b|\bplug.?in\b/.test(q))                 result.fuelTypes.push('phev');
    if (/\bdiesel\b/.test(q))                            result.fuelTypes.push('diesel');
    if (/\bpetrol\b|\bgas\b/.test(q))                   result.fuelTypes.push('petrol');

    // Category
    if (/\b(large\s)?suv\b|\b4wd\b|\b4x4\b/.test(q))   result.categories.push('SUV');
    if (/\bute\b|\bpickup\b|\btruck\b/.test(q))         result.categories.push('Ute');
    if (/\bluxury\b|\bpremium\b/.test(q))               result.categories.push('Luxury Car');
    if (/\bsports?\b/.test(q))                          result.categories.push('Sports Car');
    if (/\bvan\b|\bpeople.?mover\b|\bmpv\b/.test(q))   result.categories.push('Van/People Mover');
    if (/\bsmall.?car\b|\bhatch\b|\bcity\b/.test(q))   result.categories.push('Small Car');
    if (/\bsedan\b|\bmedium\b/.test(q))                 result.categories.push('Medium/Large Car');
    if (/\bfamily\b/.test(q) && result.categories.length === 0) result.categories.push('SUV');

    // Sort intent
    if (/cheap(est)?\s*(to\s*run|running)|low(est)?\s*run|cheapest|most\s*economical|best\s*economy/.test(q)) {
      result.sortBy = 'running-cost';
    } else if (/cheap(est)?|budget|affordable|lowest\s*price|best\s*price/.test(q)) {
      result.sortBy = 'price-low';
    } else if (/economy|fuel\s*(efficient|economy)|best\s*mpg/.test(q)) {
      result.sortBy = 'economy';
    }

    // Price cap — "under $60k", "less than 50000", "below $45,000"
    const priceMatch = q.match(/(?:under|less\s*than|below|max|<)\s*\$?([\d,]+)\s*(k)?/);
    if (priceMatch) {
      let val = parseInt(priceMatch[1].replace(/,/g, ''));
      if (priceMatch[2] === 'k') val *= 1000;
      result.maxPrice = val;
    }

    // Make/model keyword — strip intent words, keep proper nouns
    const stripped = query
      .replace(/\b(find|show|search|get|give|me|a|an|the|some|good|great|best|cheap|cheapest|affordable|budget|luxury|premium|family|new|used|under|less than|below|above|over|around|about|with|for|and|or|ev|electric|hybrid|phev|plug.?in|diesel|petrol|suv|ute|sedan|hatch|sports?|van|people.?mover|4wd|4x4)\b/gi, '')
      .replace(/\$[\d,]+k?/gi, '')
      .replace(/\s+/g, ' ').trim();
    if (stripped.length > 1) result.searchQuery = stripped;

    return result;
  },

  _applyNaturalQuery(query) {
    const parsed = this._parseNaturalQuery(query);
    this.state.searchQuery      = parsed.searchQuery;
    this.state.selectedFuelTypes  = parsed.fuelTypes;
    this.state.selectedCategories = parsed.categories;
    if (parsed.sortBy)   this.state.sortBy = parsed.sortBy;
    if (parsed.maxPrice) this.state._maxPrice = parsed.maxPrice;
    else                 delete this.state._maxPrice;
    this.filterAndSort();
    this._commitSearch(parsed.searchQuery);
  },

  _bindMicAndChips() {
    // Suggested chips
    document.querySelectorAll('.db-search-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        const inp = document.querySelector('#database-search');
        if (inp) inp.value = q;
        this._hideSuggestions();
        this._applyNaturalQuery(q);
      });
    });

    // Voice search
    const micBtn = document.getElementById('db-mic-btn');
    if (!micBtn) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = 'en-AU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micBtn.addEventListener('click', () => {
      if (micBtn.classList.contains('listening')) {
        recognition.stop();
        return;
      }
      recognition.start();
      micBtn.classList.add('listening');
      micBtn.setAttribute('aria-label', 'Listening…');
    });

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const inp = document.querySelector('#database-search');
      if (inp) inp.value = transcript;
      micBtn.classList.remove('listening');
      micBtn.setAttribute('aria-label', 'Voice search');
      this._hideSuggestions();
      this._applyNaturalQuery(transcript);
    };

    recognition.onerror = recognition.onend = () => {
      micBtn.classList.remove('listening');
      micBtn.setAttribute('aria-label', 'Voice search');
    };
  },

  renderFuelTypeFilters(container) {
    const fuelTypeOptions = [
      { label: 'All', value: 'All' },
      { label: 'Petrol', value: 'petrol' },
      { label: 'Diesel', value: 'diesel' },
      { label: 'Hybrid', value: 'hybrid' },
      { label: 'PHEV', value: 'phev' },
      { label: 'Electric', value: 'electric' }
    ];
    const filtersHtml = `
      <div class="database-filters">
        <div class="filter-group">
          <div class="filter-label">Fuel Type</div>
          <div class="filter-chips">
            ${fuelTypeOptions.map(option => {
              const isSelected = option.value === 'All'
                ? this.state.selectedFuelTypes.length === 0
                : this.state.selectedFuelTypes.includes(option.value);
              return `
                <button
                  class="filter-chip ${isSelected ? 'active' : ''}"
                  data-fuel-type="${option.value}"
                >
                  ${option.label}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', filtersHtml);

    const chips = container.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const fuelType = e.target.dataset.fuelType;
        if (fuelType === 'All') {
          this.state.selectedFuelTypes = [];
        } else {
          if (this.state.selectedFuelTypes.includes(fuelType)) {
            this.state.selectedFuelTypes = this.state.selectedFuelTypes.filter(t => t !== fuelType);
          } else {
            this.state.selectedFuelTypes.push(fuelType);
          }
        }
        this.filterAndSort();
        this.render();
      });
    });
  },

  renderCategoryTabs(container) {
    const categories = ['All', 'Ute', 'SUV', 'Large SUV', 'Luxury SUV', 'Small Car', 'Medium/Large Car', 'Luxury Car', 'EV', 'Sports Car', 'Van/People Mover'];
    const tabsHtml = `
      <div class="database-category-tabs">
        <div class="tabs-scroll">
          ${categories.map(cat => {
            const isSelected = cat === 'All'
              ? this.state.selectedCategories.length === 0
              : this.state.selectedCategories.includes(cat);
            return `
              <button
                class="category-tab ${isSelected ? 'active' : ''}"
                data-category="${cat}"
              >
                ${cat}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', tabsHtml);

    const tabs = container.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        if (category === 'All') {
          this.state.selectedCategories = [];
        } else {
          if (this.state.selectedCategories.includes(category)) {
            this.state.selectedCategories = this.state.selectedCategories.filter(c => c !== category);
          } else {
            this.state.selectedCategories.push(category);
          }
        }
        this.filterAndSort();
        this.render();
      });
    });
  },

  renderSortDropdown(container) {
    const sortHtml = `
      <div class="database-sort">
        <label for="sort-select">Sort by:</label>
        <select id="sort-select" class="sort-select">
          <option value="name" ${this.state.sortBy === 'name' ? 'selected' : ''}>Name A–Z</option>
          <option value="price-low" ${this.state.sortBy === 'price-low' ? 'selected' : ''}>Price: Low → High</option>
          <option value="price-high" ${this.state.sortBy === 'price-high' ? 'selected' : ''}>Price: High → Low</option>
          <option value="economy" ${this.state.sortBy === 'economy' ? 'selected' : ''}>Fuel Economy</option>
        </select>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', sortHtml);

    const sortSelect = container.querySelector('#sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.state.sortBy = e.target.value;
      this.filterAndSort();
      this.render();
    });
  },

  renderResultsHeader(container) {
    const total = (window.VehiclePresets.all || []).length;
    const showing = this.state.filteredVehicles.length;
    const headerHtml = `
      <div class="database-results-header">
        <span class="results-count">Showing ${showing} of ${total} vehicles</span>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', headerHtml);
  },

  buildVehicleCardHtml(vehicle, idx, dataAttrPrefix, extraHeaderHtml = '') {
    const annualCost = this.estimateAnnualRunningCost(vehicle);
    return `
      <div class="vehicle-card card">
        <div class="card-header">
          <div class="vehicle-title">
            ${extraHeaderHtml}
            <div class="vehicle-year">${vehicle.year || 'N/A'}</div>
            <div class="vehicle-name">${vehicle.make || ''} ${vehicle.model || ''}</div>
          </div>
          <div class="vehicle-badge">
            <span class="badge ${this.getFuelTypeBadgeClass(vehicle.fuelType)}">
              ${vehicle.fuelType || 'Petrol'}
            </span>
          </div>
        </div>

        <div class="card-body">
          <div class="vehicle-variant">${vehicle.variant || ''}</div>

          <div class="vehicle-specs">
            <div class="spec-item">
              <span class="spec-label">Price</span>
              <span class="spec-value">${this.formatPrice(vehicle.purchasePrice)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">${vehicle.fuelType === 'electric' ? 'Range' : 'Consumption'}</span>
              <span class="spec-value">${this.formatConsumption(vehicle)}</span>
            </div>
            <div class="spec-item spec-item-wide">
              <span class="spec-label">Est. running cost</span>
              <span class="spec-value spec-value-cost">${this.formatPrice(annualCost)}/yr <span class="cost-per-km">$${(annualCost / 15000).toFixed(2)}/km</span></span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button
            class="btn btn-secondary btn-pill btn-sm ${dataAttrPrefix}-add-compare"
            data-${dataAttrPrefix}-index="${idx}"
          >
            Add to Compare
          </button>
          <button
            class="btn btn-ghost btn-pill btn-sm ${dataAttrPrefix}-view-details"
            data-${dataAttrPrefix}-index="${idx}"
          >
            View Details
          </button>
        </div>
      </div>
    `;
  },

  renderTopThree(container) {
    const top3 = this.state.topThree;
    if (top3.length === 0) return;

    const medals = ['🥇', '🥈', '🥉'];
    const rankLabels = ['1st', '2nd', '3rd'];

    const sectionHtml = `
      <div class="top3-section">
        <div class="top3-header">
          <span class="top3-title">🏆 Top ${top3.length} Lowest Running Cost</span>
          <span class="top3-subtitle">Est. at 15,000 km/yr · fuel + servicing + tyres + insurance</span>
        </div>
        <div class="top3-grid">
          ${top3.map((vehicle, idx) => `
            <div class="top3-card-wrap">
              <div class="rank-badge rank-${idx + 1}">${medals[idx]} ${rankLabels[idx]}</div>
              ${this.buildVehicleCardHtml(vehicle, idx, 'top3')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', sectionHtml);

    container.querySelectorAll('.top3-add-compare').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.top3Index);
        this.handleAddToCompare(this.state.topThree[idx]);
      });
    });

    container.querySelectorAll('.top3-view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.top3Index);
        this.handleViewDetails(this.state.topThree[idx]);
      });
    });
  },

  renderVehicleCards(container) {
    const remaining = this.state.remainingVehicles;

    if (this.state.filteredVehicles.length === 0) {
      const emptyHtml = `
        <div class="database-empty">
          <p>No vehicles found. Try adjusting your filters.</p>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', emptyHtml);
      return;
    }

    if (remaining.length === 0) return;

    const sectionHtml = `
      <div class="remaining-section">
        <div class="remaining-header">All results</div>
        <div class="database-grid">
          ${remaining.map((vehicle, idx) => this.buildVehicleCardHtml(vehicle, idx, 'preset')).join('')}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', sectionHtml);

    container.querySelectorAll('.preset-add-compare').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.presetIndex);
        this.handleAddToCompare(this.state.remainingVehicles[idx]);
      });
    });

    container.querySelectorAll('.preset-view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.presetIndex);
        this.handleViewDetails(this.state.remainingVehicles[idx]);
      });
    });
  },

  render() {
    const container = document.querySelector('#database-container');
    if (!container) {
      console.error('Database container not found');
      return;
    }

    container.innerHTML = '';
    container.classList.add('database-view');

    // Render sections in order
    this.renderQuickStats(container);
    this.renderSearchBar(container);
    this.renderFuelTypeFilters(container);
    this.renderCategoryTabs(container);
    this.renderSortDropdown(container);
    this.renderResultsHeader(container);
    this.renderTopThree(container);
    this.renderVehicleCards(container);

    // Inject styles
    this.injectStyles();
  },

  injectStyles() {
    // Check if styles already injected
    if (document.querySelector('#database-styles')) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = 'database-styles';
    styleEl.textContent = `
      .database-view {
        padding: var(--space-4, 1.5rem);
        max-width: 1200px;
        margin: 0 auto;
      }

      .database-quick-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-3, 1rem);
        margin-bottom: var(--space-5, 2rem);
        padding: var(--space-4, 1.5rem);
        background: var(--color-bg-subtle, #f8f9fa);
        border-radius: var(--radius-lg, 12px);
      }

      .stat-item {
        text-align: center;
      }

      .stat-value {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--color-primary, #0066cc);
        margin-bottom: var(--space-1, 0.25rem);
      }

      .stat-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-muted, #6b7280);
      }

      .database-search {
        margin-bottom: var(--space-4, 1.5rem);
        position: relative;
      }

      .db-search-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .database-search-input {
        flex: 1;
        padding: var(--space-3, 1rem);
        font-size: var(--font-size-base, 1rem);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        background: var(--color-surface, #ffffff);
        color: var(--color-text, #1f2937);
        box-sizing: border-box;
      }

      .database-search-input::placeholder {
        color: var(--color-text-muted, #6b7280);
      }

      .database-search-input:focus {
        outline: none;
        border-color: var(--color-primary, #0066cc);
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
      }

      /* Mic button */
      .db-mic-btn {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1.5px solid var(--color-border, #e5e7eb);
        background: var(--color-surface, #fff);
        color: var(--color-text-muted, #6b7280);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
      }
      .db-mic-btn:hover {
        border-color: var(--color-primary, #0066cc);
        color: var(--color-primary, #0066cc);
      }
      .db-mic-btn.listening {
        border-color: #ef4444;
        color: #ef4444;
        background: #fff5f5;
        animation: mic-pulse 1s ease-in-out infinite;
      }
      @keyframes mic-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
        50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }

      /* Suggested search chips */
      .db-search-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .db-search-chip {
        padding: 6px 12px;
        border-radius: 9999px;
        border: 1.5px solid var(--color-border, #e5e7eb);
        background: var(--color-surface, #fff);
        color: var(--color-text-muted, #6b7280);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
      }
      .db-search-chip:hover {
        border-color: var(--color-primary, #0066cc);
        color: var(--color-primary, #0066cc);
        background: var(--color-primary-light, #f0f7ff);
      }

      /* Autocomplete suggestions dropdown */

      #db-suggestions {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: var(--color-surface, #ffffff);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        list-style: none;
        margin: 0;
        padding: 4px 0;
        z-index: 200;
        max-height: 320px;
        overflow-y: auto;
      }

      .db-suggestion-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        cursor: pointer;
        transition: background 0.1s;
      }

      .db-suggestion-item:hover,
      .db-suggestion-item.focused {
        background: var(--color-primary-light, #f0f7ff);
      }

      .db-sug-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        width: 28px;
        text-align: center;
      }

      .db-sug-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .db-sug-name {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--color-text, #1f2937);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .db-sug-sub {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-muted, #6b7280);
        margin-top: 1px;
      }

      .database-filters {
        margin-bottom: var(--space-4, 1.5rem);
      }

      .filter-group {
        margin-bottom: var(--space-3, 1rem);
      }

      .filter-label {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--color-text, #1f2937);
        margin-bottom: var(--space-2, 0.5rem);
      }

      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2, 0.5rem);
      }

      .filter-chip {
        padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
        font-size: var(--font-size-sm, 0.875rem);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 20px;
        background: var(--color-surface, #ffffff);
        color: var(--color-text, #1f2937);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .filter-chip:hover {
        background: var(--color-bg-subtle, #f8f9fa);
      }

      .filter-chip.active {
        background: var(--color-primary, #0066cc);
        color: white;
        border-color: var(--color-primary, #0066cc);
      }

      .database-category-tabs {
        margin-bottom: var(--space-4, 1.5rem);
        overflow-x: auto;
      }

      .tabs-scroll {
        display: flex;
        gap: var(--space-2, 0.5rem);
        padding-bottom: var(--space-2, 0.5rem);
      }

      .category-tab {
        padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
        font-size: var(--font-size-sm, 0.875rem);
        border: none;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: var(--color-text-muted, #6b7280);
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .category-tab:hover {
        color: var(--color-text, #1f2937);
      }

      .category-tab.active {
        color: var(--color-primary, #0066cc);
        border-bottom-color: var(--color-primary, #0066cc);
      }

      .database-sort {
        margin-bottom: var(--space-4, 1.5rem);
        display: flex;
        align-items: center;
        gap: var(--space-2, 0.5rem);
      }

      .database-sort label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-text, #1f2937);
        font-weight: 500;
      }

      .sort-select {
        padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
        font-size: var(--font-size-sm, 0.875rem);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 8px);
        background: var(--color-surface, #ffffff);
        color: var(--color-text, #1f2937);
        cursor: pointer;
      }

      .sort-select:focus {
        outline: none;
        border-color: var(--color-primary, #0066cc);
      }

      .database-results-header {
        margin-bottom: var(--space-4, 1.5rem);
        padding: var(--space-2, 0.5rem) 0;
        border-bottom: 1px solid var(--color-border, #e5e7eb);
      }

      .results-count {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-text-muted, #6b7280);
      }

      .database-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--space-4, 1.5rem);
        margin-bottom: var(--space-6, 2.5rem);
      }

      @media (max-width: 768px) {
        .database-grid {
          grid-template-columns: 1fr;
        }

        .database-quick-stats {
          grid-template-columns: 1fr;
        }

        .database-view {
          padding: var(--space-3, 1rem);
        }

        .tabs-scroll {
          flex-wrap: wrap;
        }
      }

      .vehicle-card {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--color-bg-card, #ffffff);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-lg, 12px);
        overflow: hidden;
        transition: all 0.2s ease;
      }

      .vehicle-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .card-header {
        padding: var(--space-4, 1.5rem);
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-2, 0.5rem);
      }

      .vehicle-title {
        flex: 1;
      }

      .vehicle-year {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-muted, #6b7280);
        margin-bottom: var(--space-1, 0.25rem);
      }

      .vehicle-name {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--color-text, #1f2937);
      }

      .vehicle-badge {
        flex-shrink: 0;
      }

      .badge {
        display: inline-block;
        padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 500;
        border-radius: 4px;
      }

      .badge-petrol {
        background-color: #fef3c7;
        color: #92400e;
      }

      .badge-diesel {
        background-color: #dbeafe;
        color: #0c4a6e;
      }

      .badge-hybrid {
        background-color: #d1fae5;
        color: #065f46;
      }

      .badge-ev {
        background-color: #c7d2fe;
        color: #312e81;
      }

      .card-body {
        padding: var(--space-4, 1.5rem);
        flex: 1;
      }

      .vehicle-variant {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-text-secondary, #4b5563);
        margin-bottom: var(--space-3, 1rem);
      }

      .vehicle-specs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3, 1rem);
      }

      .spec-item {
        display: flex;
        flex-direction: column;
      }

      .spec-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-muted, #6b7280);
        margin-bottom: var(--space-1, 0.25rem);
      }

      .spec-value {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--color-text, #1f2937);
      }

      .card-footer {
        padding: var(--space-4, 1.5rem);
        border-top: 1px solid var(--color-border, #e5e7eb);
        display: flex;
        gap: var(--space-2, 0.5rem);
      }

      .btn {
        padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
        font-size: var(--font-size-sm, 0.875rem);
        border: none;
        border-radius: var(--radius-md, 8px);
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 1;
      }

      .btn-pill {
        border-radius: 20px;
      }

      .btn-sm {
        padding: var(--space-2, 0.5rem) var(--space-3, 1rem);
        font-size: var(--font-size-xs, 0.75rem);
      }

      .btn-primary {
        background: var(--color-primary, #0066cc);
        color: white;
      }

      .btn-primary:hover {
        opacity: 0.9;
      }

      .btn-secondary {
        background: var(--color-bg-subtle, #f8f9fa);
        color: var(--color-text, #1f2937);
        border: 1px solid var(--color-border, #e5e7eb);
      }

      .btn-secondary:hover {
        background: var(--color-bg-secondary, #f3f4f6);
      }

      .btn-ghost {
        background: transparent;
        color: var(--color-primary, #0066cc);
        border: 1px solid var(--color-primary, #0066cc);
      }

      .btn-ghost:hover {
        background: rgba(0, 102, 204, 0.05);
      }

      .database-empty {
        padding: var(--space-6, 2.5rem) var(--space-4, 1.5rem);
        text-align: center;
        color: var(--color-text-muted, #6b7280);
        background: var(--color-bg-subtle, #f8f9fa);
        border-radius: var(--radius-lg, 12px);
      }

      .database-empty p {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
      }

      /* ── Top 3 section ── */
      .top3-section {
        margin-bottom: var(--space-5, 2rem);
        padding: var(--space-4, 1.5rem);
        background: linear-gradient(135deg, #fef9ec 0%, #f0fdf4 100%);
        border: 1px solid #d4edda;
        border-radius: var(--radius-lg, 12px);
      }

      .top3-header {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: var(--space-2, 0.5rem);
        margin-bottom: var(--space-4, 1.5rem);
      }

      .top3-title {
        font-size: var(--font-size-base, 1rem);
        font-weight: 700;
        color: var(--color-text, #1f2937);
      }

      .top3-subtitle {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-text-muted, #6b7280);
      }

      .top3-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-3, 1rem);
      }

      @media (max-width: 900px) {
        .top3-grid {
          grid-template-columns: 1fr;
        }
      }

      .top3-card-wrap {
        position: relative;
        padding-top: var(--space-4, 1.5rem);
      }

      .rank-badge {
        position: absolute;
        top: 0;
        left: var(--space-3, 1rem);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 999px;
        color: white;
        z-index: 1;
      }

      .rank-1 { background: #D97706; }
      .rank-2 { background: #6B7280; }
      .rank-3 { background: #92400E; }

      .spec-item-wide {
        grid-column: 1 / -1;
      }

      .spec-value-cost {
        color: #15803D;
      }

      .cost-per-km {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 400;
        color: var(--color-text-muted, #6b7280);
        margin-left: 4px;
      }

      /* ── Remaining vehicles section ── */
      .remaining-section {
        margin-bottom: var(--space-6, 2.5rem);
      }

      .remaining-header {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--color-text-muted, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--space-3, 1rem);
        padding-bottom: var(--space-2, 0.5rem);
        border-bottom: 1px solid var(--color-border, #e5e7eb);
      }
    `;

    document.head.appendChild(styleEl);
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Database;
}
