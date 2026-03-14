/* ============================================================
   DeviceCompare — Side-by-side device comparison tool
   ============================================================ */

const DeviceCompare = {
  _selected: [],
  _maxCompare: 3,

  render() {
    const main = document.getElementById('mainContent');
    const allDevices = AppState.getDevicesForContext();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Device Comparison</h1>
          <p class="page-subtitle">Compare up to ${this._maxCompare} devices side-by-side</p>
        </div>
        <div class="page-header-actions">
          ${this._selected.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="DeviceCompare._selected=[]; DeviceCompare.render();">Clear</button>` : ''}
        </div>
      </div>

      <!-- Device Picker -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="flex items-center gap-3 mb-3">
            <input type="text" class="form-input" id="dcSearch" placeholder="Search devices to compare..."
              oninput="DeviceCompare._filterList(this.value)" style="max-width:400px;">
            <span class="text-sm text-muted">${this._selected.length}/${this._maxCompare} selected</span>
          </div>
          <div id="dcDeviceList" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-sm);">
            ${this._renderDeviceList(allDevices, '')}
          </div>
        </div>
      </div>

      <!-- Comparison View -->
      <div id="dcCompareView">
        ${this._selected.length < 2
          ? '<div class="card"><div class="empty-state" style="padding:3rem;"><h3 class="empty-state-title">Select Devices</h3><p class="empty-state-text">Pick at least 2 devices above to compare them.</p></div></div>'
          : this._renderComparison(allDevices)}
      </div>
    `;
  },

  _renderDeviceList(devices, search) {
    const filtered = search
      ? devices.filter(d => (d.deviceName || '').toLowerCase().includes(search.toLowerCase()) ||
          (d.userPrincipalName || '').toLowerCase().includes(search.toLowerCase()))
      : devices;

    return filtered.slice(0, 50).map(d => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border-light);cursor:pointer;"
        onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
        <input type="checkbox" ${this._selected.includes(d.id) ? 'checked' : ''}
          onchange="DeviceCompare._toggleDevice('${d.id}')"
          ${!this._selected.includes(d.id) && this._selected.length >= this._maxCompare ? 'disabled' : ''}>
        <span class="text-sm fw-500">${d.deviceName || 'Unknown'}</span>
        <span class="text-xs text-muted">${d.operatingSystem || ''} ${d.osVersion || ''}</span>
        <span class="text-xs text-muted" style="margin-left:auto;">${AppState.getTenantName(d._tenantId)}</span>
      </label>
    `).join('') || '<div class="text-sm text-muted p-3">No devices found.</div>';
  },

  _filterList(search) {
    const devices = AppState.getDevicesForContext();
    document.getElementById('dcDeviceList').innerHTML = this._renderDeviceList(devices, search);
  },

  _toggleDevice(deviceId) {
    const idx = this._selected.indexOf(deviceId);
    if (idx >= 0) this._selected.splice(idx, 1);
    else if (this._selected.length < this._maxCompare) this._selected.push(deviceId);
    this.render();
  },

  _renderComparison(allDevices) {
    const devices = this._selected.map(id => allDevices.find(d => d.id === id)).filter(Boolean);
    if (devices.length < 2) return '';

    const fields = [
      { label: 'Device Name',     fn: d => d.deviceName || '-' },
      { label: 'Tenant',          fn: d => AppState.getTenantName(d._tenantId) },
      { label: 'OS',              fn: d => d.operatingSystem || '-' },
      { label: 'OS Version',      fn: d => d.osVersion || '-' },
      { label: 'Compliance',      fn: d => d.complianceState || '-',
        badge: d => d.complianceState === 'compliant' ? 'success' : d.complianceState === 'noncompliant' ? 'danger' : 'default' },
      { label: 'Encrypted',       fn: d => d.isEncrypted ? 'Yes' : 'No',
        badge: d => d.isEncrypted ? 'success' : 'danger' },
      { label: 'Manufacturer',    fn: d => d.manufacturer || '-' },
      { label: 'Model',           fn: d => d.model || '-' },
      { label: 'Serial Number',   fn: d => d.serialNumber || '-' },
      { label: 'Storage (GB)',    fn: d => d.totalStorageSpaceInBytes ? Math.round(d.totalStorageSpaceInBytes / 1073741824) : '-' },
      { label: 'Free Storage (GB)', fn: d => d.freeStorageSpaceInBytes ? Math.round(d.freeStorageSpaceInBytes / 1073741824) : '-' },
      { label: 'Enrolled',        fn: d => d.enrolledDateTime ? new Date(d.enrolledDateTime).toLocaleDateString() : '-' },
      { label: 'Last Sync',       fn: d => d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString() : '-' },
      { label: 'User',            fn: d => d.userPrincipalName || '-' },
      { label: 'Managed By',      fn: d => d.managementAgent || '-' },
      { label: 'Ownership',       fn: d => d.managedDeviceOwnerType || '-' },
      { label: 'Autopilot',       fn: d => d.autopilotEnrolled ? 'Yes' : 'No' },
      { label: 'Azure AD Device ID', fn: d => d.azureADDeviceId || '-' },
    ];

    return `
      <div class="card">
        <div class="card-header"><div class="card-header-title">Side-by-Side Comparison</div></div>
        <div class="card-body" style="overflow-x:auto;padding:0;">
          <table class="table">
            <thead><tr>
              <th style="min-width:160px;">Property</th>
              ${devices.map(d => `<th>${d.deviceName || 'Device'}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${fields.map(f => {
                const values = devices.map(d => f.fn(d));
                const allSame = values.every(v => v === values[0]);
                return `<tr style="${!allSame ? 'background:var(--warning-bg);' : ''}">
                  <td class="fw-500 text-sm">${f.label} ${!allSame ? '<span style="color:var(--warning);font-size:10px;" title="Values differ">&#9888;</span>' : ''}</td>
                  ${devices.map(d => {
                    const val = f.fn(d);
                    if (f.badge) {
                      return `<td><span class="badge badge-${f.badge(d)}">${val}</span></td>`;
                    }
                    return `<td class="text-sm">${val}</td>`;
                  }).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
