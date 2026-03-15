/* ============================================================
   Devices — Device inventory, details, and bulk actions
   ============================================================ */

const Devices = {
  searchTerm: '',
  osFilter: 'all',
  complianceFilter: 'all',
  currentPage: 1,
  pageSize: 25,
  sortField: 'deviceName',
  sortDir: 'asc',
  activeDetailTab: 'overview',

  render() {
    const main = document.getElementById('mainContent');
    const allDevices = AppState.getDevicesForContext();
    const filtered = this.filterDevices(allDevices);
    const sorted = this.sortDevices(filtered);
    const totalPages = Math.ceil(sorted.length / this.pageSize);
    const paged = sorted.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    const selected = AppState.get('selectedDevices');
    const isAllTenants = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">All Devices</h1>
          <p class="page-subtitle">${allDevices.length} managed devices ${isAllTenants ? 'across all tenants' : 'in ' + AppState.getTenantName(AppState.get('activeTenant'))}</p>
        </div>
        <div class="page-header-actions">
          ${selected.length > 0 ? `
            <span class="badge badge-primary">${selected.length} selected</span>
            <div class="dropdown">
              <button class="btn btn-secondary" onclick="this.nextElementSibling.classList.toggle('hidden')">
                Bulk Actions &#9662;
              </button>
              <div class="dropdown-menu hidden">
                <div class="dropdown-item" onclick="Devices.bulkAction('sync')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                  Sync Devices
                </div>
                <div class="dropdown-item" onclick="Devices.bulkAction('restart')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  Restart Devices
                </div>
                <div class="dropdown-item" onclick="Devices.bulkAction('lock')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Lock Devices
                </div>
                <div class="dropdown-item" onclick="Devices.bulkAction('defenderScan')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Defender Quick Scan
                </div>
                <div class="dropdown-item" onclick="Devices.bulkAction('defenderUpdate')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                  Update Defender Signatures
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item danger" onclick="Devices.bulkAction('retire')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  Retire Devices
                </div>
              </div>
            </div>
          ` : ''}
          <button class="btn btn-secondary" onclick="Devices.exportCSV()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </div>

      <!-- Device Table -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search devices..." value="${this.searchTerm}" oninput="Devices.search(this.value)">
            </div>
            <select class="form-select" style="width:auto;" onchange="Devices.filterOS(this.value)">
              <option value="all" ${this.osFilter==='all'?'selected':''}>All OS</option>
              <option value="windows" ${this.osFilter==='windows'?'selected':''}>Windows</option>
              <option value="macOS" ${this.osFilter==='macOS'?'selected':''}>macOS</option>
              <option value="iOS" ${this.osFilter==='iOS'?'selected':''}>iOS</option>
              <option value="android" ${this.osFilter==='android'?'selected':''}>Android</option>
              <option value="linux" ${this.osFilter==='linux'?'selected':''}>Linux</option>
            </select>
            <select class="form-select" style="width:auto;" onchange="Devices.filterCompliance(this.value)">
              <option value="all" ${this.complianceFilter==='all'?'selected':''}>All Status</option>
              <option value="compliant" ${this.complianceFilter==='compliant'?'selected':''}>Compliant</option>
              <option value="noncompliant" ${this.complianceFilter==='noncompliant'?'selected':''}>Non-Compliant</option>
              <option value="unknown" ${this.complianceFilter==='unknown'?'selected':''}>Unknown</option>
            </select>
          </div>
          <div class="table-toolbar-right">
            <span class="text-xs text-muted">${filtered.length} results</span>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width:40px;">
                <input type="checkbox" class="table-checkbox" onchange="Devices.selectAll(this.checked)" ${selected.length === paged.length && paged.length > 0 ? 'checked' : ''}>
              </th>
              <th onclick="Devices.sort('deviceName')" style="cursor:pointer;">Device Name ${this.sortIcon('deviceName')}</th>
              ${isAllTenants ? '<th>Tenant</th>' : ''}
              <th onclick="Devices.sort('operatingSystem')" style="cursor:pointer;">OS ${this.sortIcon('operatingSystem')}</th>
              <th>OS Version</th>
              <th onclick="Devices.sort('complianceState')" style="cursor:pointer;">Compliance ${this.sortIcon('complianceState')}</th>
              <th onclick="Devices.sort('managementAgent')" style="cursor:pointer;">Managed By ${this.sortIcon('managementAgent')}</th>
              <th>Primary User</th>
              <th onclick="Devices.sort('lastSyncDateTime')" style="cursor:pointer;">Last Sync ${this.sortIcon('lastSyncDateTime')}</th>
              <th>Storage</th>
              <th>Encryption</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody>
            ${paged.length === 0 ? `
              <tr><td colspan="${isAllTenants ? 13 : 12}" class="text-center text-muted" style="padding:3rem;">
                ${allDevices.length === 0 ? 'No devices found. Connect a tenant to load devices.' : 'No devices match your filters.'}
              </td></tr>
            ` : paged.map(d => this.renderDeviceRow(d, isAllTenants)).join('')}
          </tbody>
        </table>

        ${totalPages > 1 ? `
          <div class="table-pagination">
            <span>Showing ${(this.currentPage-1)*this.pageSize+1}–${Math.min(this.currentPage*this.pageSize, filtered.length)} of ${filtered.length}</span>
            <div class="table-pagination-pages">
              <button class="table-pagination-btn" onclick="Devices.goPage(${this.currentPage-1})" ${this.currentPage===1?'disabled':''}>&lsaquo;</button>
              ${this.renderPagination(totalPages)}
              <button class="table-pagination-btn" onclick="Devices.goPage(${this.currentPage+1})" ${this.currentPage===totalPages?'disabled':''}>&rsaquo;</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderDeviceRow(device, showTenant) {
    const selected = AppState.get('selectedDevices');
    const isSelected = selected.includes(device.id);
    const osIcon = this.getOSIcon(device.operatingSystem);
    const complianceBadge = this.getComplianceBadge(device.complianceState);
    const storageBar = this.renderStorageMiniBar(device);
    const relativeSync = this.relativeTime(device.lastSyncDateTime);
    const managedBy = this.formatManagementAgent(device.managementAgent);

    return `
      <tr class="${isSelected ? 'selected' : ''}" onclick="Devices.showDetail('${device._tenantId}', '${device.id}')" style="cursor:pointer;">
        <td onclick="event.stopPropagation()">
          <input type="checkbox" class="table-checkbox" ${isSelected ? 'checked' : ''}
                 onchange="Devices.toggleSelect('${device.id}', this.checked)">
        </td>
        <td>
          <div class="table-device-name">
            <div class="table-device-icon">${osIcon}</div>
            <div class="table-device-info">
              <span class="table-device-primary">${device.deviceName || 'Unknown'}</span>
              <span class="table-device-secondary">${device.serialNumber || device.id?.substring(0,12) || ''}</span>
            </div>
          </div>
        </td>
        ${showTenant ? `<td><span class="chip">${AppState.getTenantName(device._tenantId)}</span></td>` : ''}
        <td>${device.operatingSystem || '-'}</td>
        <td class="text-mono text-xs">${device.osVersion || '-'}</td>
        <td>${complianceBadge}</td>
        <td class="text-sm">${managedBy}</td>
        <td class="text-sm">${device.userPrincipalName || device.emailAddress || '-'}</td>
        <td class="text-sm">
          <span title="${this.formatDate(device.lastSyncDateTime)}">${relativeSync}</span>
          <span class="text-xs text-muted" style="display:block;">${this.formatDate(device.lastSyncDateTime)}</span>
        </td>
        <td>${storageBar}</td>
        <td>${device.isEncrypted ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-default">No</span>'}</td>
        <td onclick="event.stopPropagation()">
          <div class="dropdown">
            <button class="btn btn-ghost btn-icon" onclick="this.nextElementSibling.classList.toggle('hidden')">&#8942;</button>
            <div class="dropdown-menu hidden">
              <div class="dropdown-item" onclick="Devices.action('sync','${device._tenantId}','${device.id}')">Sync</div>
              <div class="dropdown-item" onclick="Devices.action('restart','${device._tenantId}','${device.id}')">Restart</div>
              <div class="dropdown-item" onclick="Devices.action('lock','${device._tenantId}','${device.id}')">Lock</div>
              <div class="dropdown-item" onclick="Devices.action('rename','${device._tenantId}','${device.id}')">Rename</div>
              <div class="dropdown-item" onclick="Devices.action('defenderScan','${device._tenantId}','${device.id}')">Defender Scan</div>
              <div class="dropdown-item" onclick="Devices.action('defenderUpdate','${device._tenantId}','${device.id}')">Update Signatures</div>
              <div class="dropdown-item" onclick="Devices.action('shutdown','${device._tenantId}','${device.id}')">Shutdown</div>
              <div class="dropdown-item" onclick="Devices.action('collectDiags','${device._tenantId}','${device.id}')">Collect Diagnostics</div>
              <div class="dropdown-item" onclick="Devices.action('locate','${device._tenantId}','${device.id}')">Locate Device</div>
              <div class="dropdown-item" onclick="Devices.action('bitlocker','${device._tenantId}','${device.id}')">BitLocker Keys</div>
              <div class="dropdown-item" onclick="Devices.action('rotateBitlocker','${device._tenantId}','${device.id}')">Rotate BitLocker</div>
              <div class="dropdown-item" onclick="Devices.action('rotateFileVault','${device._tenantId}','${device.id}')">Rotate FileVault Key</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item danger" onclick="Devices.action('retire','${device._tenantId}','${device.id}')">Retire</div>
              <div class="dropdown-item danger" onclick="Devices.action('wipe','${device._tenantId}','${device.id}')">Wipe</div>
              <div class="dropdown-item danger" onclick="Devices.action('freshStart','${device._tenantId}','${device.id}')">Fresh Start</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  },

  // Storage mini-bar for table row
  renderStorageMiniBar(device) {
    if (!device.totalStorageSpaceInBytes || device.totalStorageSpaceInBytes === 0) return '-';
    const totalGB = Math.round(device.totalStorageSpaceInBytes / 1073741824);
    const freeGB = Math.round((device.freeStorageSpaceInBytes || 0) / 1073741824);
    const usedGB = totalGB - freeGB;
    const usedPct = Math.round((usedGB / totalGB) * 100);
    const barColor = usedPct > 90 ? 'var(--danger)' : usedPct > 75 ? 'var(--warning)' : 'var(--success)';
    return `
      <div style="min-width:60px;" title="${usedGB} GB used / ${totalGB} GB total">
        <div style="font-size:11px;margin-bottom:2px;">${usedPct}%</div>
        <div class="progress-bar" style="height:4px;width:60px;">
          <div class="progress-bar-fill" style="width:${usedPct}%;background:${barColor};"></div>
        </div>
      </div>
    `;
  },

  // Format management agent
  formatManagementAgent(agent) {
    if (!agent) return '-';
    const map = {
      'mdm': 'Intune (MDM)',
      'eas': 'EAS',
      'easMdm': 'EAS + MDM',
      'intuneClient': 'Intune Client',
      'easIntuneClient': 'EAS + Client',
      'configurationManagerClient': 'SCCM',
      'configurationManagerClientMdm': 'Co-managed',
      'unknown': 'Unknown',
      'jamf': 'Jamf',
      'googleCloudDevicePolicyController': 'Google'
    };
    return `<span class="chip">${map[agent] || agent}</span>`;
  },

  // Relative time helper
  relativeTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    const diffMonth = Math.floor(diffDay / 30);
    return `${diffMonth}mo ago`;
  },

  // Detail panel with tabbed interface
  async showDetail(tenantId, deviceId) {
    const devices = AppState.get('devices')[tenantId] || [];
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    this.activeDetailTab = 'overview';
    this._detailTenantId = tenantId;
    this._detailDeviceId = deviceId;

    const panel = document.getElementById('deviceDetailPanel');
    const body = document.getElementById('detailPanelBody');
    const actions = document.getElementById('detailPanelActions');
    document.getElementById('detailDeviceName').textContent = device.deviceName || 'Device Details';

    body.innerHTML = this._renderDetailTabs(device, tenantId, deviceId);
    actions.innerHTML = '';

    panel.classList.add('open');
  },

  _renderDetailTabs(device, tenantId, deviceId) {
    const storageUsedPct = device.totalStorageSpaceInBytes
      ? Math.round(((device.totalStorageSpaceInBytes - (device.freeStorageSpaceInBytes || 0)) / device.totalStorageSpaceInBytes) * 100)
      : 0;
    const totalGB = device.totalStorageSpaceInBytes ? Math.round(device.totalStorageSpaceInBytes / 1073741824) : 0;
    const freeGB = device.freeStorageSpaceInBytes ? Math.round(device.freeStorageSpaceInBytes / 1073741824) : 0;
    const usedGB = totalGB - freeGB;
    const storageBarColor = storageUsedPct > 90 ? 'var(--danger)' : storageUsedPct > 75 ? 'var(--warning)' : 'var(--success)';
    const memoryGB = device.physicalMemoryInBytes ? (device.physicalMemoryInBytes / 1073741824).toFixed(1) : null;

    return `
      <div class="tabs" style="margin-bottom:16px;">
        <button class="tab active" data-tab="overview" onclick="Devices.switchDetailTab('overview', this)">Overview</button>
        <button class="tab" data-tab="hardware" onclick="Devices.switchDetailTab('hardware', this)">Hardware</button>
        <button class="tab" data-tab="compliance" onclick="Devices.switchDetailTab('compliance', this)">Compliance</button>
        <button class="tab" data-tab="apps" onclick="Devices.switchDetailTab('apps', this)">Apps</button>
        <button class="tab" data-tab="config" onclick="Devices.switchDetailTab('config', this)">Config</button>
        <button class="tab" data-tab="notes" onclick="Devices.switchDetailTab('notes', this)">Notes</button>
        <button class="tab" data-tab="actions" onclick="Devices.switchDetailTab('actions', this)">Actions</button>
      </div>

      <!-- Overview Tab -->
      <div class="detail-tab-content" id="detailTab-overview" style="display:block;">
        <div class="detail-section">
          <div class="detail-section-title">Device Information</div>
          <div class="detail-row"><span class="detail-label">Device Name</span><span class="detail-value inline-editable" onclick="Devices._startInlineEdit(this, '${tenantId}', '${deviceId}', 'deviceName')" data-tooltip="Click to edit">${device.deviceName || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Manufacturer</span><span class="detail-value">${device.manufacturer || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Model</span><span class="detail-value">${device.model || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Serial Number</span><span class="detail-value text-mono">${device.serialNumber || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Enrolled</span><span class="detail-value">${this.formatDate(device.enrolledDateTime)}</span></div>
          <div class="detail-row"><span class="detail-label">Last Sync</span><span class="detail-value">${this.relativeTime(device.lastSyncDateTime)} &mdash; ${this.formatDate(device.lastSyncDateTime)}</span></div>
          <div class="detail-row"><span class="detail-label">Managed By</span><span class="detail-value">${this.formatManagementAgent(device.managementAgent)}</span></div>
          <div class="detail-row"><span class="detail-label">Tenant</span><span class="detail-value">${AppState.getTenantName(tenantId)}</span></div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">Operating System</div>
          <div class="detail-row"><span class="detail-label">OS</span><span class="detail-value">${device.operatingSystem || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value text-mono">${device.osVersion || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Architecture</span><span class="detail-value">${device.operatingSystemEdition || '-'}</span></div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">Security & Compliance</div>
          <div class="detail-row"><span class="detail-label">Compliance</span><span class="detail-value">${this.getComplianceBadge(device.complianceState)}</span></div>
          <div class="detail-row"><span class="detail-label">Encrypted</span><span class="detail-value">${device.isEncrypted ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</span></div>
          <div class="detail-row"><span class="detail-label">Supervised</span><span class="detail-value">${device.isSupervised ? 'Yes' : 'No'}</span></div>
          <div class="detail-row"><span class="detail-label">Jailbroken</span><span class="detail-value">${device.jailBroken === 'True' ? '<span class="badge badge-danger">Yes</span>' : 'No'}</span></div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">User & Network</div>
          <div class="detail-row"><span class="detail-label">Primary User</span><span class="detail-value">${device.userPrincipalName || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${device.emailAddress || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Wi-Fi MAC</span><span class="detail-value text-mono">${device.wiFiMacAddress || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Ethernet MAC</span><span class="detail-value text-mono">${device.ethernetMacAddress || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">IMEI</span><span class="detail-value text-mono">${device.imei || '-'}</span></div>
        </div>
      </div>

      <!-- Hardware Tab -->
      <div class="detail-tab-content" id="detailTab-hardware" style="display:none;">
        <div class="detail-section">
          <div class="detail-section-title">Hardware Details</div>
          <div class="detail-row"><span class="detail-label">Manufacturer</span><span class="detail-value">${device.manufacturer || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Model</span><span class="detail-value">${device.model || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Serial Number</span><span class="detail-value text-mono">${device.serialNumber || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Physical Memory</span><span class="detail-value">${memoryGB ? memoryGB + ' GB' : '-'}</span></div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">Storage</div>
          <div class="detail-row"><span class="detail-label">Total</span><span class="detail-value">${totalGB ? totalGB + ' GB' : '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Free</span><span class="detail-value">${totalGB ? freeGB + ' GB' : '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Used</span><span class="detail-value">${totalGB ? usedGB + ' GB (' + storageUsedPct + '%)' : '-'}</span></div>
          ${totalGB ? `
            <div style="margin-top:8px;">
              <div class="progress-bar" style="height:12px;border-radius:6px;">
                <div class="progress-bar-fill" style="width:${storageUsedPct}%;background:${storageBarColor};border-radius:6px;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--ink-tertiary);">
                <span>${usedGB} GB used</span>
                <span>${freeGB} GB free</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Compliance Tab -->
      <div class="detail-tab-content" id="detailTab-compliance" style="display:none;">
        <div class="detail-section">
          <div class="detail-section-title">Compliance Policy States</div>
          <div id="detailComplianceContent">
            <div class="text-center text-muted" style="padding:2rem;">
              <div class="spinner" style="margin:0 auto 8px;"></div>
              Loading compliance data...
            </div>
          </div>
        </div>
      </div>

      <!-- Apps Tab -->
      <div class="detail-tab-content" id="detailTab-apps" style="display:none;">
        <div class="detail-section">
          <div class="detail-section-title">Installed Applications</div>
          <div id="detailAppsContent">
            <div class="text-center text-muted" style="padding:2rem;">
              <div class="spinner" style="margin:0 auto 8px;"></div>
              Loading installed apps...
            </div>
          </div>
        </div>
      </div>

      <!-- Config Tab -->
      <div class="detail-tab-content" id="detailTab-config" style="display:none;">
        <div class="detail-section">
          <div class="detail-section-title">Configuration Profile States</div>
          <div id="detailConfigContent">
            <div class="text-center text-muted" style="padding:2rem;">
              <div class="spinner" style="margin:0 auto 8px;"></div>
              Loading configuration states...
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Tab -->
      <div class="detail-tab-content" id="detailTab-notes" style="display:none;">
        <div class="detail-section">
          <div class="detail-section-title">Device Notes</div>
          <textarea id="detailDeviceNotes" style="width:100%;min-height:150px;padding:8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:13px;resize:vertical;background:var(--bg-surface);color:var(--ink-primary);"
                    placeholder="Add notes about this device...">${device.notes || ''}</textarea>
          <div style="margin-top:8px;text-align:right;">
            <button class="btn btn-secondary btn-sm" onclick="Devices.saveNotes('${tenantId}','${deviceId}')">Save Notes</button>
          </div>
        </div>
      </div>

      <!-- Actions Tab -->
      <div class="detail-tab-content" id="detailTab-actions" style="display:none;">
        ${this._renderDetailActionsGrid(tenantId, deviceId, device)}
      </div>
    `;
  },

  switchDetailTab(tabName, btnEl) {
    // Hide all tab content
    const contents = document.querySelectorAll('.detail-tab-content');
    contents.forEach(c => c.style.display = 'none');

    // Remove active from all tab buttons
    const tabs = document.querySelectorAll('.tabs .tab');
    tabs.forEach(t => t.classList.remove('active'));

    // Show selected tab and mark active
    const target = document.getElementById('detailTab-' + tabName);
    if (target) target.style.display = 'block';
    if (btnEl) btnEl.classList.add('active');

    this.activeDetailTab = tabName;

    // Lazy-load data for tabs that need it
    if (tabName === 'compliance') this._loadComplianceTab();
    if (tabName === 'apps') this._loadAppsTab();
    if (tabName === 'config') this._loadConfigTab();
  },

  async _loadComplianceTab() {
    const container = document.getElementById('detailComplianceContent');
    if (!container || container.dataset.loaded === 'true') return;
    container.innerHTML = '<div class="text-muted" style="padding:1rem;">Loading compliance data...</div>';
    try {
      const result = await Graph.getDeviceCompliance(this._detailTenantId, this._detailDeviceId);
      const states = result?.value || result || [];
      if (!states.length) {
        container.innerHTML = '<div class="text-muted" style="padding:1rem;">No compliance policy states found.</div>';
      } else {
        container.innerHTML = states.map(s => {
          const state = s.state || s.complianceStatus || 'unknown';
          const isPass = state === 'compliant' || state === 'notApplicable';
          const badgeClass = isPass ? 'badge-success' : (state === 'nonCompliant' || state === 'noncompliant' ? 'badge-danger' : 'badge-warning');
          const label = s.displayName || s.settingName || s.policyName || 'Policy';
          return `
            <div class="detail-row">
              <span class="detail-label" style="flex:1;">${label}</span>
              <span class="detail-value"><span class="badge ${badgeClass}">${state}</span></span>
            </div>
          `;
        }).join('');
      }
      container.dataset.loaded = 'true';
    } catch (err) {
      const isAuth = err.isAuthError;
      container.innerHTML = `
        <div class="retry-state">
          <p class="text-muted" style="color:${isAuth ? 'var(--warning)' : 'var(--danger)'};">
            ${isAuth ? 'Session expired — please reconnect to load compliance data.' : 'Failed to load compliance data: ' + err.message}
          </p>
          <button class="btn btn-primary btn-sm" onclick="Devices._retryComplianceTab()">
            ${isAuth ? 'Reconnect & Retry' : 'Retry'}
          </button>
        </div>`;
    }
  },

  async _retryComplianceTab() {
    const container = document.getElementById('detailComplianceContent');
    if (container) container.dataset.loaded = '';
    if (!await Auth.getToken(this._detailTenantId)) {
      Auth._isUserInitiated = true;
      await Auth.reconnect();
      Auth._isUserInitiated = false;
    }
    this._loadComplianceTab();
  },

  async _loadAppsTab() {
    const container = document.getElementById('detailAppsContent');
    if (!container || container.dataset.loaded === 'true') return;
    container.innerHTML = '<div class="text-muted" style="padding:1rem;">Loading installed apps...</div>';
    try {
      const result = await Graph.getDeviceInstalledApps(this._detailTenantId, this._detailDeviceId);
      const apps = result?.value || result || [];
      if (!apps.length) {
        container.innerHTML = '<div class="text-muted" style="padding:1rem;">No installed apps found.</div>';
      } else {
        container.innerHTML = `
          <div style="max-height:400px;overflow-y:auto;">
            ${apps.map(a => {
              const name = a.displayName || a.appName || a.name || 'Unknown App';
              const version = a.version || a.displayVersion || '';
              return `
                <div class="detail-row">
                  <span class="detail-label" style="flex:1;">${name}</span>
                  <span class="detail-value text-mono text-xs">${version}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="text-xs text-muted" style="margin-top:8px;">${apps.length} app(s) found</div>
        `;
      }
      container.dataset.loaded = 'true';
    } catch (err) {
      const isAuth = err.isAuthError;
      container.innerHTML = `
        <div class="retry-state">
          <p class="text-muted" style="color:${isAuth ? 'var(--warning)' : 'var(--danger)'};">
            ${isAuth ? 'Session expired — please reconnect to load apps.' : 'Failed to load installed apps: ' + err.message}
          </p>
          <button class="btn btn-primary btn-sm" onclick="Devices._retryAppsTab()">
            ${isAuth ? 'Reconnect & Retry' : 'Retry'}
          </button>
        </div>`;
    }
  },

  async _retryAppsTab() {
    const container = document.getElementById('detailAppsContent');
    if (container) container.dataset.loaded = '';
    if (!await Auth.getToken(this._detailTenantId)) {
      Auth._isUserInitiated = true;
      await Auth.reconnect();
      Auth._isUserInitiated = false;
    }
    this._loadAppsTab();
  },

  async _loadConfigTab() {
    const container = document.getElementById('detailConfigContent');
    if (!container || container.dataset.loaded === 'true') return;
    container.innerHTML = '<div class="text-muted" style="padding:1rem;">Loading configuration states...</div>';
    try {
      const result = await Graph.getDeviceConfigStates(this._detailTenantId, this._detailDeviceId);
      const states = result?.value || result || [];
      if (!states.length) {
        container.innerHTML = '<div class="text-muted" style="padding:1rem;">No configuration profile states found.</div>';
      } else {
        container.innerHTML = states.map(s => {
          const state = s.state || s.status || 'unknown';
          const isOk = state === 'compliant' || state === 'succeeded' || state === 'notApplicable';
          const badgeClass = isOk ? 'badge-success' : (state === 'error' || state === 'failed' || state === 'nonCompliant' ? 'badge-danger' : 'badge-warning');
          const label = s.displayName || s.settingName || s.policyName || 'Profile';
          return `
            <div class="detail-row">
              <span class="detail-label" style="flex:1;">${label}</span>
              <span class="detail-value"><span class="badge ${badgeClass}">${state}</span></span>
            </div>
          `;
        }).join('');
      }
      container.dataset.loaded = 'true';
    } catch (err) {
      const isAuth = err.isAuthError;
      container.innerHTML = `
        <div class="retry-state">
          <p class="text-muted" style="color:${isAuth ? 'var(--warning)' : 'var(--danger)'};">
            ${isAuth ? 'Session expired — please reconnect to load config data.' : 'Failed to load config states: ' + err.message}
          </p>
          <button class="btn btn-primary btn-sm" onclick="Devices._retryConfigTab()">
            ${isAuth ? 'Reconnect & Retry' : 'Retry'}
          </button>
        </div>`;
    }
  },

  async _retryConfigTab() {
    const container = document.getElementById('detailConfigContent');
    if (container) container.dataset.loaded = '';
    if (!await Auth.getToken(this._detailTenantId)) {
      Auth._isUserInitiated = true;
      await Auth.reconnect();
      Auth._isUserInitiated = false;
    }
    this._loadConfigTab();
  },

  async saveNotes(tenantId, deviceId) {
    const textarea = document.getElementById('detailDeviceNotes');
    if (!textarea) return;
    const notes = textarea.value;
    try {
      await Graph.updateDeviceNotes(tenantId, deviceId, notes);
      Toast.show('Device notes saved', 'success');
    } catch (err) {
      Toast.show('Failed to save notes: ' + err.message, 'error');
    }
  },

  /* ---- Inline Editing ---- */
  _startInlineEdit(el, tenantId, deviceId, field) {
    if (el.querySelector('input')) return; // Already editing
    const currentValue = el.textContent.trim();
    const originalHtml = el.innerHTML;
    el.innerHTML = `
      <input type="text" class="form-input" value="${currentValue === '-' ? '' : currentValue}"
        style="padding:2px 6px;font-size:inherit;width:100%;min-width:120px;"
        onkeydown="if(event.key==='Enter'){Devices._saveInlineEdit('${tenantId}','${deviceId}','${field}',this.value,this.parentElement);event.preventDefault();}if(event.key==='Escape'){this.parentElement.innerHTML='${originalHtml.replace(/'/g, "\\'")}';}"
        onblur="Devices._saveInlineEdit('${tenantId}','${deviceId}','${field}',this.value,this.parentElement)">
    `;
    const input = el.querySelector('input');
    if (input) { input.focus(); input.select(); }
  },

  async _saveInlineEdit(tenantId, deviceId, field, newValue, el) {
    if (!newValue || !newValue.trim()) {
      el.textContent = '-';
      return;
    }
    const trimmed = newValue.trim();
    el.textContent = trimmed;

    // Update local cache
    const devices = AppState.get('devices')[tenantId] || [];
    const device = devices.find(d => d.id === deviceId);
    if (device) device[field] = trimmed;

    // Update header if editing device name
    if (field === 'deviceName') {
      const header = document.getElementById('detailDeviceName');
      if (header) header.textContent = trimmed;
    }

    // Attempt Graph API update
    try {
      await Graph.patchDevice(tenantId, deviceId, { [field]: trimmed });
      Toast.show(`${field} updated`, 'success');
    } catch (err) {
      Toast.show('Save failed: ' + err.message, 'warning');
    }
  },

  /* ---- Bulk Cross-Tenant Operations ---- */
  async bulkCrossTenantAction(actionType) {
    const tenants = AppState.get('tenants');
    if (tenants.length === 0) { Toast.show('No tenants connected', 'warning'); return; }

    const allDevices = AppState.getDevicesForContext();
    const targetDevices = allDevices.filter(d => {
      if (actionType === 'syncStale') {
        return d.lastSyncDateTime && (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 7 * 86400000;
      }
      if (actionType === 'syncNonCompliant') {
        return d.complianceState === 'noncompliant';
      }
      return false;
    });

    if (targetDevices.length === 0) {
      Toast.show('No devices match criteria', 'info');
      return;
    }

    if (!confirm(`This will sync ${targetDevices.length} device(s) across ${tenants.length} tenant(s). Continue?`)) return;

    Toast.show(`Syncing ${targetDevices.length} devices...`, 'info');
    let success = 0, failed = 0;
    for (const d of targetDevices) {
      try {
        await Graph.syncDevice(d._tenantId, d.id);
        success++;
      } catch (e) { failed++; }
    }
    Toast.show(`Sync complete: ${success} succeeded, ${failed} failed`, success > 0 ? 'success' : 'warning');
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('Bulk Cross-Tenant Sync', `Synced ${success}/${targetDevices.length} devices (${actionType})`, null, 'action');
    }
  },

  // Detail panel actions grid - compact 4-column layout
  _renderDetailActionsGrid(tenantId, deviceId, device) {
    const isMac = (device.operatingSystem || '').toLowerCase().includes('mac');
    const isWindows = (device.operatingSystem || '').toLowerCase().includes('windows');
    const t = tenantId;
    const d = deviceId;

    const actions = [
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>', label: 'Sync', onclick: `Devices.action('sync','${t}','${d}')`, color: '' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', label: 'Diagnostics', onclick: `Devices.action('collectDiags','${t}','${d}')`, color: '' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>', label: 'Locate', onclick: `Devices.action('locate','${t}','${d}')`, color: '' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', label: 'Defender Scan', onclick: `Devices.action('defenderScan','${t}','${d}')`, color: '' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>', label: 'Update Sigs', onclick: `Devices.action('defenderUpdate','${t}','${d}')`, color: '' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', label: 'Rename', onclick: `Devices.action('rename','${t}','${d}')`, color: '' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>', label: 'Restart', onclick: `Devices.action('restart','${t}','${d}')`, color: 'orange' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>', label: 'Shutdown', onclick: `Devices.action('shutdown','${t}','${d}')`, color: 'orange' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', label: 'Lock', onclick: `Devices.action('lock','${t}','${d}')`, color: 'orange' },
    ];

    // Platform-specific actions
    if (isWindows) {
      actions.push(
        { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', label: 'Rotate BitLocker', onclick: `Devices.action('rotateBitlocker','${t}','${d}')`, color: '' },
        { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>', label: 'BitLocker Keys', onclick: `Devices.action('bitlocker','${t}','${d}')`, color: '' }
      );
    }
    if (isMac) {
      actions.push(
        { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', label: 'Rotate FileVault', onclick: `Devices.action('rotateFileVault','${t}','${d}')`, color: '' }
      );
    }

    // Destructive actions always last
    actions.push(
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>', label: 'Retire', onclick: `Devices.action('retire','${t}','${d}')`, color: 'red' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>', label: 'Wipe', onclick: `Devices.action('wipe','${t}','${d}')`, color: 'red' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 10.57-8.38"/></svg>', label: 'Fresh Start', onclick: `Devices.action('freshStart','${t}','${d}')`, color: 'red' }
    );

    return `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
        ${actions.map(a => {
          const borderColor = a.color === 'red' ? 'var(--danger)' : a.color === 'orange' ? 'var(--warning)' : 'var(--border)';
          const textColor = a.color === 'red' ? 'var(--danger)' : a.color === 'orange' ? 'var(--warning)' : 'var(--ink-secondary)';
          const bgHover = a.color === 'red' ? 'var(--danger-pale)' : a.color === 'orange' ? 'var(--warning-pale)' : 'var(--gray-50)';
          return `
            <button class="detail-action-btn" onclick="${a.onclick}"
                    style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border:1px solid ${borderColor};border-radius:8px;background:var(--surface);cursor:pointer;transition:all 0.15s ease;color:${textColor};font-size:11px;font-weight:500;font-family:inherit;line-height:1.2;text-align:center;"
                    onmouseover="this.style.background='${bgHover}'"
                    onmouseout="this.style.background='var(--surface)'">
              ${a.icon}
              ${a.label}
            </button>
          `;
        }).join('')}
      </div>
    `;
  },

  closeDetail() {
    document.getElementById('deviceDetailPanel')?.classList.remove('open');
  },

  // Actions
  async action(type, tenantId, deviceId) {
    const device = (AppState.get('devices')[tenantId] || []).find(d => d.id === deviceId);
    const name = device?.deviceName || 'this device';

    try {
      switch (type) {
        case 'sync':
          await Graph.syncDevice(tenantId, deviceId);
          Toast.show(`Sync initiated for ${name}`, 'success');
          break;
        case 'restart':
          if (!await Confirm.show({ title: 'Restart Device', message: `Send restart command to <strong>${name}</strong>?`, confirmText: 'Restart', type: 'warning' })) return;
          await Graph.restartDevice(tenantId, deviceId);
          Toast.show(`Restart command sent to ${name}`, 'success');
          break;
        case 'lock':
          if (!await Confirm.show({ title: 'Lock Device', message: `Remotely lock <strong>${name}</strong>?`, confirmText: 'Lock', type: 'warning' })) return;
          await Graph.lockDevice(tenantId, deviceId);
          Toast.show(`Lock command sent to ${name}`, 'success');
          break;
        case 'retire':
          if (!await Confirm.show({ title: 'Retire Device', message: `Retire <strong>${name}</strong>? This will remove all company data from the device.`, confirmText: 'Retire', type: 'danger' })) return;
          await Graph.retireDevice(tenantId, deviceId);
          Toast.show(`Retire command sent to ${name}`, 'warning');
          break;
        case 'wipe':
          if (!await Confirm.show({ title: 'Wipe Device', message: `Factory reset <strong>${name}</strong>? This will erase ALL data on the device. <strong>This cannot be undone!</strong>`, confirmText: 'Wipe Device', type: 'danger' })) return;
          await Graph.wipeDevice(tenantId, deviceId);
          Toast.show(`Wipe command sent to ${name}`, 'warning');
          break;
        case 'rename': {
          const newName = prompt(`Rename device (current: ${name}):`, name);
          if (!newName || newName === name) return;
          await Graph.renameDevice(tenantId, deviceId, newName);
          Toast.show(`Device renamed to ${newName}`, 'success');
          break;
        }
        case 'bitlocker': {
          const keys = await Graph.getBitLockerKeys(tenantId, deviceId);
          if (keys?.value?.length) {
            alert(`BitLocker Recovery Keys:\n\n${keys.value.map(k => k.id + ': ' + k.key).join('\n')}`);
          } else {
            Toast.show('No BitLocker keys found for this device', 'info');
          }
          break;
        }
        case 'defenderScan': {
          const quickScan = await Confirm.show({ title: 'Defender Scan', message: `Run a <strong>quick scan</strong> on ${name}?<br>Click Cancel for a full scan instead.`, confirmText: 'Quick Scan', cancelText: 'Full Scan', type: 'info' });
          await Graph.windowsDefenderScan(tenantId, deviceId, quickScan);
          Toast.show(`Defender ${quickScan ? 'quick' : 'full'} scan initiated on ${name}`, 'success');
          break;
        }
        case 'defenderUpdate':
          await Graph.updateDefenderSignatures(tenantId, deviceId);
          Toast.show(`Defender signature update initiated on ${name}`, 'success');
          break;
        case 'freshStart': {
          if (!await Confirm.show({ title: 'Fresh Start', message: `Reinstall Windows on <strong>${name}</strong>? This may remove installed apps.`, confirmText: 'Fresh Start', type: 'danger' })) return;
          const keepUserData = await Confirm.show({ title: 'Keep User Data?', message: 'Do you want to preserve user data during the fresh start?', confirmText: 'Keep Data', cancelText: 'Remove Data', type: 'info' });
          await Graph.freshStart(tenantId, deviceId, keepUserData);
          Toast.show(`Fresh Start initiated on ${name} (${keepUserData ? 'keeping' : 'removing'} user data)`, 'warning');
          break;
        }
        case 'shutdown':
          if (!await Confirm.show({ title: 'Shutdown Device', message: `Shut down <strong>${name}</strong>?`, confirmText: 'Shutdown', type: 'warning' })) return;
          await Graph.shutdownDevice(tenantId, deviceId);
          Toast.show(`Shutdown command sent to ${name}`, 'success');
          break;
        case 'collectDiags':
          await Graph.collectDiagnostics(tenantId, deviceId);
          Toast.show(`Diagnostics collection initiated on ${name}`, 'success');
          break;
        case 'locate':
          await Graph.locateDevice(tenantId, deviceId);
          Toast.show(`Locate request sent to ${name}`, 'success');
          break;
        case 'rotateFileVault':
          await Graph.rotateFileVaultKey(tenantId, deviceId);
          Toast.show(`FileVault key rotation initiated on ${name}`, 'success');
          break;
        case 'rotateBitlocker':
          await Graph.rotateBitLockerKeys(tenantId, deviceId);
          Toast.show(`BitLocker key rotation initiated on ${name}`, 'success');
          break;
      }
    } catch (error) {
      Toast.show(error.message, 'error', 'Action Failed');
    }
  },

  async bulkAction(type) {
    const selected = AppState.get('selectedDevices');
    if (!selected.length) return;

    const actionLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const isDangerous = ['retire', 'wipe', 'freshStart'].includes(type);
    const ok = await Confirm.show({
      title: `Bulk ${actionLabel}`,
      message: `${actionLabel} <strong>${selected.length}</strong> device(s)?${isDangerous ? ' <br><strong>This action may be irreversible.</strong>' : ''}`,
      confirmText: `${actionLabel} All`,
      type: isDangerous ? 'danger' : 'warning'
    });
    if (!ok) return;

    const allDevices = AppState.getDevicesForContext();
    const items = selected.map(id => {
      const d = allDevices.find(x => x.id === id);
      return { id, label: d?.deviceName || id, _tenantId: d?._tenantId };
    });

    // Use BulkProgress tracker if available
    if (typeof BulkProgress !== 'undefined') {
      await BulkProgress.run(`${actionLabel} Devices`, items, async (item) => {
        await this.action(type, item._tenantId, item.id);
        return 'Done';
      }, () => {
        AppState.set('selectedDevices', []);
        this.render();
      });
      return;
    }

    // Fallback: simple loop
    let success = 0, fail = 0;
    for (const deviceId of selected) {
      const device = allDevices.find(d => d.id === deviceId);
      if (!device) continue;
      try {
        await this.action(type, device._tenantId, device.id);
        success++;
      } catch {
        fail++;
      }
    }

    AppState.set('selectedDevices', []);
    Toast.show(`${success} succeeded, ${fail} failed`, success > 0 ? 'success' : 'error', 'Bulk Action Complete');
    this.render();
  },

  // Filtering & sorting
  filterDevices(devices) {
    return devices.filter(d => {
      if (this.searchTerm) {
        const s = this.searchTerm.toLowerCase();
        const match = (d.deviceName || '').toLowerCase().includes(s) ||
          (d.userPrincipalName || '').toLowerCase().includes(s) ||
          (d.serialNumber || '').toLowerCase().includes(s) ||
          (d.model || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (this.osFilter !== 'all' && (d.operatingSystem || '').toLowerCase() !== this.osFilter.toLowerCase()) return false;
      if (this.complianceFilter !== 'all' && d.complianceState !== this.complianceFilter) return false;
      return true;
    });
  },

  sortDevices(devices) {
    return [...devices].sort((a, b) => {
      let va = a[this.sortField] || '';
      let vb = b[this.sortField] || '';
      if (this.sortField === 'lastSyncDateTime') {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  },

  search(term) { this.searchTerm = term; this.currentPage = 1; this.render(); },
  filterOS(val) { this.osFilter = val; this.currentPage = 1; this.render(); },
  filterCompliance(val) { this.complianceFilter = val; this.currentPage = 1; this.render(); },
  sort(field) {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = 'asc'; }
    this.render();
  },
  goPage(n) { this.currentPage = Math.max(1, n); this.render(); },

  toggleSelect(id, checked) {
    const sel = [...AppState.get('selectedDevices')];
    if (checked && !sel.includes(id)) sel.push(id);
    if (!checked) { const idx = sel.indexOf(id); if (idx >= 0) sel.splice(idx, 1); }
    AppState.set('selectedDevices', sel);
    this.render();
  },

  selectAll(checked) {
    const allDevices = AppState.getDevicesForContext();
    const filtered = this.filterDevices(allDevices);
    const sorted = this.sortDevices(filtered);
    const paged = sorted.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    AppState.set('selectedDevices', checked ? paged.map(d => d.id) : []);
    this.render();
  },

  // Export CSV
  exportCSV() {
    const allDevices = AppState.getDevicesForContext();
    const filtered = this.filterDevices(allDevices);
    const headers = ['Device Name','Tenant','OS','OS Version','Compliance','Managed By','User','Serial','Last Sync','Encrypted'];
    const rows = filtered.map(d => [
      d.deviceName, AppState.getTenantName(d._tenantId), d.operatingSystem, d.osVersion,
      d.complianceState, d.managementAgent || '', d.userPrincipalName, d.serialNumber,
      d.lastSyncDateTime, d.isEncrypted ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `devices-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Toast.show('Device list exported', 'success');
  },

  // Helpers
  getOSIcon(os) {
    const osLower = (os || '').toLowerCase();
    if (osLower.includes('windows')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>';
    if (osLower.includes('macos') || osLower.includes('mac os')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>';
    if (osLower.includes('ios')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><rect x="5" y="1" width="14" height="22" rx="3" stroke="#555" fill="none" stroke-width="1.5"/><circle cx="12" cy="19" r="1" fill="#555"/></svg>';
    if (osLower.includes('android')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#3DDC84"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0012 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 006 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>';
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  },

  getComplianceBadge(state) {
    switch (state) {
      case 'compliant': return '<span class="status-badge compliant">Compliant</span>';
      case 'noncompliant': return '<span class="status-badge non-compliant">Non-Compliant</span>';
      case 'inGracePeriod': return '<span class="status-badge pending">Grace Period</span>';
      default: return '<span class="status-badge inactive">Unknown</span>';
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  },

  sortIcon(field) {
    if (this.sortField !== field) return '';
    return this.sortDir === 'asc' ? ' &#9650;' : ' &#9660;';
  },

  renderPagination(total) {
    let html = '';
    const cur = this.currentPage;
    const pages = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('...');
      for (let i = Math.max(2, cur-1); i <= Math.min(total-1, cur+1); i++) pages.push(i);
      if (cur < total-2) pages.push('...');
      pages.push(total);
    }
    for (const p of pages) {
      if (p === '...') { html += '<span style="padding:0 4px;">...</span>'; continue; }
      html += `<button class="table-pagination-btn ${p===cur?'active':''}" onclick="Devices.goPage(${p})">${p}</button>`;
    }
    return html;
  }
};
