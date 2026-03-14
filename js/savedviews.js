/* ============================================================
   Saved Views — Persist filter presets per page
   ============================================================ */

const SavedViews = {
  _storageKey: 'msp_saved_views',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this._storageKey) || '{}');
    } catch (e) { return {}; }
  },

  getForPage(page) {
    return this.getAll()[page] || [];
  },

  save(page, name, filters) {
    const all = this.getAll();
    if (!all[page]) all[page] = [];
    // Replace if same name exists
    const idx = all[page].findIndex(v => v.name === name);
    const view = { name, filters, created: Date.now() };
    if (idx >= 0) all[page][idx] = view;
    else all[page].push(view);
    localStorage.setItem(this._storageKey, JSON.stringify(all));
    Toast.show(`View "${name}" saved`, 'success');
  },

  delete(page, name) {
    const all = this.getAll();
    if (all[page]) {
      all[page] = all[page].filter(v => v.name !== name);
      localStorage.setItem(this._storageKey, JSON.stringify(all));
    }
  },

  // Render a save/load toolbar for any page
  renderToolbar(page, currentFilters, applyCallback) {
    const views = this.getForPage(page);
    return `
      <div class="saved-views-bar" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <span class="text-xs text-muted" style="margin-right:4px;">Views:</span>
        ${views.map(v => `
          <div class="chip" style="cursor:pointer;" onclick="${applyCallback}(${this._escapeJSON(JSON.stringify(v.filters))})">
            ${v.name}
            <span class="chip-remove" onclick="event.stopPropagation(); SavedViews.delete('${page}','${v.name}'); ${applyCallback}(null);">&times;</span>
          </div>
        `).join('')}
        <button class="btn btn-ghost btn-sm" onclick="SavedViews.showSaveDialog('${page}', ${this._escapeJSON(JSON.stringify(currentFilters))}, '${applyCallback}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Save View
        </button>
      </div>
    `;
  },

  _escapeJSON(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  },

  showSaveDialog(page, filtersJson, applyCallback) {
    let filters;
    try { filters = JSON.parse(filtersJson.replace(/&quot;/g, '"')); } catch (e) { filters = {}; }
    const name = prompt('Enter a name for this view:');
    if (name && name.trim()) {
      this.save(page, name.trim(), filters);
      // Re-render current page to show updated views bar
      const currentPage = AppState.get('currentPage');
      Router.render(currentPage);
    }
  },

  // Quick integration: get current filters for Devices page
  getDeviceFilters() {
    return {
      searchTerm: Devices.searchTerm,
      osFilter: Devices.osFilter,
      complianceFilter: Devices.complianceFilter,
      sortField: Devices.sortField,
      sortDir: Devices.sortDir
    };
  },

  applyDeviceFilters(filters) {
    if (!filters) { Router.render('devices'); return; }
    Devices.searchTerm = filters.searchTerm || '';
    Devices.osFilter = filters.osFilter || 'all';
    Devices.complianceFilter = filters.complianceFilter || 'all';
    Devices.sortField = filters.sortField || 'deviceName';
    Devices.sortDir = filters.sortDir || 'asc';
    Devices.currentPage = 1;
    Devices.render();
  }
};
