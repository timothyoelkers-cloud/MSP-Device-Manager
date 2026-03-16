/* ============================================================
   Saved Views — Filter presets for devices, users, and groups
   ============================================================ */

const SavedViews = {
  STORAGE_KEY: 'saved_views',
  _editingId: null,

  // --- Persistence ---

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  _save(views) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(views));
    } catch (e) {
      Toast.show('Failed to save views to storage', 'error');
    }
  },

  _generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // --- Filter config ---

  operators: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ],

  fieldsByPage: {
    devices: [
      { value: 'deviceName', label: 'Device Name' },
      { value: 'operatingSystem', label: 'Operating System' },
      { value: 'osVersion', label: 'OS Version' },
      { value: 'complianceState', label: 'Compliance State' },
      { value: 'managementState', label: 'Management State' },
      { value: 'enrolledDateTime', label: 'Enrolled Date' },
      { value: 'lastSyncDateTime', label: 'Last Sync' },
      { value: 'userDisplayName', label: 'Primary User' },
      { value: 'manufacturer', label: 'Manufacturer' },
      { value: 'model', label: 'Model' },
      { value: 'serialNumber', label: 'Serial Number' },
      { value: 'isEncrypted', label: 'Encrypted' },
      { value: 'jailBroken', label: 'Jailbroken' }
    ],
    users: [
      { value: 'displayName', label: 'Display Name' },
      { value: 'userPrincipalName', label: 'UPN' },
      { value: 'mail', label: 'Email' },
      { value: 'jobTitle', label: 'Job Title' },
      { value: 'department', label: 'Department' },
      { value: 'accountEnabled', label: 'Account Enabled' },
      { value: 'createdDateTime', label: 'Created Date' },
      { value: 'usageLocation', label: 'Usage Location' }
    ],
    groups: [
      { value: 'displayName', label: 'Group Name' },
      { value: 'groupTypes', label: 'Group Type' },
      { value: 'membershipRule', label: 'Membership Rule' },
      { value: 'mail', label: 'Email' },
      { value: 'securityEnabled', label: 'Security Enabled' },
      { value: 'mailEnabled', label: 'Mail Enabled' },
      { value: 'createdDateTime', label: 'Created Date' }
    ]
  },

  pageLabels: {
    devices: 'Devices',
    users: 'Users',
    groups: 'Groups'
  },

  // --- CRUD ---

  getViewsForPage(page) {
    return this._load().filter(v => v.page === page);
  },

  getDefaultView(page) {
    return this._load().find(v => v.page === page && v.isDefault) || null;
  },

  _getViewById(id) {
    return this._load().find(v => v.id === id) || null;
  },

  _createView(data) {
    const views = this._load();
    const view = {
      id: this._generateId(),
      name: data.name,
      description: data.description || '',
      page: data.page,
      filters: data.filters || [],
      sortBy: data.sortBy || '',
      sortDir: data.sortDir || 'asc',
      createdAt: new Date().toISOString(),
      isDefault: !!data.isDefault
    };

    // If setting as default, unset others on same page
    if (view.isDefault) {
      views.forEach(v => {
        if (v.page === view.page) v.isDefault = false;
      });
    }

    views.push(view);
    this._save(views);
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('view_created', `Created saved view "${view.name}" for ${view.page}`);
    }
    return view;
  },

  _updateView(id, data) {
    const views = this._load();
    const idx = views.findIndex(v => v.id === id);
    if (idx === -1) return null;

    if (data.isDefault) {
      views.forEach(v => {
        if (v.page === views[idx].page) v.isDefault = false;
      });
    }

    Object.assign(views[idx], data);
    this._save(views);
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('view_updated', `Updated saved view "${views[idx].name}"`);
    }
    return views[idx];
  },

  _deleteView(id) {
    const views = this._load();
    const view = views.find(v => v.id === id);
    if (!view) return;
    this._save(views.filter(v => v.id !== id));
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('view_deleted', `Deleted saved view "${view.name}"`);
    }
    Toast.show(`View "${view.name}" deleted`, 'success');
    this.render();
  },

  toggleDefault(id) {
    const views = this._load();
    const view = views.find(v => v.id === id);
    if (!view) return;

    if (view.isDefault) {
      view.isDefault = false;
    } else {
      views.forEach(v => {
        if (v.page === view.page) v.isDefault = false;
      });
      view.isDefault = true;
    }

    this._save(views);
    Toast.show(view.isDefault ? `"${view.name}" set as default` : 'Default view cleared', 'success');
    this.render();
  },

  // --- Apply view ---

  applyView(viewId) {
    const view = this._getViewById(viewId);
    if (!view) {
      Toast.show('View not found', 'error');
      return;
    }

    AppState.set('activeViewId', viewId);
    AppState.set('activeViewFilters', view.filters);
    AppState.set('activeViewSortBy', view.sortBy);
    AppState.set('activeViewSortDir', view.sortDir);

    Toast.show(`Applied view "${view.name}"`, 'success');
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('view_applied', `Applied saved view "${view.name}" on ${view.page}`);
    }

    // Navigate to the target page
    if (typeof Router !== 'undefined') {
      window.location.hash = '#/' + view.page;
    }
  },

  clearActiveView() {
    AppState.set('activeViewId', null);
    AppState.set('activeViewFilters', null);
    AppState.set('activeViewSortBy', null);
    AppState.set('activeViewSortDir', null);
  },

  // --- View selector dropdown (embeddable in other pages) ---

  renderViewSelector(page) {
    const views = this.getViewsForPage(page);
    const activeId = AppState.get('activeViewId') || '';

    if (views.length === 0) {
      return `<select class="form-select" style="min-width:180px;font-size:13px;" onchange="if(this.value==='__manage'){SavedViews.clearActiveView();window.location.hash='#/saved-views';}else{this.value='';}">
        <option value="">No saved views</option>
        <option value="__manage">Manage Views...</option>
      </select>`;
    }

    let html = `<select class="form-select" style="min-width:180px;font-size:13px;" onchange="SavedViews._onSelectorChange(this.value, '${page}')">`;
    html += '<option value="">-- Saved Views --</option>';
    views.forEach(v => {
      const def = v.isDefault ? ' (default)' : '';
      html += `<option value="${v.id}" ${v.id === activeId ? 'selected' : ''}>${this._esc(v.name)}${def}</option>`;
    });
    html += '<option value="__clear">Clear Active View</option>';
    html += '<option value="__manage">Manage Views...</option>';
    html += '</select>';
    return html;
  },

  _onSelectorChange(value, page) {
    if (value === '__clear') {
      this.clearActiveView();
      if (typeof Router !== 'undefined') Router.render(AppState.get('currentPage'));
      Toast.show('Active view cleared', 'info');
    } else if (value === '__manage') {
      this.clearActiveView();
      window.location.hash = '#/saved-views';
    } else if (value) {
      this.applyView(value);
    }
  },

  // --- Main management page ---

  render() {
    const main = document.getElementById('mainContent');
    const views = this._load();

    const grouped = {};
    Object.keys(this.pageLabels).forEach(p => { grouped[p] = []; });
    views.forEach(v => {
      if (!grouped[v.page]) grouped[v.page] = [];
      grouped[v.page].push(v);
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Saved Views</h1>
          <p class="page-subtitle">${views.length} saved view${views.length !== 1 ? 's' : ''} across all pages</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="SavedViews.showCreateModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New View
          </button>
        </div>
      </div>

      <div class="animate-fade" style="display:flex;flex-direction:column;gap:24px;">
        ${Object.entries(grouped).map(([page, pageViews]) => `
          <div class="card">
            <div class="card-header">
              <h3 class="card-header-title">${this.pageLabels[page] || page}</h3>
              <span class="badge">${pageViews.length}</span>
            </div>
            <div class="card-body" style="padding:0;">
              ${pageViews.length === 0 ? `
                <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
                  No saved views for ${this.pageLabels[page] || page}
                </div>
              ` : `
                <table class="data-table" style="margin:0;">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Filters</th>
                      <th>Sort</th>
                      <th>Default</th>
                      <th>Created</th>
                      <th style="width:140px;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pageViews.map(v => `
                      <tr>
                        <td><strong>${this._esc(v.name)}</strong></td>
                        <td style="color:var(--text-muted);font-size:12px;">${this._esc(v.description || '--')}</td>
                        <td>
                          ${(v.filters || []).map(f => `
                            <span class="badge" style="margin:1px;">${this._esc(this._fieldLabel(v.page, f.field))} ${this._operatorLabel(f.operator)}${this._needsValue(f.operator) ? ' "' + this._esc(f.value) + '"' : ''}</span>
                          `).join('')}
                          ${(v.filters || []).length === 0 ? '<span style="color:var(--text-muted);font-size:12px;">None</span>' : ''}
                        </td>
                        <td style="font-size:12px;">${v.sortBy ? this._fieldLabel(v.page, v.sortBy) + ' ' + (v.sortDir === 'desc' ? '&#9660;' : '&#9650;') : '--'}</td>
                        <td>
                          <button class="btn btn-ghost btn-sm" onclick="SavedViews.toggleDefault('${v.id}')" title="${v.isDefault ? 'Remove default' : 'Set as default'}">
                            ${v.isDefault
                              ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
                              : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
                            }
                          </button>
                        </td>
                        <td style="font-size:12px;color:var(--text-muted);">${new Date(v.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style="display:flex;gap:4px;">
                            <button class="btn btn-primary btn-sm" onclick="SavedViews.applyView('${v.id}')">Apply</button>
                            <button class="btn btn-secondary btn-sm" onclick="SavedViews.showEditModal('${v.id}')">Edit</button>
                            <button class="btn btn-ghost btn-sm text-danger" onclick="SavedViews._deleteView('${v.id}')">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Modal container -->
      <div id="savedViewModalOverlay"></div>
    `;
  },

  // --- Save dialog (called from device/user/group pages) ---

  showSaveDialog(page, currentFilters) {
    this._editingId = null;
    const fields = this.fieldsByPage[page] || [];
    const filters = (currentFilters && currentFilters.length > 0)
      ? currentFilters
      : [{ field: fields[0]?.value || '', operator: 'contains', value: '' }];

    this._showModal({
      title: 'Save Current View',
      page: page,
      name: '',
      description: '',
      filters: filters,
      sortBy: '',
      sortDir: 'asc',
      isDefault: false
    });
  },

  // --- Create / Edit modals ---

  showCreateModal() {
    this._editingId = null;
    const page = 'devices';
    const fields = this.fieldsByPage[page] || [];

    this._showModal({
      title: 'Create New View',
      page: page,
      name: '',
      description: '',
      filters: [{ field: fields[0]?.value || '', operator: 'contains', value: '' }],
      sortBy: '',
      sortDir: 'asc',
      isDefault: false
    });
  },

  showEditModal(id) {
    const view = this._getViewById(id);
    if (!view) return;
    this._editingId = id;

    const filters = (view.filters && view.filters.length > 0)
      ? view.filters
      : [{ field: '', operator: 'contains', value: '' }];

    this._showModal({
      title: 'Edit View',
      page: view.page,
      name: view.name,
      description: view.description,
      filters: filters,
      sortBy: view.sortBy,
      sortDir: view.sortDir,
      isDefault: view.isDefault
    });
  },

  _showModal(data) {
    // Ensure a container exists
    let overlay = document.getElementById('savedViewModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'savedViewModalOverlay';
      document.body.appendChild(overlay);
    }

    const closeBtn = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    overlay.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)SavedViews._closeModal();">
        <div class="modal modal-lg" style="max-width:680px;">
          <div class="modal-header">
            <h3 class="modal-title">${data.title}</h3>
            <button class="modal-close" onclick="SavedViews._closeModal();">${closeBtn}</button>
          </div>
          <div class="modal-body" style="max-height:65vh;overflow-y:auto;">
            <div style="display:flex;flex-direction:column;gap:16px;">

              <!-- Name -->
              <div class="form-group">
                <label class="form-label">View Name *</label>
                <input type="text" class="form-input" id="sv_name" value="${this._escAttr(data.name)}" placeholder="e.g. Non-compliant Windows devices">
              </div>

              <!-- Description -->
              <div class="form-group">
                <label class="form-label">Description</label>
                <input type="text" class="form-input" id="sv_description" value="${this._escAttr(data.description)}" placeholder="Optional description">
              </div>

              <!-- Page -->
              <div class="form-group">
                <label class="form-label">Page</label>
                <select class="form-select" id="sv_page" onchange="SavedViews._onPageChange()">
                  ${Object.entries(this.pageLabels).map(([val, lbl]) =>
                    `<option value="${val}" ${val === data.page ? 'selected' : ''}>${lbl}</option>`
                  ).join('')}
                </select>
              </div>

              <!-- Filters -->
              <div class="form-group">
                <label class="form-label">Filters</label>
                <div id="sv_filters" style="display:flex;flex-direction:column;gap:8px;">
                  ${data.filters.map((f, i) => this._renderFilterRow(data.page, f, i)).join('')}
                </div>
                <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="SavedViews._addFilterRow()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Filter
                </button>
              </div>

              <!-- Sort -->
              <div style="display:flex;gap:12px;">
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Sort By</label>
                  <select class="form-select" id="sv_sortBy">
                    <option value="">None</option>
                    ${(this.fieldsByPage[data.page] || []).map(f =>
                      `<option value="${f.value}" ${f.value === data.sortBy ? 'selected' : ''}>${f.label}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="form-group" style="flex:1;">
                  <label class="form-label">Direction</label>
                  <select class="form-select" id="sv_sortDir">
                    <option value="asc" ${data.sortDir === 'asc' ? 'selected' : ''}>Ascending</option>
                    <option value="desc" ${data.sortDir === 'desc' ? 'selected' : ''}>Descending</option>
                  </select>
                </div>
              </div>

              <!-- Default -->
              <div style="display:flex;align-items:center;gap:8px;">
                <input type="checkbox" id="sv_isDefault" ${data.isDefault ? 'checked' : ''}>
                <label for="sv_isDefault" class="form-label" style="margin:0;cursor:pointer;">Set as default view for this page</label>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="SavedViews._closeModal();">Cancel</button>
            <button class="btn btn-primary" onclick="SavedViews._saveFromModal();">
              ${this._editingId ? 'Update View' : 'Save View'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _renderFilterRow(page, filter, index) {
    const fields = this.fieldsByPage[page] || [];
    const needsVal = this._needsValue(filter.operator);

    return `
      <div class="sv-filter-row" style="display:flex;gap:8px;align-items:center;" data-index="${index}">
        <select class="form-select" style="flex:2;" data-role="field" onchange="SavedViews._onFilterFieldChange(${index}, this.value)">
          <option value="">-- Select Field --</option>
          ${fields.map(f =>
            `<option value="${f.value}" ${f.value === filter.field ? 'selected' : ''}>${f.label}</option>`
          ).join('')}
        </select>
        <select class="form-select" style="flex:2;" data-role="operator" onchange="SavedViews._onFilterOperatorChange(${index}, this.value)">
          ${this.operators.map(op =>
            `<option value="${op.value}" ${op.value === filter.operator ? 'selected' : ''}>${op.label}</option>`
          ).join('')}
        </select>
        <input type="text" class="form-input" style="flex:2;${needsVal ? '' : 'visibility:hidden;'}" data-role="value"
          value="${this._escAttr(filter.value || '')}" placeholder="Value">
        <button class="btn btn-ghost btn-sm" style="flex-shrink:0;color:var(--danger);padding:4px 6px;" onclick="SavedViews._removeFilterRow(${index})" title="Remove filter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  },

  // --- Modal filter interactions ---

  _getModalFilters() {
    const rows = document.querySelectorAll('.sv-filter-row');
    const filters = [];
    rows.forEach(row => {
      filters.push({
        field: row.querySelector('[data-role="field"]')?.value || '',
        operator: row.querySelector('[data-role="operator"]')?.value || 'contains',
        value: row.querySelector('[data-role="value"]')?.value || ''
      });
    });
    return filters;
  },

  _addFilterRow() {
    const page = document.getElementById('sv_page')?.value || 'devices';
    const container = document.getElementById('sv_filters');
    if (!container) return;
    const index = container.querySelectorAll('.sv-filter-row').length;
    const fields = this.fieldsByPage[page] || [];
    const defaultField = fields[0]?.value || '';
    const tmp = document.createElement('div');
    tmp.innerHTML = this._renderFilterRow(page, { field: defaultField, operator: 'contains', value: '' }, index);
    container.appendChild(tmp.firstElementChild);
  },

  _removeFilterRow(index) {
    const container = document.getElementById('sv_filters');
    if (!container) return;
    const rows = container.querySelectorAll('.sv-filter-row');
    if (rows.length <= 1) {
      Toast.show('At least one filter row is required', 'warning');
      return;
    }
    rows[index]?.remove();
    // Re-index remaining rows
    container.querySelectorAll('.sv-filter-row').forEach((row, i) => {
      row.dataset.index = i;
      row.querySelector('[data-role="field"]')?.setAttribute('onchange', `SavedViews._onFilterFieldChange(${i}, this.value)`);
      row.querySelector('[data-role="operator"]')?.setAttribute('onchange', `SavedViews._onFilterOperatorChange(${i}, this.value)`);
      row.querySelector('.btn-ghost')?.setAttribute('onclick', `SavedViews._removeFilterRow(${i})`);
    });
  },

  _onFilterFieldChange(index, value) {
    // Value is read on save; no action needed
  },

  _onFilterOperatorChange(index, value) {
    const rows = document.querySelectorAll('.sv-filter-row');
    const row = rows[index];
    if (!row) return;
    const valInput = row.querySelector('[data-role="value"]');
    if (valInput) {
      valInput.style.visibility = this._needsValue(value) ? 'visible' : 'hidden';
    }
  },

  _onPageChange() {
    const page = document.getElementById('sv_page')?.value || 'devices';
    const container = document.getElementById('sv_filters');
    if (!container) return;

    // Rebuild filter rows with new page fields
    const fields = this.fieldsByPage[page] || [];
    const defaultField = fields[0]?.value || '';
    container.innerHTML = this._renderFilterRow(page, { field: defaultField, operator: 'contains', value: '' }, 0);

    // Rebuild sort dropdown
    const sortSelect = document.getElementById('sv_sortBy');
    if (sortSelect) {
      sortSelect.innerHTML = '<option value="">None</option>' +
        fields.map(f => `<option value="${f.value}">${f.label}</option>`).join('');
    }
  },

  // --- Save handler ---

  _saveFromModal() {
    const name = (document.getElementById('sv_name')?.value || '').trim();
    if (!name) {
      Toast.show('View name is required', 'warning');
      document.getElementById('sv_name')?.focus();
      return;
    }

    const page = document.getElementById('sv_page')?.value || 'devices';
    const description = (document.getElementById('sv_description')?.value || '').trim();
    const sortBy = document.getElementById('sv_sortBy')?.value || '';
    const sortDir = document.getElementById('sv_sortDir')?.value || 'asc';
    const isDefault = document.getElementById('sv_isDefault')?.checked || false;

    // Gather filters, skip rows with no field selected
    const rawFilters = this._getModalFilters();
    const filters = rawFilters.filter(f => f.field).map(f => ({
      field: f.field,
      operator: f.operator,
      value: this._needsValue(f.operator) ? f.value : ''
    }));

    const data = { name, description, page, filters, sortBy, sortDir, isDefault };

    if (this._editingId) {
      this._updateView(this._editingId, data);
      Toast.show(`View "${name}" updated`, 'success');
    } else {
      this._createView(data);
      Toast.show(`View "${name}" created`, 'success');
    }

    this._closeModal();
    this._editingId = null;

    // Re-render if on the saved views page
    if (AppState.get('currentPage') === 'saved-views') {
      this.render();
    }
  },

  _closeModal() {
    const overlay = document.getElementById('savedViewModalOverlay');
    if (overlay) overlay.innerHTML = '';
    this._editingId = null;
  },

  // --- Helpers ---

  _needsValue(operator) {
    return !['is_empty', 'is_not_empty'].includes(operator);
  },

  _operatorLabel(op) {
    const found = this.operators.find(o => o.value === op);
    return found ? found.label.toLowerCase() : op;
  },

  _fieldLabel(page, fieldValue) {
    const fields = this.fieldsByPage[page] || [];
    const found = fields.find(f => f.value === fieldValue);
    return found ? found.label : fieldValue;
  },

  _esc(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
  },

  _escAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
