/* ============================================================
   Autopilot — Windows Autopilot devices and profile management
   ============================================================ */

const Autopilot = {
  _tab: 'devices',

  render() {
    const main = document.getElementById('mainContent');
    const devices = AppState.getForContext('autopilotDevices');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Windows Autopilot</h1>
          <p class="page-subtitle">${devices.length} Autopilot devices ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="Autopilot.showCreateProfile()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Profile
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Autopilot.exportHashes()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Hashes
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-3 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div class="stat-card-value">${devices.length}</div>
          <div class="stat-card-label">Total Autopilot Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-card-value">${devices.filter(d => d.deploymentProfileAssignmentStatus === 'assigned').length}</div>
          <div class="stat-card-label">Profile Assigned</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="stat-card-value">${devices.filter(d => d.deploymentProfileAssignmentStatus !== 'assigned').length}</div>
          <div class="stat-card-label">Pending Assignment</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:16px;">
        <div class="tab ${this._tab === 'devices' ? 'active' : ''}" onclick="Autopilot._tab='devices'; Autopilot.render();">Devices</div>
        <div class="tab ${this._tab === 'profiles' ? 'active' : ''}" onclick="Autopilot._tab='profiles'; Autopilot._loadProfiles();">Deployment Profiles</div>
      </div>

      <div id="autopilotContent"></div>
    `;

    if (this._tab === 'devices') this._renderDevices(devices, isAll);
  },

  _renderDevices(devices, isAll) {
    const container = document.getElementById('autopilotContent');
    if (!container) return;

    container.innerHTML = `
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search Autopilot devices..." oninput="Autopilot.filterTable(this.value, 'autopilotTable')">
            </div>
          </div>
        </div>
        <table class="table" id="autopilotTable">
          <thead>
            <tr>
              <th>Serial Number</th>
              ${isAll ? '<th>Tenant</th>' : ''}
              <th>Model</th>
              <th>Manufacturer</th>
              <th>Group Tag</th>
              <th>Profile Status</th>
              <th>Enrollment State</th>
            </tr>
          </thead>
          <tbody>
            ${devices.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">No Autopilot devices found.</td></tr>
            ` : devices.map(d => `
              <tr>
                <td class="text-mono fw-500">${d.serialNumber || '-'}</td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>` : ''}
                <td>${d.model || '-'}</td>
                <td>${d.manufacturer || '-'}</td>
                <td>${d.groupTag || '<span class="text-muted">-</span>'}</td>
                <td>${d.deploymentProfileAssignmentStatus === 'assigned' ?
                  '<span class="badge badge-success">Assigned</span>' :
                  '<span class="badge badge-warning">' + (d.deploymentProfileAssignmentStatus || 'Not Assigned') + '</span>'
                }</td>
                <td>${d.enrollmentState || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _loadProfiles() {
    const container = document.getElementById('autopilotContent');
    if (!container) return;
    container.innerHTML = '<div class="text-center text-muted" style="padding:3rem;">Loading deployment profiles...</div>';

    const tenant = AppState.get('activeTenant');
    if (tenant === 'all') {
      container.innerHTML = '<div class="text-center text-muted" style="padding:3rem;">Select a specific tenant to view deployment profiles.</div>';
      return;
    }

    try {
      const profiles = await Graph.getAutopilotProfiles(tenant);
      this._renderProfiles(profiles || [], tenant);
    } catch (err) {
      container.innerHTML = `<div class="text-center text-danger" style="padding:3rem;">Failed to load profiles: ${err.message}</div>`;
    }
  },

  _renderProfiles(profiles, tenantId) {
    const container = document.getElementById('autopilotContent');
    if (!container) return;

    if (profiles.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <h3 class="empty-state-title">No Deployment Profiles</h3>
            <p class="empty-state-text">Create a deployment profile to configure the out-of-box experience for Autopilot devices.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper animate-fade">
        <table class="table" id="profilesTable">
          <thead>
            <tr>
              <th>Profile Name</th>
              <th>Language</th>
              <th>Extract Hardware Hash</th>
              <th>OOBE Settings</th>
              <th style="width:80px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${profiles.map(p => {
              const oobe = p.outOfBoxExperienceSettings || {};
              const oobeFlags = [
                oobe.hidePrivacySettings ? 'Hide Privacy' : null,
                oobe.hideEULA ? 'Hide EULA' : null,
                oobe.skipKeyboardSelectionPage ? 'Skip Keyboard' : null,
                oobe.userType === 'standard' ? 'Standard User' : null
              ].filter(Boolean);
              return `
              <tr>
                <td>
                  <div class="fw-500">${p.displayName || 'Unnamed'}</div>
                  <div class="text-xs text-muted">${p.description || ''}</div>
                </td>
                <td>${p.language || 'OS default'}</td>
                <td>${p.extractHardwareHash ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-default">No</span>'}</td>
                <td>${oobeFlags.length > 0 ? oobeFlags.map(f => `<span class="badge badge-default" style="margin:2px;">${f}</span>`).join('') : '<span class="text-muted">Default</span>'}</td>
                <td>
                  <button class="btn btn-ghost btn-xs text-danger" onclick="Autopilot._deleteProfile('${tenantId}','${p.id}','${(p.displayName||'').replace(/'/g,"\\'")}')" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // --- Create Profile Wizard ---
  _profileState: {},

  showCreateProfile() {
    const tenant = AppState.get('activeTenant');
    if (tenant === 'all') { Toast.show('Select a specific tenant to create a profile', 'warning'); return; }

    this._profileState = {
      step: 1,
      tenantId: tenant,
      name: '',
      description: '',
      language: '',
      extractHardwareHash: true,
      hidePrivacy: true,
      hideEULA: true,
      skipKeyboard: false,
      userType: 'standard',
      deviceNameTemplate: '',
      convertToAutopilot: true,
      showEnrollmentStatus: true,
      blockDeviceUntilComplete: true,
      allowResetByUser: false,
      allowLogCollect: true,
      installTimeout: 60
    };
    this._renderProfileWizard();
  },

  _renderProfileWizard() {
    document.getElementById('autopilotProfileWizard')?.remove();
    const s = this._profileState;
    const overlay = document.createElement('div');
    overlay.id = 'autopilotProfileWizard';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);';

    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:12px;width:600px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:16px;">Create Deployment Profile — Step ${s.step} of 4</h3>
          <button onclick="document.getElementById('autopilotProfileWizard').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--ink-tertiary);">&times;</button>
        </div>
        <!-- Step indicators -->
        <div style="padding:12px 24px;display:flex;gap:6px;">
          ${['Basics', 'OOBE', 'Enrollment Status', 'Review'].map((label, i) => `
            <div style="flex:1;text-align:center;padding:6px;border-radius:6px;font-size:11px;font-weight:500;
              background:${i + 1 === s.step ? 'var(--primary)' : i + 1 < s.step ? 'var(--success)' : 'var(--gray-100)'};
              color:${i + 1 <= s.step ? 'white' : 'var(--ink-tertiary)'};">${label}</div>
          `).join('')}
        </div>
        <div style="padding:24px;" id="profileWizardBody"></div>
        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">
          ${s.step > 1 ? `<button class="btn btn-secondary btn-sm" onclick="Autopilot._profileBack()">Back</button>` : ''}
          ${s.step < 4
            ? `<button class="btn btn-primary btn-sm" onclick="Autopilot._profileNext()">Next</button>`
            : `<button class="btn btn-primary btn-sm" onclick="Autopilot._profileCreate()">Create Profile</button>`
          }
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._renderProfileStep();
  },

  _renderProfileStep() {
    const body = document.getElementById('profileWizardBody');
    if (!body) return;
    const s = this._profileState;

    if (s.step === 1) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label class="form-label">Profile Name *</label>
            <input type="text" class="form-input" value="${s.name}" oninput="Autopilot._profileState.name=this.value" placeholder="e.g. Standard Desktop Profile">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea class="form-input" rows="2" oninput="Autopilot._profileState.description=this.value" placeholder="Optional description">${s.description}</textarea>
          </div>
          <div>
            <label class="form-label">Language</label>
            <select class="form-input" onchange="Autopilot._profileState.language=this.value">
              <option value="" ${!s.language ? 'selected' : ''}>Operating System Default</option>
              <option value="en-US" ${s.language === 'en-US' ? 'selected' : ''}>English (United States)</option>
              <option value="en-GB" ${s.language === 'en-GB' ? 'selected' : ''}>English (United Kingdom)</option>
              <option value="en-AU" ${s.language === 'en-AU' ? 'selected' : ''}>English (Australia)</option>
              <option value="de-DE" ${s.language === 'de-DE' ? 'selected' : ''}>German</option>
              <option value="fr-FR" ${s.language === 'fr-FR' ? 'selected' : ''}>French</option>
              <option value="es-ES" ${s.language === 'es-ES' ? 'selected' : ''}>Spanish</option>
              <option value="nl-NL" ${s.language === 'nl-NL' ? 'selected' : ''}>Dutch</option>
              <option value="ja-JP" ${s.language === 'ja-JP' ? 'selected' : ''}>Japanese</option>
            </select>
          </div>
          <div>
            <label class="form-label">Device Name Template</label>
            <input type="text" class="form-input" value="${s.deviceNameTemplate}" oninput="Autopilot._profileState.deviceNameTemplate=this.value" placeholder="e.g. CORP-%SERIAL%">
            <div class="text-xs text-muted" style="margin-top:4px;">Use %SERIAL% or %RAND:x% for dynamic naming. Leave empty for default.</div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" ${s.extractHardwareHash ? 'checked' : ''} onchange="Autopilot._profileState.extractHardwareHash=this.checked">
            <span class="text-sm">Extract hardware hash (convert all targeted devices to Autopilot)</span>
          </label>
        </div>
      `;
    } else if (s.step === 2) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <h4 style="margin:0;">Out-of-Box Experience (OOBE)</h4>
          <div>
            <label class="form-label">User Account Type</label>
            <select class="form-input" onchange="Autopilot._profileState.userType=this.value">
              <option value="standard" ${s.userType === 'standard' ? 'selected' : ''}>Standard User</option>
              <option value="administrator" ${s.userType === 'administrator' ? 'selected' : ''}>Administrator</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" ${s.hidePrivacy ? 'checked' : ''} onchange="Autopilot._profileState.hidePrivacy=this.checked">
              <span class="text-sm">Hide privacy settings</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" ${s.hideEULA ? 'checked' : ''} onchange="Autopilot._profileState.hideEULA=this.checked">
              <span class="text-sm">Hide EULA / license terms</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" ${s.skipKeyboard ? 'checked' : ''} onchange="Autopilot._profileState.skipKeyboard=this.checked">
              <span class="text-sm">Skip keyboard selection page</span>
            </label>
          </div>
        </div>
      `;
    } else if (s.step === 3) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <h4 style="margin:0;">Enrollment Status Page</h4>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" ${s.showEnrollmentStatus ? 'checked' : ''} onchange="Autopilot._profileState.showEnrollmentStatus=this.checked; Autopilot._renderProfileStep();">
            <span class="text-sm fw-500">Show enrollment status page</span>
          </label>
          ${s.showEnrollmentStatus ? `
            <div style="padding-left:24px;display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--border);">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" ${s.blockDeviceUntilComplete ? 'checked' : ''} onchange="Autopilot._profileState.blockDeviceUntilComplete=this.checked">
                <span class="text-sm">Block device use until all apps and profiles are installed</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" ${s.allowResetByUser ? 'checked' : ''} onchange="Autopilot._profileState.allowResetByUser=this.checked">
                <span class="text-sm">Allow user to reset device if installation error occurs</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" ${s.allowLogCollect ? 'checked' : ''} onchange="Autopilot._profileState.allowLogCollect=this.checked">
                <span class="text-sm">Allow log collection on installation error</span>
              </label>
              <div>
                <label class="form-label">Installation timeout (minutes)</label>
                <input type="number" class="form-input" value="${s.installTimeout}" min="15" max="120" oninput="Autopilot._profileState.installTimeout=parseInt(this.value)||60" style="width:120px;">
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (s.step === 4) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <h4 style="margin:0;">Review Profile</h4>
          <div class="card" style="padding:16px;">
            <div style="display:grid;grid-template-columns:160px 1fr;gap:8px;font-size:13px;">
              <span class="text-muted">Name:</span><span class="fw-500">${s.name}</span>
              ${s.description ? `<span class="text-muted">Description:</span><span>${s.description}</span>` : ''}
              <span class="text-muted">Language:</span><span>${s.language || 'OS Default'}</span>
              ${s.deviceNameTemplate ? `<span class="text-muted">Name Template:</span><span class="text-mono">${s.deviceNameTemplate}</span>` : ''}
              <span class="text-muted">Extract HW Hash:</span><span>${s.extractHardwareHash ? 'Yes' : 'No'}</span>
              <span class="text-muted">User Type:</span><span>${s.userType === 'standard' ? 'Standard' : 'Administrator'}</span>
              <span class="text-muted">Hide Privacy:</span><span>${s.hidePrivacy ? 'Yes' : 'No'}</span>
              <span class="text-muted">Hide EULA:</span><span>${s.hideEULA ? 'Yes' : 'No'}</span>
              <span class="text-muted">Skip Keyboard:</span><span>${s.skipKeyboard ? 'Yes' : 'No'}</span>
              <span class="text-muted">Enrollment Status:</span><span>${s.showEnrollmentStatus ? 'Shown' : 'Hidden'}</span>
              ${s.showEnrollmentStatus ? `
                <span class="text-muted">Block Until Complete:</span><span>${s.blockDeviceUntilComplete ? 'Yes' : 'No'}</span>
                <span class="text-muted">Install Timeout:</span><span>${s.installTimeout} min</span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  },

  _profileBack() { this._profileState.step--; this._renderProfileWizard(); },

  _profileNext() {
    const s = this._profileState;
    if (s.step === 1 && !s.name.trim()) { Toast.show('Profile name is required', 'warning'); return; }
    s.step++;
    this._renderProfileWizard();
  },

  async _profileCreate() {
    const s = this._profileState;
    const payload = {
      '@odata.type': '#microsoft.graph.azureADWindowsAutopilotDeploymentProfile',
      displayName: s.name.trim(),
      description: s.description.trim() || undefined,
      language: s.language || undefined,
      extractHardwareHash: s.extractHardwareHash,
      deviceNameTemplate: s.deviceNameTemplate || undefined,
      outOfBoxExperienceSettings: {
        '@odata.type': 'microsoft.graph.outOfBoxExperienceSettings',
        hidePrivacySettings: s.hidePrivacy,
        hideEULA: s.hideEULA,
        skipKeyboardSelectionPage: s.skipKeyboard,
        userType: s.userType,
        deviceUsageType: 'shared'
      },
      enrollmentStatusScreenSettings: {
        '@odata.type': 'microsoft.graph.windowsEnrollmentStatusScreenSettings',
        hideInstallationProgress: !s.showEnrollmentStatus,
        allowDeviceUseBeforeProfileAndAppInstallComplete: !s.blockDeviceUntilComplete,
        allowDeviceUseOnInstallFailure: s.allowResetByUser,
        allowLogCollectionOnInstallFailure: s.allowLogCollect,
        installProgressTimeoutInMinutes: s.installTimeout
      }
    };

    try {
      Toast.show('Creating deployment profile...', 'info');
      await Graph.createAutopilotProfile(s.tenantId, payload);
      document.getElementById('autopilotProfileWizard')?.remove();
      Toast.show(`Profile "${s.name}" created successfully`, 'success');
      AuditLog.log('Create Autopilot Profile', `Created profile "${s.name}"`, AppState.getTenantName(s.tenantId));
      this._tab = 'profiles';
      this.render();
      this._loadProfiles();
    } catch (err) {
      Toast.show(`Failed to create profile: ${err.message}`, 'error');
    }
  },

  async _deleteProfile(tenantId, profileId, profileName) {
    if (typeof Confirm !== 'undefined') {
      const ok = await Confirm.show({ title: 'Delete Profile', message: `Delete deployment profile <strong>${profileName}</strong>?`, confirmText: 'Delete', type: 'danger' });
      if (!ok) return;
    } else if (!confirm(`Delete "${profileName}"?`)) return;

    try {
      await Graph.deleteAutopilotProfile(tenantId, profileId);
      Toast.show(`Profile "${profileName}" deleted`, 'success');
      AuditLog.log('Delete Autopilot Profile', `Deleted profile "${profileName}"`, AppState.getTenantName(tenantId));
      this._loadProfiles();
    } catch (err) {
      Toast.show(`Failed to delete profile: ${err.message}`, 'error');
    }
  },

  filterTable(term, tableId) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  exportHashes() {
    const devices = AppState.getForContext('autopilotDevices');
    if (!devices.length) { Toast.show('No Autopilot devices to export', 'warning'); return; }

    const headers = ['Serial Number','Manufacturer','Model','Group Tag','Hardware Hash','Tenant'];
    const rows = devices.map(d => [
      d.serialNumber, d.manufacturer, d.model, d.groupTag,
      d.hardwareIdentifier || '', AppState.getTenantName(d._tenantId)
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `autopilot-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Toast.show('Autopilot data exported', 'success');
    AuditLog.log('Export Autopilot Hashes', `Exported ${devices.length} device hashes`);
  }
};
