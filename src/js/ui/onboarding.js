// TRUE COST — ui/onboarding.js
// First-launch onboarding flow — Duolingo-style screens that gather
// market research data (sent to Formspree) and personalise the database
// filter for the user's first session.

const ONBOARDING_KEY = 'truecost_onboarded';
// FORMSPREE_ENDPOINT is declared in feedback.js (loaded before this file)

const Onboarding = {
  _step:    0,
  _answers: { channel: null, goal: null, vehicleType: null },

  // Call from App.init() — shows onboarding if first launch, else no-op.
  maybeShow() {
    if (localStorage.getItem(ONBOARDING_KEY)) return false;
    this._show();
    return true;
  },

  _show() {
    // Overlay sits above everything, including nav
    const overlay = document.createElement('div');
    overlay.id = 'ob-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:var(--color-bg,#f3f4f6);
      display:flex;flex-direction:column;
      overflow:hidden;
    `;
    document.body.appendChild(overlay);
    this._injectStyles();
    this._step = 0;
    this._renderStep();
  },

  _screens: [
    'welcome',
    'channel',
    'goal',
    'vehicleType',
    'install',
    'ready',
  ],

  _renderStep() {
    const overlay = document.getElementById('ob-overlay');
    if (!overlay) return;

    const screen = this._screens[this._step];
    const total  = this._screens.length - 2; // exclude welcome + ready from progress
    const prog   = this._step > 0 && this._step < this._screens.length - 1
      ? Math.round(((this._step) / total) * 100) : null;

    const progressBar = prog !== null
      ? `<div class="ob-progress-wrap"><div class="ob-progress-bar" style="width:${prog}%"></div></div>`
      : '';

    overlay.innerHTML = `
      <style id="ob-styles-inline"></style>
      ${progressBar}
      <div class="ob-screen" id="ob-screen">
        ${this['_screen_' + screen]()}
      </div>
    `;

    this._bindScreen(screen);
  },

  // ── Screen renderers ──────────────────────────────────────────────────────

  _screen_welcome() {
    return `
      <div class="ob-hero">🚗</div>
      <h1 class="ob-title">Know the real cost<br>of your next car.</h1>
      <p class="ob-sub">TrueCost calculates fuel, insurance, registration, depreciation and more — so you can compare cars honestly.</p>
      <div class="ob-actions">
        <button class="ob-btn-primary" id="ob-next">Get started →</button>
        <button class="ob-btn-skip" id="ob-skip">Skip intro</button>
      </div>
    `;
  },

  _screen_channel() {
    const options = [
      { value: 'google',    label: '🔍 Google Search' },
      { value: 'friend',    label: '👥 Friend or family' },
      { value: 'tiktok',    label: '📱 TikTok' },
      { value: 'instagram', label: '📸 Instagram / Facebook' },
      { value: 'youtube',   label: '▶️ YouTube' },
      { value: 'other',     label: '✨ Somewhere else' },
    ];
    return `
      <h2 class="ob-q">How did you find TrueCost?</h2>
      <p class="ob-hint">Helps us know where to focus.</p>
      <div class="ob-tiles" id="ob-tiles">
        ${options.map(o => `<button class="ob-tile" data-value="${o.value}">${o.label}</button>`).join('')}
      </div>
      <button class="ob-btn-skip" id="ob-skip">Skip</button>
    `;
  },

  _screen_goal() {
    const options = [
      { value: 'compare',  label: '⚖️ Comparing a few cars I\'m considering' },
      { value: 'ev',       label: '⚡ EV vs petrol — which makes sense?' },
      { value: 'afford',   label: '💰 Checking if I can afford a specific car' },
      { value: 'curious',  label: '🤔 Just curious about running costs' },
    ];
    return `
      <h2 class="ob-q">What are you trying to figure out?</h2>
      <p class="ob-hint">We'll tailor the experience.</p>
      <div class="ob-tiles" id="ob-tiles">
        ${options.map(o => `<button class="ob-tile ob-tile-lg" data-value="${o.value}">${o.label}</button>`).join('')}
      </div>
      <button class="ob-btn-skip" id="ob-skip">Skip</button>
    `;
  },

  _screen_vehicleType() {
    const options = [
      { value: 'SUV',        label: '🚙 SUV' },
      { value: 'Ute',        label: '🛻 Ute' },
      { value: 'EV',         label: '⚡ Electric' },
      { value: 'Hybrid',     label: '🌿 Hybrid' },
      { value: 'Small Car',  label: '🚗 Small Car' },
      { value: 'Luxury Car', label: '💎 Luxury' },
      { value: null,         label: '🤷 Not sure yet' },
    ];
    return `
      <h2 class="ob-q">What type of vehicle are you looking at?</h2>
      <p class="ob-hint">We'll pre-filter the database for you.</p>
      <div class="ob-tiles ob-tiles-grid" id="ob-tiles">
        ${options.map(o => `<button class="ob-tile" data-value="${o.value ?? ''}">${o.label}</button>`).join('')}
      </div>
      <button class="ob-btn-skip" id="ob-skip">Skip</button>
    `;
  },

  _screen_install() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    const canPrompt = !!window._deferredInstallPrompt;

    let installContent;
    if (canPrompt) {
      installContent = `
        <button class="ob-btn-primary" id="ob-install-btn">📲 Get TrueCost on your phone</button>
        <p class="ob-hint" style="margin-top:12px">Works offline — no app store needed.</p>
      `;
    } else if (isIOS) {
      installContent = `
        <div class="ob-install-steps">
          <div class="ob-install-step">
            <span class="ob-install-icon">1</span>
            <span>Tap the <strong>Share</strong> button <span style="font-size:1.2em">⬆️</span> in Safari</span>
          </div>
          <div class="ob-install-step">
            <span class="ob-install-icon">2</span>
            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
          </div>
          <div class="ob-install-step">
            <span class="ob-install-icon">3</span>
            <span>Tap <strong>Add</strong> — it'll open like a native app</span>
          </div>
        </div>
      `;
    } else {
      installContent = `
        <div class="ob-install-steps">
          <div class="ob-install-step">
            <span class="ob-install-icon">1</span>
            <span>Tap the <strong>⋮ menu</strong> in your browser</span>
          </div>
          <div class="ob-install-step">
            <span class="ob-install-icon">2</span>
            <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
          </div>
        </div>
      `;
    }

    return `
      <div class="ob-hero">📲</div>
      <h2 class="ob-title" style="font-size:1.5rem">Get TrueCost on your phone</h2>
      <p class="ob-sub">Install it once and it works offline — no app store, no updates, no hassle.</p>
      ${installContent}
      <button class="ob-btn-skip" id="ob-next" style="margin-top:var(--space-6,1.5rem)">
        ${canPrompt ? 'Maybe later →' : 'Continue →'}
      </button>
    `;
  },

  _screen_ready() {
    const type = this._answers.vehicleType;
    const typeLabel = type || 'all vehicles';
    const goalMap = {
      compare: "We've pre-filtered the database to " + typeLabel + ". Start comparing.",
      ev:      "Check out the EV tab in the database \u2014 we've sorted by running cost.",
      afford:  "Add your first vehicle and we'll break down every cost.",
      curious: 'Browse the database and tap any car to see its full cost breakdown.',
    };
    const subtitle = goalMap[this._answers.goal] || 'Tap the Database tab to explore 200+ vehicles.';

    return `
      <div class="ob-hero" style="font-size:4rem">🎉</div>
      <h2 class="ob-title">You're all set!</h2>
      <p class="ob-sub">${subtitle}</p>
      <button class="ob-btn-primary" id="ob-finish">Start exploring →</button>
    `;
  },

  // ── Event binding ─────────────────────────────────────────────────────────

  _bindScreen(screen) {
    // Generic next/skip
    document.getElementById('ob-next')?.addEventListener('click', () => this._advance(null));
    document.getElementById('ob-skip')?.addEventListener('click', () => this._advance(null));
    document.getElementById('ob-finish')?.addEventListener('click', () => this._complete());

    // Tile selection — advances automatically on tap
    document.querySelectorAll('.ob-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const key = { channel: 'channel', goal: 'goal', vehicleType: 'vehicleType' }[screen];
        const val = tile.dataset.value || null;
        if (key) this._answers[key] = val;
        tile.classList.add('selected');
        setTimeout(() => this._advance(val), 220);
      });
    });

    // PWA install button (Android Chrome / supported browsers)
    document.getElementById('ob-install-btn')?.addEventListener('click', async () => {
      const prompt = window._deferredInstallPrompt;
      if (!prompt) return;
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      window._deferredInstallPrompt = null;
      this._answers.installed = outcome === 'accepted';
      setTimeout(() => this._advance(null), 300);
    });
  },

  _advance(value) {
    this._step++;
    if (this._step >= this._screens.length) {
      this._complete();
    } else {
      this._renderStep();
    }
  },

  _complete() {
    // Apply vehicle type filter to database state
    if (this._answers.vehicleType && window.Database) {
      const vt = this._answers.vehicleType;
      // Map onboarding label → database category
      const catMap = {
        'SUV': 'SUV', 'Ute': 'Ute', 'EV': 'EV',
        'Hybrid': null, // handled via fuelType
        'Small Car': 'Small Car', 'Luxury Car': 'Luxury Car',
      };
      if (this._answers.vehicleType === 'Hybrid') {
        Database.state.selectedFuelTypes = ['hybrid', 'phev'];
      } else if (catMap[vt]) {
        Database.state.selectedCategories = [catMap[vt]];
      }
      if (this._answers.goal === 'ev') {
        Database.state.selectedFuelTypes = ['electric'];
        Database.state.sortBy = 'running-cost';
      }
    }

    // Mark onboarded
    localStorage.setItem(ONBOARDING_KEY, '1');

    // Remove overlay
    document.getElementById('ob-overlay')?.remove();

    // Navigate to database if they selected a vehicle type, else vehicles list
    if (this._answers.vehicleType || this._answers.goal === 'ev') {
      Router.navigate('database');
    }

    // Silently send market research data to Formspree
    this._sendAnalytics();
  },

  _sendAnalytics() {
    const { channel, goal, vehicleType, installed } = this._answers;
    if (!channel && !goal && !vehicleType) return; // all skipped — nothing to report

    const payload = {
      _subject:    'TrueCost Onboarding Response',
      type:        'Onboarding',
      channel:     channel     || '(skipped)',
      goal:        goal        || '(skipped)',
      vehicleType: vehicleType || '(skipped)',
      installed:   installed != null ? (installed ? 'Yes' : 'No') : '(not prompted)',
      userAgent:   navigator.userAgent.substring(0, 120),
    };

    fetch(FORMSPREE_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(payload),
    }).catch(() => {}); // silent — never block the user experience
  },

  _injectStyles() {
    if (document.getElementById('ob-styles')) return;
    const s = document.createElement('style');
    s.id = 'ob-styles';
    s.textContent = `
      #ob-overlay * { box-sizing: border-box; }

      .ob-progress-wrap {
        height: 4px;
        background: var(--color-border, #e5e7eb);
        flex-shrink: 0;
      }
      .ob-progress-bar {
        height: 100%;
        background: var(--color-primary, #0066cc);
        border-radius: 2px;
        transition: width 0.35s ease;
      }

      .ob-screen {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.5rem 3rem;
        text-align: center;
        overflow-y: auto;
        gap: 0;
      }

      .ob-hero {
        font-size: 5rem;
        line-height: 1;
        margin-bottom: 1.25rem;
        animation: ob-pop 0.4s cubic-bezier(.34,1.56,.64,1) both;
      }

      @keyframes ob-pop {
        from { transform: scale(0.6); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }

      .ob-title {
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--color-text, #1f2937);
        line-height: 1.2;
        margin: 0 0 0.75rem;
      }

      .ob-sub {
        font-size: 1rem;
        color: var(--color-text-muted, #6b7280);
        line-height: 1.5;
        margin: 0 0 2rem;
        max-width: 320px;
      }

      .ob-q {
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--color-text, #1f2937);
        margin: 0 0 0.35rem;
      }

      .ob-hint {
        font-size: 0.85rem;
        color: var(--color-text-muted, #6b7280);
        margin: 0 0 1.25rem;
      }

      .ob-tiles {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 360px;
        margin-bottom: 1rem;
      }

      .ob-tiles-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .ob-tile {
        background: var(--color-surface, #fff);
        border: 1.5px solid var(--color-border, #e5e7eb);
        border-radius: 12px;
        padding: 13px 16px;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--color-text, #1f2937);
        cursor: pointer;
        text-align: left;
        transition: border-color 0.15s, background 0.15s, transform 0.1s;
      }
      .ob-tile-lg {
        padding: 15px 16px;
      }
      .ob-tile:active,
      .ob-tile.selected {
        border-color: var(--color-primary, #0066cc);
        background: var(--color-primary-light, #f0f7ff);
        transform: scale(0.97);
      }

      .ob-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 100%;
        max-width: 360px;
      }

      .ob-btn-primary {
        width: 100%;
        max-width: 360px;
        padding: 16px;
        border-radius: 9999px;
        border: none;
        background: var(--color-primary, #0066cc);
        color: #fff;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.1s;
      }
      .ob-btn-primary:active { opacity: 0.85; transform: scale(0.98); }

      .ob-btn-skip {
        background: none;
        border: none;
        color: var(--color-text-muted, #6b7280);
        font-size: 0.875rem;
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 9999px;
        transition: color 0.15s;
      }
      .ob-btn-skip:hover { color: var(--color-text, #1f2937); }

      /* Install steps */
      .ob-install-steps {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        max-width: 340px;
        margin: 0 0 0.5rem;
        text-align: left;
      }
      .ob-install-step {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--color-surface, #fff);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 12px;
        padding: 14px;
        font-size: 0.9rem;
        color: var(--color-text, #1f2937);
        line-height: 1.4;
      }
      .ob-install-icon {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--color-primary, #0066cc);
        color: #fff;
        font-weight: 700;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
    document.head.appendChild(s);
  },
};

window.Onboarding = Onboarding;
