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
    const searchHtml = `
      <div class="database-search">
        <input
          type="text"
          id="database-search"
          class="database-search-input"
          placeholder="Search by make, model, variant..."
          value="${this.state.searchQuery}"
        >
      </div>
    `;
    container.insertAdjacentHTML('beforeend', searchHtml);

    const searchInput = container.querySelector('#database-search');
    searchInput.addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value;
      this.filterAndSort();
      this.render();
    });
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
      }

      .database-search-input {
        width: 100%;
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
