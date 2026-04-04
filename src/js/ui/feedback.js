// TRUE COST — ui/feedback.js
// Feedback tab: bug reports, suggestions, and general feedback via Formspree.
//
// IMPORTANT: Replace 'REPLACE_WITH_FORM_ID' below with your Formspree form ID.
// 1. Go to https://formspree.io and create a free account (target: smcnichol@outlook.com)
// 2. Create a new form — copy the form ID from the endpoint URL
// 3. Replace the placeholder below with your real form ID (e.g. 'xpwzgkqb')
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/REPLACE_WITH_FORM_ID';

const Feedback = {
  _selectedType: 'bug',

  render() {
    const page = document.getElementById('page-feedback');
    if (!page) return;

    page.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Send Feedback</h1>
      </div>
      <p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-bottom:var(--space-5)">
        Found a bug or have a suggestion? Let us know.
      </p>

      <div id="feedback-form-wrap">
        <div class="card">
          <div class="form-group">
            <label class="label">What kind of feedback?</label>
            <div class="feedback-type-row">
              <button class="feedback-type-btn active" data-type="bug">🐛 Bug Report</button>
              <button class="feedback-type-btn" data-type="suggestion">💡 Suggestion</button>
              <button class="feedback-type-btn" data-type="general">👍 General</button>
            </div>
          </div>

          <div class="form-group">
            <label class="label" for="feedback-message">Describe the issue or idea</label>
            <textarea class="input" id="feedback-message" rows="5"
              placeholder="Describe the issue or idea..."
              style="resize:vertical;min-height:120px;font-family:inherit"></textarea>
            <small id="feedback-char-hint" style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:4px;display:block">
              Minimum 20 characters
            </small>
          </div>

          <div class="form-group">
            <label class="label" for="feedback-name">
              Your name
              <span style="font-weight:400;color:var(--color-text-muted);font-size:var(--font-size-xs)">(optional)</span>
            </label>
            <input type="text" class="input" id="feedback-name" placeholder="e.g. Jane Smith">
          </div>

          <button class="btn btn-primary btn-full btn-pill" id="feedback-submit">Send Feedback</button>
        </div>
      </div>

      <div id="feedback-success" class="hidden" style="text-align:center;padding:var(--space-8) var(--space-4)">
        <div style="font-size:3rem;margin-bottom:var(--space-4)">✅</div>
        <h2 style="font-size:var(--font-size-lg);font-weight:700;color:var(--color-text);margin-bottom:var(--space-3)">Thanks!</h2>
        <p style="color:var(--color-text-muted);font-size:var(--font-size-sm)">We'll review your feedback soon.</p>
        <button class="btn btn-secondary btn-pill" id="feedback-send-another" style="margin-top:var(--space-6)">
          Send Another
        </button>
      </div>

      <div id="feedback-error" class="hidden"
        style="background:#fff3f3;border:1px solid #ffcccc;border-radius:var(--radius-md);
               padding:var(--space-4);margin-top:var(--space-4);
               color:var(--color-error,#e63946);font-size:var(--font-size-sm)">
        Couldn't send — please try again.
      </div>
    `;

    this._selectedType = 'bug';
    this._bindEvents();
  },

  _bindEvents() {
    // Type selector
    document.querySelectorAll('.feedback-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.feedback-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._selectedType = btn.dataset.type;
      });
    });

    // Character count hint
    const msgEl  = document.getElementById('feedback-message');
    const hintEl = document.getElementById('feedback-char-hint');
    msgEl?.addEventListener('input', () => {
      const len = msgEl.value.trim().length;
      if (len === 0) {
        hintEl.textContent  = 'Minimum 20 characters';
        hintEl.style.color  = 'var(--color-text-muted)';
      } else if (len < 20) {
        hintEl.textContent  = `${20 - len} more character${20 - len === 1 ? '' : 's'} needed`;
        hintEl.style.color  = 'var(--color-error, #e63946)';
      } else {
        hintEl.textContent  = `${len} characters`;
        hintEl.style.color  = 'var(--color-text-muted)';
      }
    });

    // Submit
    document.getElementById('feedback-submit')?.addEventListener('click', () => this._submit());

    // Send another — re-renders the form
    document.getElementById('feedback-send-another')?.addEventListener('click', () => this.render());
  },

  async _submit() {
    const message   = document.getElementById('feedback-message')?.value?.trim() ?? '';
    const name      = document.getElementById('feedback-name')?.value?.trim()    ?? '';
    const type      = this._selectedType;
    const submitBtn = document.getElementById('feedback-submit');

    if (message.length < 20) {
      App.toast('Please write at least 20 characters', 'error');
      document.getElementById('feedback-message')?.focus();
      return;
    }

    submitBtn.textContent = 'Sending…';
    submitBtn.disabled    = true;
    document.getElementById('feedback-error')?.classList.add('hidden');

    const typeLabel = type === 'bug' ? 'Bug Report' : type === 'suggestion' ? 'Suggestion' : 'General Feedback';

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({
          type:     typeLabel,
          message,
          name:     name || '(anonymous)',
          _subject: 'TrueCost Feedback: ' + typeLabel,
        }),
      });

      if (res.ok) {
        document.getElementById('feedback-form-wrap')?.classList.add('hidden');
        document.getElementById('feedback-success')?.classList.remove('hidden');
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch {
      document.getElementById('feedback-error')?.classList.remove('hidden');
      submitBtn.textContent = 'Send Feedback';
      submitBtn.disabled    = false;
    }
  },
};

window.Feedback = Feedback;
