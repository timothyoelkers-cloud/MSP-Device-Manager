/* ============================================================
   Updates — Windows Update management, rings, and version checker
   ============================================================ */

const Updates = {
  viewTab: 'overview',
  searchTerm: '',

  // Known latest Windows versions for comparison
  latestVersions: {
    '10.0.26100': { name: 'Windows 11 24H2', current: true },
    '10.0.22631': { name: 'Windows 11 23H2', current: true },
    '10.0.22621': { name: 'Windows 11 22H2', current: false },
    '10.0.19045': { name: 'Windows 10 22H2', current: true },
    '10.0.19044': { name: 'Windows 10 21H2', current: false },
    '10.0.19043': { name: 'Windows 10 21H1', current: false },
    '10.0.19042': { name: 'Windows 10 20H2', current: false },
  },

  render() {
    const main = document.getElementById('mainContent');
    const isAll = AppState.get('activeTenant') === 'all';
    const allDevices = AppState.getDevicesForContext();
    const windowsDevices = allDevices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows'));
    const rings = AppState.getForContext('updateRings');

    // Version analysis
    const versionMap = {};
    let upToDate = 0, behind = 0, critical = 0, unknown = 0;
    windowsDevices.forEach(d => {
      const ver = d.osVersion || 'Unknown';
      if (!versionMap[ver]) versionMap[ver] = { count: 0, devices: [] };
      versionMap[ver].count++;
      versionMap[ver].devices.push(d);

      const status = this._getVersionStatus(ver);
      if (status === 'current') upToDate++;
      else if (status === 'behind') behind++;
      else if (status === 'critical') critical++;
      else unknown++;
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Windows Updates</h1>
          <p class="page-subtitle">${windowsDevices.length} Windows device${windowsDevices.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Updates.refreshAll()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Refresh
          </button>
          <button class="btn btn-primary" onclick="Updates.showCreateRing()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Update Ring
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="flex items-center justify-between mb-2">
            <div class="stat-card-icon blue" style="width:36px;height:36px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${windowsDevices.length}</div>
          <div class="stat-card-label">Windows Devices</div>
        </div>

        <div class="stat-card animate-fade-up" style="animation-delay:60ms;">
          <div class="flex items-center justify-between mb-2">
            <div class="stat-card-icon green" style="width:36px;height:36px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${upToDate}</div>
          <div class="stat-card-label">Up to Date</div>
        </div>

        <div class="stat-card animate-fade-up" style="animation-delay:120ms;">
          <div class="flex items-center justify-between mb-2">
            <div class="stat-card-icon orange" style="width:36px;height:36px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${behind}</div>
          <div class="stat-card-label">Behind</div>
        </div>

        <div class="stat-card animate-fade-up" style="animation-delay:180ms;">
          <div class="flex items-center justify-between mb-2">
            <div class="stat-card-icon red" style="width:36px;height:36px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${critical}</div>
          <div class="stat-card-label">Critical / EOL</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs mb-4">
        <button class="tab ${this.viewTab === 'overview' ? 'active' : ''}" onclick="Updates.switchTab('overview')">OS Versions</button>
        <button class="tab ${this.viewTab === 'devices' ? 'active' : ''}" onclick="Updates.switchTab('devices')">Per-Device Status</button>
        <button class="tab ${this.viewTab === 'rings' ? 'active' : ''}" onclick="Updates.switchTab('rings')">Update Rings (${rings.length})</button>
      </div>

      <!-- Tab Content -->
      <div id="updatesTabContent">
        ${this.viewTab === 'overview' ? this._renderOverview(versionMap, windowsDevices.length) :
          this.viewTab === 'devices' ? this._renderDevices(windowsDevices, isAll) :
          this._renderRings(rings, isAll)}
      </div>

      <!-- Create Ring Modal -->
      <div class="modal-backdrop hidden" id="createRingModal">
        <div class="modal" style="max-width:560px;">
          <div class="modal-header">
            <h3 class="modal-title">Create Update Ring</h3>
            <button class="modal-close" onclick="Updates.closeCreateRing()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="createRingBody"></div>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.viewTab = tab;
    this.render();
  },

  // --- OS Versions Overview ---
  _renderOverview(versionMap, total) {
    const versions = Object.entries(versionMap).sort((a, b) => b[1].count - a[1].count);
    if (!versions.length) {
      return '<div class="card"><div class="empty-state"><h3 class="empty-state-title">No Windows Devices</h3><p class="empty-state-text">Connect a tenant to view Windows Update status.</p></div></div>';
    }

    return `
      <div class="card animate-fade">
        <div class="card-body-compact">
          <h3 class="fw-600 mb-4">OS Version Distribution</h3>
          <table class="table">
            <thead>
              <tr>
                <th>OS Version</th>
                <th>Build</th>
                <th>Devices</th>
                <th style="width:200px;">Distribution</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${versions.map(([ver, data]) => {
                const pct = total > 0 ? Math.round((data.count / total) * 100) : 0;
                const status = this._getVersionStatus(ver);
                const friendly = this._getFriendlyName(ver);
                const statusBadge = status === 'current' ? '<span class="badge badge-success">Current</span>'
                  : status === 'behind' ? '<span class="badge badge-warning">Behind</span>'
                  : status === 'critical' ? '<span class="badge badge-danger">EOL / Critical</span>'
                  : '<span class="badge badge-default">Unknown</span>';
                const barColor = status === 'current' ? 'var(--success)' : status === 'behind' ? 'var(--warning)' : status === 'critical' ? 'var(--danger)' : 'var(--gray-300)';

                return `
                  <tr>
                    <td class="fw-500">${friendly}</td>
                    <td class="text-mono text-sm">${ver}</td>
                    <td><strong>${data.count}</strong></td>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="progress-bar" style="flex:1;height:8px;">
                          <div class="progress-bar-fill" style="width:${pct}%;background:${barColor};"></div>
                        </div>
                        <span class="text-xs text-muted" style="width:35px;">${pct}%</span>
                      </div>
                    </td>
                    <td>${statusBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Version Legend -->
      <div class="card mt-4 animate-fade" style="animation-delay:100ms;">
        <div class="card-body-compact">
          <h3 class="fw-600 mb-3">Reference: Current Windows Versions</h3>
          <div class="grid grid-3 gap-3">
            <div style="padding:12px;border:1px solid var(--border-light);border-radius:8px;">
              <div class="fw-600 text-sm">Windows 11 24H2</div>
              <div class="text-xs text-muted text-mono">10.0.26100</div>
              <span class="badge badge-success mt-1">Current</span>
            </div>
            <div style="padding:12px;border:1px solid var(--border-light);border-radius:8px;">
              <div class="fw-600 text-sm">Windows 11 23H2</div>
              <div class="text-xs text-muted text-mono">10.0.22631</div>
              <span class="badge badge-success mt-1">Current</span>
            </div>
            <div style="padding:12px;border:1px solid var(--border-light);border-radius:8px;">
              <div class="fw-600 text-sm">Windows 10 22H2</div>
              <div class="text-xs text-muted text-mono">10.0.19045</div>
              <span class="badge badge-success mt-1">Current</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // --- Per-Device Status ---
  _renderDevices(devices, isAll) {
    const filtered = this.searchTerm
      ? devices.filter(d => (d.deviceName || '').toLowerCase().includes(this.searchTerm.toLowerCase()) || (d.osVersion || '').includes(this.searchTerm))
      : devices;

    return `
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search devices..." value="${this.searchTerm}" oninput="Updates.searchDevices(this.value)">
            </div>
          </div>
          <div class="table-toolbar-right">
            <span class="text-sm text-muted">${filtered.length} device${filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Device Name</th>
              ${isAll ? '<th>Tenant</th>' : ''}
              <th>OS Version</th>
              <th>Build</th>
              <th>Status</th>
              <th>Last Sync</th>
              <th>Compliance</th>
              <th style="width:50px;"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="${isAll ? 8 : 7}" class="text-center text-muted" style="padding:3rem;">No Windows devices found.</td></tr>
            ` : filtered.map(d => {
              const ver = d.osVersion || 'Unknown';
              const status = this._getVersionStatus(ver);
              const friendly = this._getFriendlyName(ver);
              const statusBadge = status === 'current' ? '<span class="badge badge-success">Current</span>'
                : status === 'behind' ? '<span class="badge badge-warning">Behind</span>'
                : status === 'critical' ? '<span class="badge badge-danger">EOL</span>'
                : '<span class="badge badge-default">Unknown</span>';

              return `
                <tr>
                  <td>
                    <div class="fw-500">${d.deviceName || 'Unknown'}</div>
                    <div class="text-xs text-muted">${d.userPrincipalName || ''}</div>
                  </td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>` : ''}
                  <td class="text-sm">${friendly}</td>
                  <td class="text-mono text-sm">${ver}</td>
                  <td>${statusBadge}</td>
                  <td class="text-sm">${Devices.relativeTime(d.lastSyncDateTime)}</td>
                  <td>${Devices.getComplianceBadge(d.complianceState)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="Devices.action('sync','${d._tenantId}','${d.id}')" data-tooltip="Trigger sync">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  searchDevices(term) {
    this.searchTerm = term;
    // Re-render just the tab content
    const allDevices = AppState.getDevicesForContext();
    const windowsDevices = allDevices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows'));
    const isAll = AppState.get('activeTenant') === 'all';
    const container = document.getElementById('updatesTabContent');
    if (container) container.innerHTML = this._renderDevices(windowsDevices, isAll);
  },

  // --- Update Rings ---
  _renderRings(rings, isAll) {
    if (!rings.length) {
      return `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            </div>
            <h3 class="empty-state-title">No Update Rings</h3>
            <p class="empty-state-text">Create an update ring to control Windows Update deferral and behavior settings.</p>
            <button class="btn btn-primary mt-3" onclick="Updates.showCreateRing()">Create Update Ring</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="grid grid-auto gap-4 stagger">
        ${rings.map((r, i) => `
          <div class="card animate-fade-up" style="animation-delay:${i * 60}ms;">
            <div class="card-body-compact">
              <div class="flex items-center gap-3 mb-3">
                <div class="stat-card-icon blue" style="width:36px;height:36px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                </div>
                <div style="flex:1;min-width:0;">
                  <div class="fw-600 truncate">${r.displayName || 'Update Ring'}</div>
                  <div class="text-xs text-muted">${r.description || 'Windows Update for Business'}</div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Updates.deleteRing('${r._tenantId || AppState.get('activeTenant')}','${r.id}','${(r.displayName || '').replace(/'/g, "\\'")}')" data-tooltip="Delete ring" style="color:var(--danger);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
              ${isAll ? `<div class="chip mb-2">${AppState.getTenantName(r._tenantId)}</div>` : ''}
              <div class="grid grid-2 gap-2 mt-3">
                <div style="padding:8px;background:var(--bg-surface);border-radius:6px;">
                  <div class="text-xs text-muted">Feature Deferral</div>
                  <div class="fw-600">${r.featureUpdatesDeferralPeriodInDays || 0} days</div>
                </div>
                <div style="padding:8px;background:var(--bg-surface);border-radius:6px;">
                  <div class="text-xs text-muted">Quality Deferral</div>
                  <div class="fw-600">${r.qualityUpdatesDeferralPeriodInDays || 0} days</div>
                </div>
                <div style="padding:8px;background:var(--bg-surface);border-radius:6px;">
                  <div class="text-xs text-muted">Auto Update Mode</div>
                  <div class="fw-500 text-sm">${this._formatUpdateMode(r.automaticUpdateMode)}</div>
                </div>
                <div style="padding:8px;background:var(--bg-surface);border-radius:6px;">
                  <div class="text-xs text-muted">Last Modified</div>
                  <div class="fw-500 text-sm">${Devices.formatDate(r.lastModifiedDateTime)}</div>
                </div>
              </div>
              ${r.featureUpdatesPaused ? '<div class="badge badge-warning mt-2">Feature updates paused</div>' : ''}
              ${r.qualityUpdatesPaused ? '<div class="badge badge-warning mt-2">Quality updates paused</div>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  _formatUpdateMode(mode) {
    const map = {
      'autoInstallAtMaintenanceTime': 'Install at maintenance',
      'autoInstallAndRebootAtMaintenanceTime': 'Install & reboot at maintenance',
      'autoInstallAndRebootAtScheduledTime': 'Install & reboot at scheduled time',
      'autoInstallAndRebootWithoutEndUserControl': 'Force install & reboot',
      'windowed': 'Windowed install'
    };
    return map[mode] || mode || 'Not configured';
  },

  // --- Create Ring ---
  showCreateRing() {
    const tenants = AppState.get('tenants');
    const activeTenant = AppState.get('activeTenant');
    if (activeTenant === 'all' && tenants.length === 0) {
      Toast.show('Connect a tenant first.', 'warning');
      return;
    }

    const modal = document.getElementById('createRingModal');
    const body = document.getElementById('createRingBody');
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${activeTenant === 'all' ? `
          <div>
            <label class="form-label">Target Tenant</label>
            <select class="form-select" id="ringTenantId">
              ${tenants.map(t => `<option value="${t.id}">${t.displayName}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <div>
          <label class="form-label">Ring Name</label>
          <input type="text" class="form-input" id="ringName" placeholder="e.g., Production - Standard">
        </div>

        <div>
          <label class="form-label">Description</label>
          <input type="text" class="form-input" id="ringDescription" placeholder="Description of this update ring">
        </div>

        <div>
          <label class="form-label">Feature Update Deferral: <strong id="featureDeferralValue">0</strong> days</label>
          <input type="range" min="0" max="365" value="0" style="width:100%;" id="featureDeferral"
                 oninput="document.getElementById('featureDeferralValue').textContent=this.value">
          <div class="flex justify-between text-xs text-muted"><span>0</span><span>365 days</span></div>
        </div>

        <div>
          <label class="form-label">Quality Update Deferral: <strong id="qualityDeferralValue">0</strong> days</label>
          <input type="range" min="0" max="30" value="0" style="width:100%;" id="qualityDeferral"
                 oninput="document.getElementById('qualityDeferralValue').textContent=this.value">
          <div class="flex justify-between text-xs text-muted"><span>0</span><span>30 days</span></div>
        </div>

        <div>
          <label class="form-label">Automatic Update Mode</label>
          <select class="form-select" id="ringUpdateMode">
            <option value="autoInstallAtMaintenanceTime">Install at maintenance time</option>
            <option value="autoInstallAndRebootAtMaintenanceTime">Install & reboot at maintenance time</option>
            <option value="autoInstallAndRebootAtScheduledTime">Install & reboot at scheduled time</option>
            <option value="autoInstallAndRebootWithoutEndUserControl">Force install & reboot</option>
            <option value="windowed">Windowed install</option>
          </select>
        </div>

        <div class="grid grid-2 gap-3">
          <div>
            <label class="form-label">Active Hours Start</label>
            <select class="form-select" id="ringActiveStart">
              ${Array.from({length:24}, (_, i) => `<option value="${i}" ${i === 8 ? 'selected' : ''}>${i.toString().padStart(2,'0')}:00</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Active Hours End</label>
            <select class="form-select" id="ringActiveEnd">
              ${Array.from({length:24}, (_, i) => `<option value="${i}" ${i === 17 ? 'selected' : ''}>${i.toString().padStart(2,'0')}:00</option>`).join('')}
            </select>
          </div>
        </div>

        <button class="btn btn-primary w-full" onclick="Updates.createRing()">
          Create Update Ring
        </button>
      </div>
    `;
    modal?.classList.remove('hidden');
  },

  closeCreateRing() {
    document.getElementById('createRingModal')?.classList.add('hidden');
  },

  async createRing() {
    const activeTenant = AppState.get('activeTenant');
    const tenantId = activeTenant === 'all'
      ? document.getElementById('ringTenantId')?.value
      : activeTenant;

    if (!tenantId) { Toast.show('Select a tenant', 'warning'); return; }

    const name = document.getElementById('ringName')?.value?.trim();
    if (!name) { Toast.show('Enter a ring name', 'warning'); return; }

    const ring = {
      displayName: name,
      description: document.getElementById('ringDescription')?.value?.trim() || '',
      featureUpdatesDeferralPeriodInDays: parseInt(document.getElementById('featureDeferral')?.value || '0'),
      qualityUpdatesDeferralPeriodInDays: parseInt(document.getElementById('qualityDeferral')?.value || '0'),
      automaticUpdateMode: document.getElementById('ringUpdateMode')?.value || 'autoInstallAtMaintenanceTime',
      activeHoursStart: parseInt(document.getElementById('ringActiveStart')?.value || '8'),
      activeHoursEnd: parseInt(document.getElementById('ringActiveEnd')?.value || '17'),
      featureUpdatesPaused: false,
      qualityUpdatesPaused: false,
    };

    try {
      await Graph.createUpdateRing(tenantId, ring);
      Toast.show(`Update ring "${name}" created`, 'success');
      this.closeCreateRing();
      // Reload rings
      await Graph.loadUpdateRings(tenantId);
      this.render();
    } catch (err) {
      Toast.show('Failed: ' + err.message, 'error');
    }
  },

  async deleteRing(tenantId, ringId, ringName) {
    if (!confirm(`Delete update ring "${ringName}"?`)) return;
    try {
      await Graph.deleteUpdateRing(tenantId, ringId);
      Toast.show(`Update ring "${ringName}" deleted`, 'success');
      await Graph.loadUpdateRings(tenantId);
      this.render();
    } catch (err) {
      Toast.show('Failed: ' + err.message, 'error');
    }
  },

  async refreshAll() {
    const tenants = AppState.get('tenants');
    Toast.show('Refreshing update data...', 'info');
    for (const t of tenants) {
      try {
        await Graph.loadUpdateRings(t.id);
        await Graph.loadDevices(t.id);
      } catch (e) { /* continue */ }
    }
    Toast.show('Update data refreshed', 'success');
    this.render();
  },

  // --- Version Helpers ---
  _getVersionStatus(ver) {
    if (!ver || ver === 'Unknown') return 'unknown';
    // Extract major.minor.build
    const match = ver.match(/(\d+\.\d+\.\d+)/);
    if (!match) return 'unknown';
    const build = match[1];

    // Check known versions
    const known = this.latestVersions[build];
    if (known) return known.current ? 'current' : 'behind';

    // Parse build number for heuristic
    const parts = build.split('.').map(Number);
    if (parts.length >= 3) {
      const buildNum = parts[2];
      // Windows 11: 22000+ builds
      if (buildNum >= 26100) return 'current';  // 24H2
      if (buildNum >= 22631) return 'current';   // 23H2
      if (buildNum >= 22000) return 'behind';    // Older Win11
      // Windows 10
      if (buildNum >= 19045) return 'current';   // 22H2
      if (buildNum >= 19041) return 'behind';    // Older Win10
      if (buildNum < 19041) return 'critical';   // Very old
    }

    return 'unknown';
  },

  _getFriendlyName(ver) {
    if (!ver || ver === 'Unknown') return 'Unknown';
    const match = ver.match(/(\d+\.\d+\.\d+)/);
    if (!match) return ver;
    const build = match[1];
    const known = this.latestVersions[build];
    if (known) return known.name;

    const parts = build.split('.').map(Number);
    if (parts.length >= 3) {
      const b = parts[2];
      if (b >= 26100) return 'Windows 11 24H2';
      if (b >= 22631) return 'Windows 11 23H2';
      if (b >= 22621) return 'Windows 11 22H2';
      if (b >= 22000) return 'Windows 11';
      if (b >= 19045) return 'Windows 10 22H2';
      if (b >= 19044) return 'Windows 10 21H2';
      if (b >= 19043) return 'Windows 10 21H1';
      if (b >= 19042) return 'Windows 10 20H2';
      if (b >= 19041) return 'Windows 10 2004';
      if (b >= 18363) return 'Windows 10 1909';
      return 'Windows 10 (Legacy)';
    }
    return ver;
  }
};
