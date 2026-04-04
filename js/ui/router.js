// TRUE COST — ui/router.js
// Simple hash-based router for single-page navigation.

const Router = {
  _currentPage: 'vehicles',
  _pages: {},

  register(pageId, onEnter) {
    this._pages[pageId] = onEnter;
  },

  navigate(pageId, params = {}) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    // Show target
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.remove('hidden');
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    this._currentPage = pageId;
    // Call onEnter callback
    if (this._pages[pageId]) this._pages[pageId](params);
    window.scrollTo(0, 0);
  },

  current() { return this._currentPage; },
};