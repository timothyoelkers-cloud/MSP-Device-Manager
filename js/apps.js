/* ============================================================
   Apps — Application management, deployment, and multi-tenant push
   ============================================================ */

const Apps = {
  searchTerm: '',
  typeFilter: 'all',
  stateFilter: 'all',
  viewMode: 'table',
  detailApp: null,
  detailTenantId: null,

  render() {
    const main = document.getElementById('mainContent');

    // Show skeleton if actively loading
    if (AppState.isLoading('apps') && AppState.getForContext('apps').length === 0) {
      main.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">Applications</h1>
            <p class="page-subtitle">Loading applications...</p>
          </div>
        </div>
        ${Skeleton.table(8, 6)}
      `;
      return;
    }

    const apps = AppState.getForContext('apps');
    const isAll = AppState.get('activeTenant') === 'all';
    const filtered = this.filterApps(apps);

    // Count by type
    const counts = { win32: 0, msi: 0, webApp: 0, ios: 0, android: 0, office: 0, lob: 0, other: 0 };
    apps.forEach(a => {
      const t = (a['@odata.type'] || '').toLowerCase();
      if (t.includes('win32')) counts.win32++;
      else if (t.includes('msi') || t.includes('windowsMobileMSI')) counts.msi++;
      else if (t.includes('webapp')) counts.webApp++;
      else if (t.includes('iosstore') || t.includes('iosvpp') || t.includes('ios')) counts.ios++;
      else if (t.includes('android')) counts.android++;
      else if (t.includes('officesuite') || t.includes('office')) counts.office++;
      else if (t.includes('lob') || t.includes('lineOfBusiness')) counts.lob++;
      else counts.other++;
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Applications</h1>
          <p class="page-subtitle">${apps.length} managed app${apps.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Apps.reloadData()" title="Reload app data from Graph API">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
          <button class="btn btn-secondary" onclick="Apps.showAddAppWizard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add App
          </button>
          <button class="btn btn-primary" onclick="Apps.showDeployModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Deploy App
          </button>
        </div>
      </div>

      <!-- Type Stats -->
      <div class="flex flex-wrap gap-2 mb-4">
        ${Object.entries(counts).filter(([,v]) => v > 0).map(([type, count]) => `
          <button class="chip ${this.typeFilter === type ? 'chip-active' : ''}" onclick="Apps.setTypeFilter('${type}')">
            <strong>${count}</strong> ${this._typeLabel(type)}
          </button>
        `).join('')}
        ${this.typeFilter !== 'all' ? '<button class="chip" onclick="Apps.setTypeFilter(\'all\')">Clear filter</button>' : ''}
      </div>

      <!-- Toolbar -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search applications..." value="${this.searchTerm}" oninput="Apps.search(this.value)">
            </div>
            <select class="form-select" style="width:auto;padding:6px 12px;font-size:13px;" onchange="Apps.setStateFilter(this.value)">
              <option value="all" ${this.stateFilter === 'all' ? 'selected' : ''}>All States</option>
              <option value="published" ${this.stateFilter === 'published' ? 'selected' : ''}>Published</option>
              <option value="notPublished" ${this.stateFilter === 'notPublished' ? 'selected' : ''}>Not Published</option>
            </select>
          </div>
          <div class="table-toolbar-right">
            <div class="flex gap-1">
              <button class="btn btn-sm ${this.viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}" onclick="Apps.setView('table')" data-tooltip="Table view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button class="btn btn-sm ${this.viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}" onclick="Apps.setView('grid')" data-tooltip="Grid view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
            </div>
          </div>
        </div>

        ${this.viewMode === 'table' ? this._renderTable(filtered, isAll) : this._renderGrid(filtered, isAll)}
      </div>

      <!-- App Detail Panel (reuses the detail-panel) -->
      <div class="detail-panel" id="appDetailPanel" style="z-index:301;">
        <div class="detail-panel-header">
          <h3 id="appDetailName">App Details</h3>
          <button class="modal-close" onclick="Apps.closeDetail()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="appDetailBody"></div>
      </div>

      <!-- Deploy Modal -->
      <div class="modal-backdrop hidden" id="deployAppModal">
        <div class="modal" style="max-width:600px;">
          <div class="modal-header">
            <h3 class="modal-title">Deploy Application</h3>
            <button class="modal-close" onclick="Apps.closeDeployModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="deployModalBody">
            ${this._renderDeployForm(apps)}
          </div>
        </div>
      </div>
    `;
  },

  // --- Filtering ---
  filterApps(apps) {
    return apps.filter(a => {
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        const match = (a.displayName || '').toLowerCase().includes(term) ||
                      (a.publisher || '').toLowerCase().includes(term) ||
                      (a.description || '').toLowerCase().includes(term);
        if (!match) return false;
      }
      if (this.typeFilter !== 'all') {
        const t = (a['@odata.type'] || '').toLowerCase();
        const typeMap = {
          win32: 'win32', msi: 'msi', webApp: 'webapp', ios: 'ios',
          android: 'android', office: 'office', lob: 'lob', other: ''
        };
        if (!t.includes(typeMap[this.typeFilter] || '___')) return false;
      }
      if (this.stateFilter !== 'all' && a.publishingState !== this.stateFilter) return false;
      return true;
    });
  },

  search(term) { this.searchTerm = term; this.render(); },
  setTypeFilter(type) { this.typeFilter = type === this.typeFilter ? 'all' : type; this.render(); },
  setStateFilter(state) { this.stateFilter = state; this.render(); },
  setView(mode) { this.viewMode = mode; this.render(); },

  // --- Table View ---
  _renderTable(apps, isAll) {
    return `
      <table class="table" id="appsTable">
        <thead>
          <tr>
            <th>Application</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>Type</th>
            <th>Publisher</th>
            <th>Version</th>
            <th>Status</th>
            <th style="width:50px;"></th>
          </tr>
        </thead>
        <tbody>
          ${apps.length === 0 ? `
            <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">
              ${AppState.get('tenants').length === 0
                ? 'Connect a tenant to view managed apps.'
                : (AppState.isLoading('apps')
                  ? 'Loading applications...'
                  : (this.searchTerm || this.typeFilter !== 'all' || this.stateFilter !== 'all'
                    ? 'No apps match your filters.'
                    : `<div class="retry-state">
                        <p>No application data loaded yet.</p>
                        <button class="btn btn-primary btn-sm" onclick="Apps.reloadData()">Reload App Data</button>
                        <p class="text-xs">If this persists, try clicking <strong>Reconnect</strong> in the banner above.</p>
                       </div>`))}
            </td></tr>
          ` : apps.map(a => `
            <tr style="cursor:pointer;" onclick="Apps.showDetail('${a._tenantId}','${a.id}')">
              <td>
                <div class="flex items-center gap-3">
                  <div class="table-device-icon" style="background:var(--primary-pale);flex-shrink:0;">
                    ${this._appIcon(a)}
                  </div>
                  <div style="min-width:0;">
                    <div class="fw-500 truncate">${a.displayName || 'Unnamed App'}</div>
                    <div class="text-xs text-muted truncate" style="max-width:250px;">${a.description || ''}</div>
                  </div>
                </div>
              </td>
              ${isAll ? `<td><span class="chip">${AppState.getTenantName(a._tenantId)}</span></td>` : ''}
              <td><span class="badge badge-default">${this.getAppType(a)}</span></td>
              <td class="text-sm">${a.publisher || '-'}</td>
              <td class="text-sm text-mono">${this._getVersion(a)}</td>
              <td>${a.publishingState === 'published'
                ? '<span class="badge badge-success">Published</span>'
                : '<span class="badge badge-warning">' + (a.publishingState || 'Draft') + '</span>'}</td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Apps.showDetail('${a._tenantId}','${a.id}')" data-tooltip="View details">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  // --- Grid View ---
  _renderGrid(apps, isAll) {
    if (apps.length === 0) {
      return `<div class="card"><div class="empty-state"><h3 class="empty-state-title">No applications found</h3><p class="empty-state-text">${AppState.get('tenants').length === 0 ? 'Connect a tenant to view apps.' : (this.searchTerm || this.typeFilter !== 'all' || this.stateFilter !== 'all' ? 'No apps match your filters.' : '<button class="btn btn-primary btn-sm" onclick="Apps.reloadData()" style="margin-top:8px;">Reload App Data</button>')}</p></div></div>`;
    }
    return `
      <div class="grid grid-auto gap-4 stagger" style="padding:var(--sp-4) 0;">
        ${apps.map((a, i) => `
          <div class="card animate-fade-up" style="cursor:pointer;animation-delay:${i * 40}ms;" onclick="Apps.showDetail('${a._tenantId}','${a.id}')">
            <div class="card-body-compact">
              <div class="flex items-center gap-3 mb-3">
                <div class="stat-card-icon blue" style="width:40px;height:40px;">
                  ${this._appIcon(a)}
                </div>
                <div style="flex:1;min-width:0;">
                  <div class="fw-600 truncate">${a.displayName || 'Unnamed App'}</div>
                  <div class="text-xs text-muted">${a.publisher || 'Unknown publisher'}</div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="badge badge-default">${this.getAppType(a)}</span>
                ${a.publishingState === 'published'
                  ? '<span class="badge badge-success">Published</span>'
                  : '<span class="badge badge-warning">' + (a.publishingState || 'Draft') + '</span>'}
              </div>
              ${isAll ? `<div class="chip mt-2" style="font-size:11px;">${AppState.getTenantName(a._tenantId)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --- App Detail ---
  async showDetail(tenantId, appId) {
    const apps = AppState.get('apps')[tenantId] || [];
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    this.detailApp = app;
    this.detailTenantId = tenantId;

    const panel = document.getElementById('appDetailPanel');
    const body = document.getElementById('appDetailBody');
    document.getElementById('appDetailName').textContent = app.displayName || 'App Details';

    body.innerHTML = `
      <div class="detail-section">
        <div class="flex items-center gap-3 mb-4">
          <div class="stat-card-icon blue" style="width:48px;height:48px;">
            ${this._appIcon(app)}
          </div>
          <div>
            <div class="fw-600" style="font-size:16px;">${app.displayName || 'Unnamed App'}</div>
            <div class="text-sm text-muted">${app.publisher || ''}</div>
          </div>
        </div>
        ${app.description ? `<p class="text-sm mb-4" style="color:var(--ink-secondary);">${app.description}</p>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">App Information</div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value"><span class="badge badge-default">${this.getAppType(app)}</span></span></div>
        <div class="detail-row"><span class="detail-label">Publisher</span><span class="detail-value">${app.publisher || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value text-mono">${this._getVersion(app)}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${app.publishingState === 'published' ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">' + (app.publishingState || 'Draft') + '</span>'}</span></div>
        <div class="detail-row"><span class="detail-label">Tenant</span><span class="detail-value"><span class="chip">${AppState.getTenantName(tenantId)}</span></span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${Devices.formatDate(app.createdDateTime)}</span></div>
        <div class="detail-row"><span class="detail-label">Last Modified</span><span class="detail-value">${Devices.formatDate(app.lastModifiedDateTime)}</span></div>
        ${app.fileName ? `<div class="detail-row"><span class="detail-label">File Name</span><span class="detail-value text-mono">${app.fileName}</span></div>` : ''}
        ${app.size ? `<div class="detail-row"><span class="detail-label">Size</span><span class="detail-value">${(app.size / 1048576).toFixed(1)} MB</span></div>` : ''}
        ${app.installCommandLine ? `<div class="detail-row"><span class="detail-label">Install Command</span><span class="detail-value text-mono text-xs" style="word-break:break-all;">${app.installCommandLine}</span></div>` : ''}
        ${app.uninstallCommandLine ? `<div class="detail-row"><span class="detail-label">Uninstall Command</span><span class="detail-value text-mono text-xs" style="word-break:break-all;">${app.uninstallCommandLine}</span></div>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Assignments</div>
        <div id="appAssignmentsContent">
          <div class="text-center text-muted" style="padding:1.5rem;">
            <div class="spinner" style="margin:0 auto 8px;"></div>
            Loading assignments...
          </div>
        </div>
      </div>

      <div style="padding-top:12px;border-top:1px solid var(--border-light);">
        <button class="btn btn-primary btn-sm" onclick="Apps.showAssignModal('${tenantId}','${appId}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Assignment
        </button>
      </div>
    `;

    panel.classList.add('open');

    // Load assignments
    this._loadAssignments(tenantId, appId);
  },

  async _loadAssignments(tenantId, appId) {
    const container = document.getElementById('appAssignmentsContent');
    if (!container) return;
    try {
      const result = await Graph.getAppAssignments(tenantId, appId);
      const assignments = result?.value || [];
      if (!assignments.length) {
        container.innerHTML = '<div class="text-muted" style="padding:0.5rem;">No assignments configured.</div>';
        return;
      }
      container.innerHTML = assignments.map(a => {
        const target = a.target || {};
        const intent = a.intent || 'unknown';
        const intentBadge = intent === 'required' ? 'badge-danger' : intent === 'available' ? 'badge-success' : intent === 'uninstall' ? 'badge-warning' : 'badge-default';
        const targetType = (target['@odata.type'] || '').includes('allLicensedUsers') ? 'All Users'
          : (target['@odata.type'] || '').includes('allDevices') ? 'All Devices'
          : (target['@odata.type'] || '').includes('group') ? (target.groupId || 'Group') : 'Target';
        return `
          <div class="detail-row">
            <span class="detail-label" style="flex:1;">
              <span class="chip">${targetType}</span>
            </span>
            <span class="detail-value flex items-center gap-2">
              <span class="badge ${intentBadge}">${intent}</span>
            </span>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div class="text-muted" style="color:var(--danger);">${err.message}</div>`;
    }
  },

  closeDetail() {
    document.getElementById('appDetailPanel')?.classList.remove('open');
  },

  // --- Deploy Modal ---
  // Reload app data for all connected tenants
  async reloadData() {
    const tenants = AppState.get('tenants');
    if (!tenants.length) {
      Toast.show('No tenants connected.', 'warning');
      return;
    }
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      const token = await Auth.getToken(t.id);
      if (token) {
        await Graph.loadApps(t.id).catch(err => console.warn('App reload failed:', err));
      }
    }
    Auth._isUserInitiated = false;
    this.render();
    const apps = AppState.getForContext('apps');
    if (apps.length > 0) {
      Toast.show(`${apps.length} app(s) loaded.`, 'success');
    } else {
      Toast.show('Still no app data. You may need to reconnect.', 'warning');
    }
  },

  showDeployModal() {
    const apps = AppState.getForContext('apps');
    if (!apps.length) {
      const tenants = AppState.get('tenants');
      if (tenants.length === 0) {
        Toast.show('No apps available. Connect a tenant first.', 'warning');
      } else if (AppState.isLoading('apps')) {
        Toast.show('App data is still loading. Please wait a moment and try again.', 'info');
      } else {
        Toast.show('No app data loaded. Try clicking "Reload App Data" on the Apps page, or reconnect.', 'warning');
      }
      return;
    }
    const modal = document.getElementById('deployAppModal');
    const body = document.getElementById('deployModalBody');
    body.innerHTML = this._renderDeployForm(apps);
    modal?.classList.remove('hidden');
  },

  closeDeployModal() {
    document.getElementById('deployAppModal')?.classList.add('hidden');
  },

  _renderDeployForm(apps) {
    const tenants = AppState.get('tenants');
    const groups = AppState.get('groups') || {};

    return `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- Step 1: Select App -->
        <div>
          <label class="form-label">Select Application</label>
          <select class="form-select" id="deployAppSelect" onchange="Apps._onDeployAppChange()">
            <option value="">-- Choose an app --</option>
            ${apps.map(a => `<option value="${a.id}" data-tenant="${a._tenantId}">${a.displayName} (${this.getAppType(a)}) — ${AppState.getTenantName(a._tenantId)}</option>`).join('')}
          </select>
        </div>

        <!-- Step 2: Target Tenants -->
        <div>
          <label class="form-label">Deploy to Tenants</label>
          <div style="max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">
            ${tenants.map(t => `
              <label class="flex items-center gap-2" style="padding:4px 0;font-size:13px;cursor:pointer;">
                <input type="checkbox" class="deploy-tenant-cb" value="${t.id}" checked>
                ${t.displayName || t.id}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Step 3: Assignment Target -->
        <div>
          <label class="form-label">Assign To</label>
          <select class="form-select" id="deployTargetType" onchange="Apps._onTargetTypeChange()">
            <option value="allDevices">All Devices</option>
            <option value="allUsers">All Users</option>
            <option value="group">Specific Group</option>
          </select>
          <div id="deployGroupSelect" class="hidden mt-2">
            <select class="form-select" id="deployGroupId">
              <option value="">-- Select group --</option>
            </select>
          </div>
        </div>

        <!-- Step 4: Intent -->
        <div>
          <label class="form-label">Install Intent</label>
          <select class="form-select" id="deployIntent">
            <option value="required">Required (auto-install)</option>
            <option value="available">Available (user choice)</option>
            <option value="uninstall">Uninstall</option>
          </select>
        </div>

        <!-- Deploy Button -->
        <button class="btn btn-primary w-full" onclick="Apps.executeDeploy()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Deploy to Selected Tenants
        </button>
      </div>
    `;
  },

  _onDeployAppChange() {
    // Could load groups for the selected app's tenant
    const select = document.getElementById('deployAppSelect');
    const opt = select?.selectedOptions[0];
    if (opt) {
      const tenantId = opt.dataset.tenant;
      this._populateGroups(tenantId);
    }
  },

  _onTargetTypeChange() {
    const type = document.getElementById('deployTargetType')?.value;
    const groupDiv = document.getElementById('deployGroupSelect');
    if (groupDiv) {
      groupDiv.classList.toggle('hidden', type !== 'group');
    }
  },

  _populateGroups(tenantId) {
    const groups = AppState.get('groups')[tenantId] || [];
    const select = document.getElementById('deployGroupId');
    if (select) {
      select.innerHTML = '<option value="">-- Select group --</option>' +
        groups.map(g => `<option value="${g.id}">${g.displayName}</option>`).join('');
    }
  },

  async executeDeploy() {
    const appSelect = document.getElementById('deployAppSelect');
    const appId = appSelect?.value;
    const sourceTenantId = appSelect?.selectedOptions[0]?.dataset?.tenant;
    if (!appId || !sourceTenantId) {
      Toast.show('Please select an application.', 'warning');
      return;
    }

    const targetType = document.getElementById('deployTargetType')?.value || 'allDevices';
    const intent = document.getElementById('deployIntent')?.value || 'required';
    const groupId = document.getElementById('deployGroupId')?.value;

    if (targetType === 'group' && !groupId) {
      Toast.show('Please select a target group.', 'warning');
      return;
    }

    // Build assignment target
    let target;
    if (targetType === 'allDevices') {
      target = { '@odata.type': '#microsoft.graph.allDevicesAssignmentTarget' };
    } else if (targetType === 'allUsers') {
      target = { '@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget' };
    } else {
      target = { '@odata.type': '#microsoft.graph.groupAssignmentTarget', groupId };
    }

    const assignments = [{ '@odata.type': '#microsoft.graph.mobileAppAssignment', intent, target }];

    // Get selected tenants
    const tenantCbs = document.querySelectorAll('.deploy-tenant-cb:checked');
    const tenantIds = Array.from(tenantCbs).map(cb => cb.value);

    if (!tenantIds.length) {
      Toast.show('Select at least one tenant.', 'warning');
      return;
    }

    Toast.show(`Deploying to ${tenantIds.length} tenant(s)...`, 'info');

    let success = 0;
    let failed = 0;
    for (const tid of tenantIds) {
      try {
        await Graph.assignApp(tid, appId, assignments);
        success++;
      } catch (err) {
        console.error(`Deploy failed for tenant ${tid}:`, err);
        failed++;
      }
    }

    if (failed === 0) {
      Toast.show(`App deployed successfully to ${success} tenant(s)`, 'success');
    } else {
      Toast.show(`Deployed to ${success}, failed for ${failed} tenant(s)`, 'warning');
    }

    this.closeDeployModal();
  },

  // --- Assign Modal (from detail view) ---
  showAssignModal(tenantId, appId) {
    const groups = AppState.get('groups')[tenantId] || [];
    const html = `
      <div class="modal-backdrop" id="assignAppModal" style="z-index:500;">
        <div class="modal" style="max-width:420px;">
          <div class="modal-header">
            <h3 class="modal-title">Add Assignment</h3>
            <button class="modal-close" onclick="document.getElementById('assignAppModal')?.remove()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="form-label">Target</label>
              <select class="form-select" id="assignTargetType" onchange="document.getElementById('assignGroupRow').classList.toggle('hidden', this.value !== 'group')">
                <option value="allDevices">All Devices</option>
                <option value="allUsers">All Users</option>
                <option value="group">Specific Group</option>
              </select>
            </div>
            <div id="assignGroupRow" class="hidden">
              <label class="form-label">Group</label>
              <select class="form-select" id="assignGroupId">
                ${groups.map(g => `<option value="${g.id}">${g.displayName}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Intent</label>
              <select class="form-select" id="assignIntent">
                <option value="required">Required</option>
                <option value="available">Available</option>
                <option value="uninstall">Uninstall</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('assignAppModal')?.remove()">Cancel</button>
            <button class="btn btn-primary" onclick="Apps._executeAssign('${tenantId}','${appId}')">Assign</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  async _executeAssign(tenantId, appId) {
    const targetType = document.getElementById('assignTargetType')?.value;
    const intent = document.getElementById('assignIntent')?.value || 'required';
    const groupId = document.getElementById('assignGroupId')?.value;

    let target;
    if (targetType === 'allDevices') {
      target = { '@odata.type': '#microsoft.graph.allDevicesAssignmentTarget' };
    } else if (targetType === 'allUsers') {
      target = { '@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget' };
    } else {
      if (!groupId) { Toast.show('Select a group', 'warning'); return; }
      target = { '@odata.type': '#microsoft.graph.groupAssignmentTarget', groupId };
    }

    try {
      await Graph.assignApp(tenantId, appId, [{ '@odata.type': '#microsoft.graph.mobileAppAssignment', intent, target }]);
      Toast.show('Assignment added', 'success');
      document.getElementById('assignAppModal')?.remove();
      // Refresh assignments
      this._loadAssignments(tenantId, appId);
    } catch (err) {
      Toast.show('Failed: ' + err.message, 'error');
    }
  },

  // --- Add App Wizard ---
  _addAppState: { step: 1, appType: '', name: '', description: '', publisher: '', settings: {} },

  showAddAppWizard() {
    const tenantId = AppState.get('activeTenant');
    if (!tenantId || tenantId === 'all') return Toast.show('Select a single tenant before adding an app', 'warning');
    this._addAppState = { step: 1, appType: '', name: '', description: '', publisher: '', settings: {} };
    this._renderAddAppWizard();
  },

  _renderAddAppWizard() {
    document.getElementById('addAppWizard')?.remove();
    const s = this._addAppState;
    const steps = ['App Type', 'Details', 'Configuration', 'Review'];
    const modal = document.createElement('div');
    modal.id = 'addAppWizard';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:640px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Add Application</h3>
          <button class="modal-close" onclick="document.getElementById('addAppWizard').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border);">
          ${steps.map((t, i) => `
            <div style="flex:1;text-align:center;padding:10px;font-size:12px;font-weight:500;
              ${i + 1 === s.step ? 'color:var(--primary);border-bottom:2px solid var(--primary);' : 'color:var(--ink-muted);'}
              ${i + 1 < s.step ? 'color:var(--success);' : ''}">
              ${i + 1}. ${t}
            </div>`).join('')}
        </div>
        <div class="modal-body" style="min-height:300px;max-height:60vh;overflow-y:auto;" id="addAppWizardBody">
          ${this._addAppStep()}
        </div>
        <div class="modal-footer">
          ${s.step > 1 ? '<button class="btn btn-ghost" onclick="Apps._addAppBack()">Back</button>' : '<span></span>'}
          ${s.step < 4
            ? '<button class="btn btn-primary" onclick="Apps._addAppNext()">Next</button>'
            : '<button class="btn btn-primary" id="addAppCreateBtn" onclick="Apps._addAppCreate()">Create App</button>'}
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _addAppStep() {
    switch (this._addAppState.step) {
      case 1: return this._addAppStep1();
      case 2: return this._addAppStep2();
      case 3: return this._addAppStep3();
      case 4: return this._addAppStep4();
    }
  },

  _addAppStep1() {
    const s = this._addAppState;
    const types = [
      { id: 'webApp', label: 'Web Link / Web App', desc: 'Link to a web application', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>' },
      { id: 'win32', label: 'Windows App (Win32)', desc: 'Win32 / .intunewin app', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
      { id: 'officeSuite', label: 'Microsoft 365 Apps', desc: 'Deploy M365 Apps for Enterprise', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/></svg>' },
      { id: 'iosStore', label: 'iOS Store App', desc: 'App from Apple App Store', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' },
      { id: 'androidStore', label: 'Android Store App', desc: 'App from Google Play', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' },
    ];
    return `
      <p class="text-sm text-muted mb-3">Select the type of application to add.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${types.map(t => `
          <div class="card" style="cursor:pointer;padding:12px 16px;border:2px solid ${s.appType === t.id ? 'var(--primary)' : 'var(--border)'};transition:border-color .15s;"
            onclick="Apps._addAppState.appType='${t.id}'; document.getElementById('addAppWizardBody').innerHTML=Apps._addAppStep1();">
            <div class="flex items-center gap-3">
              ${t.icon}
              <div><div class="fw-500 text-sm">${t.label}</div><div class="text-xs text-muted">${t.desc}</div></div>
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  _addAppStep2() {
    const s = this._addAppState;
    return `
      <p class="text-sm text-muted mb-3">Enter the application details.</p>
      <div class="mb-3"><label class="form-label">App Name *</label><input class="form-input" id="addAppName" type="text" value="${s.name}" placeholder="e.g. Microsoft Teams"></div>
      <div class="mb-3"><label class="form-label">Description</label><textarea class="form-input" id="addAppDesc" rows="2" placeholder="Brief description...">${s.description}</textarea></div>
      <div class="mb-3"><label class="form-label">Publisher</label><input class="form-input" id="addAppPublisher" type="text" value="${s.publisher}" placeholder="e.g. Microsoft"></div>
      ${s.appType === 'webApp' ? '<div class="mb-3"><label class="form-label">App URL *</label><input class="form-input" id="addAppUrl" type="url" value="' + (s.settings.appUrl || '') + '" placeholder="https://..."></div>' : ''}
      ${s.appType === 'iosStore' ? '<div class="mb-3"><label class="form-label">App Store URL *</label><input class="form-input" id="addAppStoreUrl" type="url" value="' + (s.settings.appStoreUrl || '') + '" placeholder="https://apps.apple.com/..."></div><div class="mb-3"><label class="form-label">Bundle ID</label><input class="form-input" id="addAppBundleId" type="text" value="' + (s.settings.bundleId || '') + '" placeholder="com.example.app"></div>' : ''}
      ${s.appType === 'androidStore' ? '<div class="mb-3"><label class="form-label">Play Store URL *</label><input class="form-input" id="addAppPlayUrl" type="url" value="' + (s.settings.playStoreUrl || '') + '" placeholder="https://play.google.com/..."></div><div class="mb-3"><label class="form-label">Package ID</label><input class="form-input" id="addAppPkgId" type="text" value="' + (s.settings.packageId || '') + '" placeholder="com.example.app"></div>' : ''}`;
  },

  _addAppStep3() {
    const s = this._addAppState;
    const cfg = s.settings;
    if (s.appType === 'webApp') {
      return `<p class="text-sm fw-500 mb-3">Web App Settings</p>
        <label class="flex items-center gap-2"><input type="checkbox" id="addAppManagedBrowser" ${cfg.useManagedBrowser ? 'checked' : ''}><span class="text-sm">Open in Managed Browser (Edge)</span></label>`;
    }
    if (s.appType === 'win32') {
      return `<p class="text-sm fw-500 mb-3">Win32 App Configuration</p>
        <p class="text-xs text-muted mb-3">Note: Upload the .intunewin package via the Intune portal after creating the app entry.</p>
        <div class="mb-3"><label class="form-label">Install Command</label><input class="form-input" id="addAppInstallCmd" type="text" value="${cfg.installCommandLine || ''}" placeholder="msiexec /i app.msi /qn"></div>
        <div class="mb-3"><label class="form-label">Uninstall Command</label><input class="form-input" id="addAppUninstallCmd" type="text" value="${cfg.uninstallCommandLine || ''}" placeholder="msiexec /x {Code} /qn"></div>
        <div class="mb-3"><label class="form-label">Install Behavior</label><select class="form-input" id="addAppInstallBehavior"><option value="system" ${(cfg.installExperience || 'system') === 'system' ? 'selected' : ''}>System</option><option value="user" ${cfg.installExperience === 'user' ? 'selected' : ''}>User</option></select></div>`;
    }
    if (s.appType === 'officeSuite') {
      return `<p class="text-sm fw-500 mb-3">Microsoft 365 Apps</p>
        <div class="mb-3"><label class="form-label">Update Channel</label><select class="form-input" id="addAppChannel"><option value="current" ${(cfg.updateChannel || 'current') === 'current' ? 'selected' : ''}>Current</option><option value="monthlyEnterprise" ${cfg.updateChannel === 'monthlyEnterprise' ? 'selected' : ''}>Monthly Enterprise</option><option value="semiAnnual" ${cfg.updateChannel === 'semiAnnual' ? 'selected' : ''}>Semi-Annual</option></select></div>
        <p class="text-sm fw-500 mb-2">Apps to Include</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">${['Word','Excel','PowerPoint','Outlook','Teams','OneNote','Access','Publisher'].map(a => `<label class="flex items-center gap-2" style="padding:4px 0;"><input type="checkbox" class="addAppOfficeApp" value="${a}" ${!cfg['exclude' + a] ? 'checked' : ''}><span class="text-sm">${a}</span></label>`).join('')}</div>`;
    }
    if (s.appType === 'iosStore' || s.appType === 'androidStore') {
      return `<p class="text-sm fw-500 mb-3">Store App Settings</p>
        <div class="mb-3"><label class="form-label">Minimum OS Version</label><input class="form-input" id="addAppMinOs" type="text" value="${cfg.minOsVersion || ''}" placeholder="${s.appType === 'iosStore' ? '15.0' : '10.0'}"></div>
        <label class="flex items-center gap-2"><input type="checkbox" id="addAppFeatured" ${cfg.isFeatured ? 'checked' : ''}><span class="text-sm">Show as featured in Company Portal</span></label>`;
    }
    return '<p class="text-muted">No additional configuration needed.</p>';
  },

  _addAppStep4() {
    const s = this._addAppState;
    const labels = { webApp: 'Web App', win32: 'Win32', officeSuite: 'M365 Apps', iosStore: 'iOS Store', androidStore: 'Android Store' };
    return `
      <h3 class="text-sm fw-500 mb-3">Review Application</h3>
      <div class="card" style="padding:16px;border:1px solid var(--border);">
        <div class="mb-3"><div class="text-xs text-muted">Name</div><div class="fw-500">${s.name || '<span class="text-danger">Not set</span>'}</div></div>
        <div class="mb-3"><div class="text-xs text-muted">Type</div><span class="badge badge-default">${labels[s.appType] || s.appType}</span></div>
        ${s.publisher ? `<div class="mb-3"><div class="text-xs text-muted">Publisher</div><div class="text-sm">${s.publisher}</div></div>` : ''}
        ${s.settings.appUrl ? `<div class="mb-3"><div class="text-xs text-muted">URL</div><div class="text-sm text-mono">${s.settings.appUrl}</div></div>` : ''}
        ${s.settings.installCommandLine ? `<div class="mb-3"><div class="text-xs text-muted">Install</div><div class="text-sm text-mono">${s.settings.installCommandLine}</div></div>` : ''}
      </div>
      <p class="text-xs text-muted mt-3">The app entry will be created in Intune for the selected tenant.</p>`;
  },

  _captureAddAppStep(step) {
    const s = this._addAppState;
    if (step === 2) {
      s.name = document.getElementById('addAppName')?.value || '';
      s.description = document.getElementById('addAppDesc')?.value || '';
      s.publisher = document.getElementById('addAppPublisher')?.value || '';
      if (s.appType === 'webApp') s.settings.appUrl = document.getElementById('addAppUrl')?.value || '';
      if (s.appType === 'iosStore') { s.settings.appStoreUrl = document.getElementById('addAppStoreUrl')?.value || ''; s.settings.bundleId = document.getElementById('addAppBundleId')?.value || ''; }
      if (s.appType === 'androidStore') { s.settings.playStoreUrl = document.getElementById('addAppPlayUrl')?.value || ''; s.settings.packageId = document.getElementById('addAppPkgId')?.value || ''; }
    }
    if (step === 3) {
      if (s.appType === 'webApp') s.settings.useManagedBrowser = document.getElementById('addAppManagedBrowser')?.checked || false;
      if (s.appType === 'win32') { s.settings.installCommandLine = document.getElementById('addAppInstallCmd')?.value || ''; s.settings.uninstallCommandLine = document.getElementById('addAppUninstallCmd')?.value || ''; s.settings.installExperience = document.getElementById('addAppInstallBehavior')?.value || 'system'; }
      if (s.appType === 'officeSuite') { s.settings.updateChannel = document.getElementById('addAppChannel')?.value || 'current'; document.querySelectorAll('.addAppOfficeApp').forEach(cb => { s.settings['exclude' + cb.value] = !cb.checked; }); }
      if (s.appType === 'iosStore' || s.appType === 'androidStore') { s.settings.minOsVersion = document.getElementById('addAppMinOs')?.value || ''; s.settings.isFeatured = document.getElementById('addAppFeatured')?.checked || false; }
    }
  },

  _addAppBack() {
    this._captureAddAppStep(this._addAppState.step);
    this._addAppState.step--;
    this._renderAddAppWizard();
  },

  _addAppNext() {
    const s = this._addAppState;
    this._captureAddAppStep(s.step);
    if (s.step === 1 && !s.appType) return Toast.show('Select an app type', 'warning');
    if (s.step === 2) {
      if (!s.name.trim()) return Toast.show('App name is required', 'warning');
      if (s.appType === 'webApp' && !s.settings.appUrl) return Toast.show('App URL is required', 'warning');
      if (s.appType === 'iosStore' && !s.settings.appStoreUrl) return Toast.show('App Store URL is required', 'warning');
      if (s.appType === 'androidStore' && !s.settings.playStoreUrl) return Toast.show('Play Store URL is required', 'warning');
    }
    s.step++;
    this._renderAddAppWizard();
  },

  _buildAppPayload() {
    const s = this._addAppState;
    const base = { displayName: s.name.trim(), description: s.description.trim() || null, publisher: s.publisher.trim() || null, isFeatured: s.settings.isFeatured || false };
    switch (s.appType) {
      case 'webApp': return { ...base, '@odata.type': '#microsoft.graph.webApp', appUrl: s.settings.appUrl, useManagedBrowser: s.settings.useManagedBrowser || false };
      case 'officeSuite': return { ...base, '@odata.type': '#microsoft.graph.officeSuiteApp', officePlatformArchitecture: 'x64', updateChannel: s.settings.updateChannel || 'current', useSharedComputerActivation: false, excludedApps: { access: s.settings.excludeAccess || false, excel: s.settings.excludeExcel || false, oneNote: s.settings.excludeOneNote || false, outlook: s.settings.excludeOutlook || false, powerPoint: s.settings.excludePowerPoint || false, publisher: s.settings.excludePublisher || false, teams: s.settings.excludeTeams || false, word: s.settings.excludeWord || false } };
      case 'iosStore': return { ...base, '@odata.type': '#microsoft.graph.iosStoreApp', appStoreUrl: s.settings.appStoreUrl, bundleId: s.settings.bundleId || '', applicableDeviceType: { iPad: true, iPhoneAndIPod: true }, minimumSupportedOperatingSystem: { v15_0: true } };
      case 'androidStore': return { ...base, '@odata.type': '#microsoft.graph.androidStoreApp', appStoreUrl: s.settings.playStoreUrl, packageId: s.settings.packageId || '', minimumSupportedOperatingSystem: { v10_0: true } };
      case 'win32': return { ...base, '@odata.type': '#microsoft.graph.win32LobApp', installCommandLine: s.settings.installCommandLine || '', uninstallCommandLine: s.settings.uninstallCommandLine || '', installExperience: { runAsAccount: s.settings.installExperience || 'system', deviceRestartBehavior: 'basedOnReturnCode' }, setupFilePath: 'setup.exe' };
      default: return base;
    }
  },

  async _addAppCreate() {
    const btn = document.getElementById('addAppCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
    const tenantId = AppState.get('activeTenant');
    try {
      await Graph.call(tenantId, '/deviceAppManagement/mobileApps', { method: 'POST', body: this._buildAppPayload() });
      Toast.show('Application created successfully', 'success');
      document.getElementById('addAppWizard')?.remove();
      await Graph.loadApps(tenantId).catch(() => {});
      this.render();
    } catch (err) {
      Toast.show('Failed to create app: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create App'; }
    }
  },

  // --- Helpers ---
  getAppType(app) {
    const t = (app['@odata.type'] || '').toLowerCase();
    if (t.includes('win32')) return 'Win32';
    if (t.includes('msi')) return 'MSI';
    if (t.includes('webapp')) return 'Web App';
    if (t.includes('iosstore')) return 'iOS Store';
    if (t.includes('iosvpp')) return 'iOS VPP';
    if (t.includes('ios')) return 'iOS';
    if (t.includes('android')) return 'Android';
    if (t.includes('officesuite') || t.includes('office')) return 'Office Suite';
    if (t.includes('lob') || t.includes('lineofbusiness')) return 'LOB';
    return 'App';
  },

  _typeLabel(type) {
    const map = { win32: 'Win32', msi: 'MSI', webApp: 'Web', ios: 'iOS', android: 'Android', office: 'Office', lob: 'LOB', other: 'Other' };
    return map[type] || type;
  },

  _getVersion(app) {
    return app.displayVersion || app.version || app.productVersion || '-';
  },

  _appIcon(app) {
    const t = (app['@odata.type'] || '').toLowerCase();
    if (t.includes('win32') || t.includes('msi')) {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
    }
    if (t.includes('ios') || t.includes('mac')) {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
    }
    if (t.includes('android')) {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
    }
    if (t.includes('webapp')) {
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
    }
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/></svg>';
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#appsTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  }
};
