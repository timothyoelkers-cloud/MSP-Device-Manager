/* ============================================================
   Favorites — Pinned pages in sidebar for quick access
   ============================================================ */

const Favorites = {
  _storageKey: 'msp_favorites',

  get() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  },

  _save(list) {
    localStorage.setItem(this._storageKey, JSON.stringify(list));
  },

  toggle(page) {
    const favs = this.get();
    const idx = favs.indexOf(page);
    if (idx >= 0) {
      favs.splice(idx, 1);
      Toast.show('Removed from favorites', 'info');
    } else {
      favs.unshift(page);
      Toast.show('Added to favorites', 'success');
    }
    this._save(favs);
    this.renderSidebar();
  },

  isFavorite(page) {
    return this.get().includes(page);
  },

  // Get the display label for a page from Router breadcrumbs
  _getLabel(page) {
    const crumbs = Router.breadcrumbs[page];
    if (crumbs) return crumbs[crumbs.length - 1];
    return page.charAt(0).toUpperCase() + page.slice(1);
  },

  // Render favorites section at top of sidebar
  renderSidebar() {
    const favs = this.get();
    const container = document.getElementById('favoritesSidebarSection');

    if (!container) return;

    if (favs.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    const currentPage = AppState.get('currentPage');
    container.innerHTML = `
      <div class="sidebar-section-title" style="display:flex;align-items:center;justify-content:space-between;">
        Favorites
        <span style="font-size:10px;color:var(--ink-muted);font-weight:400;">${favs.length}</span>
      </div>
      <ul class="sidebar-nav">
        ${favs.map(page => `
          <li class="sidebar-nav-item">
            <a class="sidebar-nav-link ${currentPage === page ? 'active' : ''}" data-page="${page}" onclick="Router.navigate('${page}')" style="position:relative;">
              <span class="sidebar-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              ${this._getLabel(page)}
              <span class="fav-unpin" onclick="event.stopPropagation(); event.preventDefault(); Favorites.toggle('${page}');" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);opacity:0;font-size:12px;color:var(--ink-muted);cursor:pointer;transition:opacity 0.15s;" title="Unpin">&#10005;</span>
            </a>
          </li>
        `).join('')}
      </ul>
    `;
  },

  // Generate a star button for page headers
  starButton(page) {
    const isFav = this.isFavorite(page);
    return `<button class="btn btn-ghost btn-sm" onclick="Favorites.toggle('${page}')" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" style="padding:4px 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'var(--warning)' : 'none'}" stroke="${isFav ? 'var(--warning)' : 'currentColor'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    </button>`;
  }
};
