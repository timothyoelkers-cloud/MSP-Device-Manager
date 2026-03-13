/* ============================================================
   Compliance — Compliance policies view/assign/create wizard
   ============================================================ */

const Compliance = {

  /* ----------------------------------------------------------
     Wizard state — local to this module
     ---------------------------------------------------------- */
  wizardState: {
    open: false,
    step: 1,
    platform: '',        // 'windows' | 'ios' | 'macos' | 'android'
    settings: {},
    name: '',
    description: '',
    assignedGroups: []   // array of group ids
  },

  /* ----------------------------------------------------------
     Platform metadata
     ---------------------------------------------------------- */
  platforms: {
    windows: {
      label: 'Windows 10+',
      odataType: '#microsoft.graph.windows10CompliancePolicy',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>`,
      defaults: {
        osMinimumVersion: '',
        bitLockerEnabled: false,
        secureBootEnabled: false,
        tpmRequired: false,
        antivirusRequired: false,
        passwordRequired: false,
        passwordMinimumLength: 8,
        passwordRequiredType: 'deviceDefault',
        firewallEnabled: false
      }
    },
    ios: {
      label: 'iOS / iPadOS',
      odataType: '#microsoft.graph.iosCompliancePolicy',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      defaults: {
        osMinimumVersion: '',
        passcodeRequired: false,
        passcodeMinutesOfInactivityBeforeLock: 5,
        securityBlockJailbrokenDevices: false
      }
    },
    macos: {
      label: 'macOS',
      odataType: '#microsoft.graph.macOSCompliancePolicy',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      defaults: {
        osMinimumVersion: '',
        storageRequireEncryption: false,
        systemIntegrityProtectionEnabled: false
      }
    },
    android: {
      label: 'Android Enterprise',
      odataType: '#microsoft.graph.androidCompliancePolicy',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      defaults: {
        osMinimumVersion: '',
        passwordRequired: false,
        securityRequireSafetyNetAttestationBasicIntegrity: false,
        storageRequireEncryption: false
      }
    }
  },

  /* ----------------------------------------------------------
     Main render
     ---------------------------------------------------------- */
  render() {
    const main = document.getElementById('mainContent');
    const policies = AppState.getForContext('compliancePolicies');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Compliance Policies</h1>
          <p class="page-subtitle">${policies.length} compliance polic${policies.length === 1 ? 'y' : 'ies'} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Compliance.openWizard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Policy
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-3 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="stat-card-value">${policies.length}</div>
          <div class="stat-card-label">Total Policies</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-card-value">${this.getDeviceCompliance().compliant}</div>
          <div class="stat-card-label">Compliant Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="stat-card-value">${this.getDeviceCompliance().nonCompliant}</div>
          <div class="stat-card-label">Non-Compliant Devices</div>
        </div>
      </div>

      <!-- Policies Table -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search policies..." oninput="Compliance.filterTable(this.value)">
            </div>
          </div>
        </div>
        <table class="table" id="complianceTable">
          <thead>
            <tr>
              <th>Policy Name</th>
              ${isAll ? '<th>Tenant</th>' : ''}
              <th>Platform</th>
              <th>Assignments</th>
              <th>Created</th>
              <th>Last Modified</th>
              <th style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${policies.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">No compliance policies found. Connect a tenant to view policies.</td></tr>
            ` : policies.map(p => this.renderPolicyRow(p, isAll)).join('')}
          </tbody>
        </table>
      </div>

      <!-- Modal container -->
      <div id="complianceModalContainer"></div>
    `;
  },

  /* ----------------------------------------------------------
     Render a single policy table row
     ---------------------------------------------------------- */
  renderPolicyRow(p, isAll) {
    const platform = this.getPlatform(p);
    const platformKey = this.getPlatformKey(p);
    const platformMeta = this.platforms[platformKey];
    const assignmentCount = (p.assignments && p.assignments.length) || 0;

    return `
      <tr>
        <td>
          <div class="flex items-center gap-2">
            <span style="color:var(--primary);display:flex;">${platformMeta ? platformMeta.icon : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'}</span>
            <div>
              <div class="fw-500">${p.displayName || 'Unnamed Policy'}</div>
              <div class="text-xs text-muted">${p.description || ''}</div>
            </div>
          </div>
        </td>
        ${isAll ? `<td><span class="chip">${AppState.getTenantName(p._tenantId)}</span></td>` : ''}
        <td><span class="badge badge-default">${platform}</span></td>
        <td>
          <span class="badge ${assignmentCount > 0 ? 'badge-blue' : 'badge-default'}">
            ${assignmentCount} group${assignmentCount !== 1 ? 's' : ''}
          </span>
        </td>
        <td class="text-sm">${Devices.formatDate(p.createdDateTime)}</td>
        <td class="text-sm">${Devices.formatDate(p.lastModifiedDateTime)}</td>
        <td>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost btn-icon" title="View details" onclick="Compliance.viewPolicy('${p._tenantId}','${p.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon" title="Assign to groups" onclick="Compliance.openAssignModal('${p._tenantId}','${p.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon" title="Delete policy" onclick="Compliance.confirmDelete('${p._tenantId}','${p.id}','${(p.displayName || 'Unnamed Policy').replace(/'/g, "\\'")}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  /* ----------------------------------------------------------
     Helpers
     ---------------------------------------------------------- */
  getPlatform(policy) {
    const type = policy['@odata.type'] || '';
    if (type.includes('windows')) return 'Windows';
    if (type.includes('ios')) return 'iOS';
    if (type.includes('macOS') || type.includes('macos')) return 'macOS';
    if (type.includes('android')) return 'Android';
    return 'All';
  },

  getPlatformKey(policy) {
    const type = policy['@odata.type'] || '';
    if (type.includes('windows')) return 'windows';
    if (type.includes('ios')) return 'ios';
    if (type.includes('macOS') || type.includes('macos')) return 'macos';
    if (type.includes('android')) return 'android';
    return 'windows';
  },

  getDeviceCompliance() {
    const devices = AppState.getDevicesForContext();
    return {
      compliant: devices.filter(d => d.complianceState === 'compliant').length,
      nonCompliant: devices.filter(d => d.complianceState === 'noncompliant').length
    };
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#complianceTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  /* ----------------------------------------------------------
     Policy Detail Modal
     ---------------------------------------------------------- */
  viewPolicy(tenantId, policyId) {
    const policies = AppState.getForContext('compliancePolicies');
    const policy = policies.find(p => p.id === policyId && p._tenantId === tenantId);
    if (!policy) { Toast.show('Policy not found', 'error'); return; }

    const platform = this.getPlatform(policy);
    const settingsHtml = this.renderPolicySettings(policy);

    const container = document.getElementById('complianceModalContainer');
    container.innerHTML = `
      <div class="modal-overlay" onclick="Compliance.closeModal()">
        <div class="modal" onclick="event.stopPropagation()" style="max-width:600px;">
          <div class="modal-header">
            <h3>Policy Details</h3>
            <button class="btn btn-ghost btn-icon" onclick="Compliance.closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <div class="form-label">Name</div>
              <div class="fw-500">${policy.displayName || 'Unnamed Policy'}</div>
            </div>
            <div class="form-group">
              <div class="form-label">Description</div>
              <div class="text-muted">${policy.description || 'No description'}</div>
            </div>
            <div class="form-group">
              <div class="form-label">Platform</div>
              <span class="badge badge-default">${platform}</span>
            </div>
            <div class="form-group">
              <div class="form-label">Created</div>
              <div class="text-sm">${Devices.formatDate(policy.createdDateTime)}</div>
            </div>
            <div class="form-group">
              <div class="form-label">Last Modified</div>
              <div class="text-sm">${Devices.formatDate(policy.lastModifiedDateTime)}</div>
            </div>
            <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0;">
            <div class="form-label" style="margin-bottom:0.75rem;">Compliance Settings</div>
            ${settingsHtml}
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="Compliance.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="Compliance.closeModal();Compliance.openAssignModal('${tenantId}','${policyId}')">Assign to Groups</button>
          </div>
        </div>
      </div>
    `;
  },

  renderPolicySettings(policy) {
    const skip = new Set(['id', 'displayName', 'description', 'createdDateTime', 'lastModifiedDateTime',
      '@odata.type', '_tenantId', 'assignments', 'version', 'roleScopeTagIds',
      'scheduledActionsForRule', '@odata.context']);
    const entries = Object.entries(policy).filter(([k]) => !skip.has(k));

    if (entries.length === 0) return '<div class="text-muted text-sm">No settings data available.</div>';

    return `<div class="table-wrapper" style="max-height:300px;overflow-y:auto;">
      <table class="table" style="font-size:0.85rem;">
        <thead><tr><th>Setting</th><th>Value</th></tr></thead>
        <tbody>
          ${entries.map(([key, val]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
            let display = val;
            if (typeof val === 'boolean') {
              display = val
                ? '<span class="badge badge-green">Enabled</span>'
                : '<span class="badge badge-default">Disabled</span>';
            } else if (val === null || val === undefined || val === '') {
              display = '<span class="text-muted">Not set</span>';
            } else if (typeof val === 'object') {
              display = '<span class="text-muted">' + JSON.stringify(val) + '</span>';
            }
            return `<tr><td class="fw-500">${label}</td><td>${display}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  },

  /* ----------------------------------------------------------
     Close any open modal
     ---------------------------------------------------------- */
  closeModal() {
    const container = document.getElementById('complianceModalContainer');
    if (container) container.innerHTML = '';
  },

  /* ----------------------------------------------------------
     Assign to Groups Modal
     ---------------------------------------------------------- */
  openAssignModal(tenantId, policyId) {
    const policies = AppState.getForContext('compliancePolicies');
    const policy = policies.find(p => p.id === policyId && p._tenantId === tenantId);
    if (!policy) { Toast.show('Policy not found', 'error'); return; }

    const groups = AppState.getForContext('groups') || [];
    const currentAssignments = (policy.assignments || []).map(a =>
      (a.target && a.target.groupId) || ''
    ).filter(Boolean);

    const container = document.getElementById('complianceModalContainer');
    container.innerHTML = `
      <div class="modal-overlay" onclick="Compliance.closeModal()">
        <div class="modal" onclick="event.stopPropagation()" style="max-width:500px;">
          <div class="modal-header">
            <h3>Assign Policy to Groups</h3>
            <button class="btn btn-ghost btn-icon" onclick="Compliance.closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-muted" style="margin-bottom:1rem;">Assigning: <strong>${policy.displayName || 'Unnamed Policy'}</strong></p>
            ${groups.length === 0
              ? '<p class="text-muted">No groups available. Ensure groups are synced for this tenant.</p>'
              : `<div style="max-height:320px;overflow-y:auto;">
                  ${groups.map(g => `
                    <label class="flex items-center gap-2" style="padding:0.5rem 0;cursor:pointer;">
                      <input type="checkbox" class="assign-group-cb" value="${g.id}"
                        ${currentAssignments.includes(g.id) ? 'checked' : ''} />
                      <div>
                        <div class="fw-500 text-sm">${g.displayName || g.id}</div>
                        ${g.description ? `<div class="text-xs text-muted">${g.description}</div>` : ''}
                      </div>
                    </label>
                  `).join('')}
                </div>`
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="Compliance.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Compliance.saveAssignments('${tenantId}','${policyId}')">
              Save Assignments
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async saveAssignments(tenantId, policyId) {
    const checkboxes = document.querySelectorAll('.assign-group-cb:checked');
    const groupIds = Array.from(checkboxes).map(cb => cb.value);

    try {
      await Graph.assignPolicy(tenantId, policyId, groupIds);
      Toast.show('Policy assignments updated successfully', 'success');
      this.closeModal();
      this.render();
    } catch (e) {
      Toast.show('Failed to update assignments: ' + (e.message || e), 'error');
    }
  },

  /* ----------------------------------------------------------
     Delete Policy
     ---------------------------------------------------------- */
  confirmDelete(tenantId, policyId, policyName) {
    const container = document.getElementById('complianceModalContainer');
    container.innerHTML = `
      <div class="modal-overlay" onclick="Compliance.closeModal()">
        <div class="modal" onclick="event.stopPropagation()" style="max-width:440px;">
          <div class="modal-header">
            <h3>Delete Policy</h3>
            <button class="btn btn-ghost btn-icon" onclick="Compliance.closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete <strong>${policyName}</strong>?</p>
            <p class="text-sm text-muted" style="margin-top:0.5rem;">This action cannot be undone. All group assignments for this policy will also be removed.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="Compliance.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="Compliance.deletePolicy('${tenantId}','${policyId}')">Delete Policy</button>
          </div>
        </div>
      </div>
    `;
  },

  async deletePolicy(tenantId, policyId) {
    try {
      await Graph.deletePolicy(tenantId, policyId);
      Toast.show('Policy deleted successfully', 'success');
      this.closeModal();
      this.render();
    } catch (e) {
      Toast.show('Failed to delete policy: ' + (e.message || e), 'error');
    }
  },

  /* ==========================================================
     POLICY CREATION WIZARD
     ========================================================== */

  openWizard() {
    this.wizardState = {
      open: true,
      step: 1,
      platform: '',
      settings: {},
      name: '',
      description: '',
      assignedGroups: []
    };
    this.renderWizard();
  },

  closeWizard() {
    this.wizardState.open = false;
    this.closeModal();
  },

  wizardGoTo(step) {
    this.wizardState.step = step;
    this.renderWizard();
  },

  wizardNext() {
    const ws = this.wizardState;
    if (ws.step === 1 && !ws.platform) {
      Toast.show('Please select a platform', 'warning');
      return;
    }
    if (ws.step === 3 && !ws.name.trim()) {
      Toast.show('Please enter a policy name', 'warning');
      return;
    }
    this.wizardSaveCurrentStep();
    ws.step = Math.min(ws.step + 1, 4);
    this.renderWizard();
  },

  wizardBack() {
    this.wizardSaveCurrentStep();
    this.wizardState.step = Math.max(this.wizardState.step - 1, 1);
    this.renderWizard();
  },

  /* Save form data from the currently visible step */
  wizardSaveCurrentStep() {
    const ws = this.wizardState;

    if (ws.step === 2) {
      ws.settings = this.readSettingsFromForm();
    }

    if (ws.step === 3) {
      const nameInput = document.getElementById('wizPolicyName');
      const descInput = document.getElementById('wizPolicyDesc');
      if (nameInput) ws.name = nameInput.value;
      if (descInput) ws.description = descInput.value;

      const groupCbs = document.querySelectorAll('.wiz-group-cb:checked');
      ws.assignedGroups = Array.from(groupCbs).map(cb => cb.value);
    }
  },

  /* ----------------------------------------------------------
     Read settings inputs for current platform
     ---------------------------------------------------------- */
  readSettingsFromForm() {
    const ws = this.wizardState;
    const settings = {};

    if (ws.platform === 'windows') {
      settings.osMinimumVersion = (document.getElementById('ws_osMin') || {}).value || '';
      settings.bitLockerEnabled = !!(document.getElementById('ws_bitlocker') || {}).checked;
      settings.secureBootEnabled = !!(document.getElementById('ws_secureboot') || {}).checked;
      settings.tpmRequired = !!(document.getElementById('ws_tpm') || {}).checked;
      settings.antivirusRequired = !!(document.getElementById('ws_antivirus') || {}).checked;
      settings.passwordRequired = !!(document.getElementById('ws_password') || {}).checked;
      settings.passwordMinimumLength = parseInt((document.getElementById('ws_pwdlen') || {}).value, 10) || 8;
      settings.passwordRequiredType = (document.getElementById('ws_pwdtype') || {}).value || 'deviceDefault';
      settings.firewallEnabled = !!(document.getElementById('ws_firewall') || {}).checked;
    } else if (ws.platform === 'ios') {
      settings.osMinimumVersion = (document.getElementById('ios_osMin') || {}).value || '';
      settings.passcodeRequired = !!(document.getElementById('ios_passcode') || {}).checked;
      settings.passcodeMinutesOfInactivityBeforeLock = parseInt((document.getElementById('ios_inactivity') || {}).value, 10) || 5;
      settings.securityBlockJailbrokenDevices = !!(document.getElementById('ios_jailbreak') || {}).checked;
    } else if (ws.platform === 'macos') {
      settings.osMinimumVersion = (document.getElementById('mac_osMin') || {}).value || '';
      settings.storageRequireEncryption = !!(document.getElementById('mac_filevault') || {}).checked;
      settings.systemIntegrityProtectionEnabled = !!(document.getElementById('mac_sip') || {}).checked;
    } else if (ws.platform === 'android') {
      settings.osMinimumVersion = (document.getElementById('and_osMin') || {}).value || '';
      settings.passwordRequired = !!(document.getElementById('and_password') || {}).checked;
      settings.securityRequireSafetyNetAttestationBasicIntegrity = !!(document.getElementById('and_safetynet') || {}).checked;
      settings.storageRequireEncryption = !!(document.getElementById('and_encryption') || {}).checked;
    }

    return settings;
  },

  /* ----------------------------------------------------------
     Render the wizard modal
     ---------------------------------------------------------- */
  renderWizard() {
    const ws = this.wizardState;
    const steps = ['Platform', 'Settings', 'Name & Assign', 'Review & Create'];

    const container = document.getElementById('complianceModalContainer');
    container.innerHTML = `
      <div class="modal-overlay" onclick="Compliance.closeWizard()">
        <div class="modal" onclick="event.stopPropagation()" style="max-width:640px;">
          <div class="modal-header">
            <h3>Create Compliance Policy</h3>
            <button class="btn btn-ghost btn-icon" onclick="Compliance.closeWizard()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Step indicators -->
          <div class="tabs tabs--underline" style="padding:0 1.5rem;">
            ${steps.map((s, i) => `
              <button class="tab ${ws.step === i + 1 ? 'active' : ''}" ${i + 1 < ws.step ? `onclick="Compliance.wizardGoTo(${i + 1})"` : ''} style="pointer-events:${i + 1 < ws.step ? 'auto' : 'none'};">
                <span class="badge ${ws.step === i + 1 ? 'badge-blue' : (i + 1 < ws.step ? 'badge-green' : 'badge-default')}" style="margin-right:0.35rem;">${i + 1}</span>
                ${s}
              </button>
            `).join('')}
          </div>

          <div class="modal-body" style="min-height:280px;">
            ${ws.step === 1 ? this.renderWizardStep1() : ''}
            ${ws.step === 2 ? this.renderWizardStep2() : ''}
            ${ws.step === 3 ? this.renderWizardStep3() : ''}
            ${ws.step === 4 ? this.renderWizardStep4() : ''}
          </div>

          <div class="modal-footer">
            ${ws.step > 1 ? '<button class="btn btn-ghost" onclick="Compliance.wizardBack()">Back</button>' : '<button class="btn btn-ghost" onclick="Compliance.closeWizard()">Cancel</button>'}
            ${ws.step < 4
              ? '<button class="btn btn-primary" onclick="Compliance.wizardNext()">Next</button>'
              : '<button class="btn btn-primary" id="wizCreateBtn" onclick="Compliance.wizardCreate()">Create Policy</button>'
            }
          </div>
        </div>
      </div>
    `;
  },

  /* -- Step 1: Platform Selection -- */
  renderWizardStep1() {
    const ws = this.wizardState;
    return `
      <p class="text-sm text-muted" style="margin-bottom:1rem;">Choose the target platform for this compliance policy.</p>
      <div class="grid grid-2 gap-4">
        ${Object.entries(this.platforms).map(([key, meta]) => `
          <label class="stat-card" style="cursor:pointer;border:2px solid ${ws.platform === key ? 'var(--primary)' : 'var(--border)'};transition:border-color 0.15s;" onclick="Compliance.wizardSelectPlatform('${key}')">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span style="color:${ws.platform === key ? 'var(--primary)' : 'var(--text-muted)'};">${meta.icon}</span>
              <div>
                <div class="fw-500">${meta.label}</div>
                <div class="text-xs text-muted">${key === 'windows' ? 'Desktop & laptop' : key === 'ios' ? 'iPhone & iPad' : key === 'macos' ? 'Mac devices' : 'Android work profile'}</div>
              </div>
            </div>
            <input type="radio" name="wizPlatform" value="${key}" ${ws.platform === key ? 'checked' : ''} style="position:absolute;opacity:0;">
          </label>
        `).join('')}
      </div>
    `;
  },

  wizardSelectPlatform(key) {
    const ws = this.wizardState;
    if (ws.platform !== key) {
      ws.platform = key;
      ws.settings = { ...this.platforms[key].defaults };
    }
    this.renderWizard();
  },

  /* -- Step 2: Settings -- */
  renderWizardStep2() {
    const ws = this.wizardState;
    const s = ws.settings;

    if (ws.platform === 'windows') return this.renderWindowsSettings(s);
    if (ws.platform === 'ios') return this.renderIosSettings(s);
    if (ws.platform === 'macos') return this.renderMacosSettings(s);
    if (ws.platform === 'android') return this.renderAndroidSettings(s);
    return '<p class="text-muted">No platform selected.</p>';
  },

  renderWindowsSettings(s) {
    return `
      <p class="text-sm text-muted" style="margin-bottom:1rem;">Configure Windows 10+ compliance settings.</p>
      <div class="form-group">
        <label class="form-label" for="ws_osMin">Minimum OS Version</label>
        <input class="form-input" id="ws_osMin" type="text" placeholder="e.g. 10.0.19041" value="${s.osMinimumVersion || ''}">
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ws_bitlocker" ${s.bitLockerEnabled ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require BitLocker</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ws_secureboot" ${s.secureBootEnabled ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Secure Boot</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ws_tpm" ${s.tpmRequired ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require TPM</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ws_antivirus" ${s.antivirusRequired ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Antivirus</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ws_firewall" ${s.firewallEnabled ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Firewall</span>
        </label>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:0.75rem 0;">
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ws_password" ${s.passwordRequired ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Password</span>
        </label>
      </div>
      <div class="grid grid-2 gap-4">
        <div class="form-group">
          <label class="form-label" for="ws_pwdlen">Minimum Password Length</label>
          <input class="form-input" id="ws_pwdlen" type="number" min="4" max="16" value="${s.passwordMinimumLength || 8}">
        </div>
        <div class="form-group">
          <label class="form-label" for="ws_pwdtype">Password Complexity</label>
          <select class="form-select" id="ws_pwdtype">
            <option value="deviceDefault" ${s.passwordRequiredType === 'deviceDefault' ? 'selected' : ''}>Device Default</option>
            <option value="alphanumeric" ${s.passwordRequiredType === 'alphanumeric' ? 'selected' : ''}>Alphanumeric</option>
            <option value="numeric" ${s.passwordRequiredType === 'numeric' ? 'selected' : ''}>Numeric</option>
          </select>
        </div>
      </div>
    `;
  },

  renderIosSettings(s) {
    return `
      <p class="text-sm text-muted" style="margin-bottom:1rem;">Configure iOS / iPadOS compliance settings.</p>
      <div class="form-group">
        <label class="form-label" for="ios_osMin">Minimum OS Version</label>
        <input class="form-input" id="ios_osMin" type="text" placeholder="e.g. 16.0" value="${s.osMinimumVersion || ''}">
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ios_passcode" ${s.passcodeRequired ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Device Lock (Passcode)</span>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label" for="ios_inactivity">Max Minutes of Inactivity Before Lock</label>
        <input class="form-input" id="ios_inactivity" type="number" min="1" max="60" value="${s.passcodeMinutesOfInactivityBeforeLock || 5}">
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="ios_jailbreak" ${s.securityBlockJailbrokenDevices ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Block Jailbroken Devices</span>
        </label>
      </div>
    `;
  },

  renderMacosSettings(s) {
    return `
      <p class="text-sm text-muted" style="margin-bottom:1rem;">Configure macOS compliance settings.</p>
      <div class="form-group">
        <label class="form-label" for="mac_osMin">Minimum OS Version</label>
        <input class="form-input" id="mac_osMin" type="text" placeholder="e.g. 13.0" value="${s.osMinimumVersion || ''}">
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="mac_filevault" ${s.storageRequireEncryption ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require FileVault Encryption</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="mac_sip" ${s.systemIntegrityProtectionEnabled ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require System Integrity Protection</span>
        </label>
      </div>
    `;
  },

  renderAndroidSettings(s) {
    return `
      <p class="text-sm text-muted" style="margin-bottom:1rem;">Configure Android Enterprise compliance settings.</p>
      <div class="form-group">
        <label class="form-label" for="and_osMin">Minimum OS Version</label>
        <input class="form-input" id="and_osMin" type="text" placeholder="e.g. 12.0" value="${s.osMinimumVersion || ''}">
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="and_password" ${s.passwordRequired ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Device Lock (Password)</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="and_safetynet" ${s.securityRequireSafetyNetAttestationBasicIntegrity ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require SafetyNet Attestation</span>
        </label>
      </div>
      <div class="form-group">
        <label class="flex items-center gap-2" style="cursor:pointer;">
          <input type="checkbox" id="and_encryption" ${s.storageRequireEncryption ? 'checked' : ''}>
          <span class="form-label" style="margin:0;">Require Device Encryption</span>
        </label>
      </div>
    `;
  },

  /* -- Step 3: Name, Description & Group Assignment -- */
  renderWizardStep3() {
    const ws = this.wizardState;
    const groups = AppState.getForContext('groups') || [];

    return `
      <div class="form-group">
        <label class="form-label" for="wizPolicyName">Policy Name <span style="color:var(--danger);">*</span></label>
        <input class="form-input" id="wizPolicyName" type="text" placeholder="e.g. Windows 10 - Baseline Compliance" value="${ws.name}">
      </div>
      <div class="form-group">
        <label class="form-label" for="wizPolicyDesc">Description</label>
        <textarea class="form-input" id="wizPolicyDesc" rows="2" placeholder="Optional description...">${ws.description}</textarea>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:0.75rem 0;">
      <div class="form-label" style="margin-bottom:0.5rem;">Assign to Groups (optional)</div>
      ${groups.length === 0
        ? '<p class="text-sm text-muted">No groups available.</p>'
        : `<div style="max-height:200px;overflow-y:auto;">
            ${groups.map(g => `
              <label class="flex items-center gap-2" style="padding:0.4rem 0;cursor:pointer;">
                <input type="checkbox" class="wiz-group-cb" value="${g.id}"
                  ${ws.assignedGroups.includes(g.id) ? 'checked' : ''} />
                <span class="text-sm fw-500">${g.displayName || g.id}</span>
              </label>
            `).join('')}
          </div>`
      }
    `;
  },

  /* -- Step 4: Review & Create -- */
  renderWizardStep4() {
    const ws = this.wizardState;
    const meta = this.platforms[ws.platform];
    const groups = AppState.getForContext('groups') || [];
    const selectedGroups = groups.filter(g => ws.assignedGroups.includes(g.id));

    const settingEntries = Object.entries(ws.settings).filter(([, v]) => v !== '' && v !== false && v !== null && v !== undefined);

    return `
      <p class="text-sm text-muted" style="margin-bottom:1rem;">Review your policy before creating it.</p>

      <div class="form-group">
        <div class="form-label">Platform</div>
        <div class="flex items-center gap-2">
          <span style="color:var(--primary);">${meta.icon}</span>
          <span class="fw-500">${meta.label}</span>
        </div>
      </div>

      <div class="form-group">
        <div class="form-label">Policy Name</div>
        <div class="fw-500">${ws.name}</div>
      </div>

      ${ws.description ? `
        <div class="form-group">
          <div class="form-label">Description</div>
          <div class="text-sm">${ws.description}</div>
        </div>
      ` : ''}

      <div class="form-group">
        <div class="form-label">Compliance Settings</div>
        ${settingEntries.length === 0
          ? '<span class="text-sm text-muted">All settings at default (no restrictions).</span>'
          : `<table class="table" style="font-size:0.85rem;">
              <tbody>
                ${settingEntries.map(([key, val]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                  let display = val;
                  if (typeof val === 'boolean') display = '<span class="badge badge-green">Enabled</span>';
                  return `<tr><td class="fw-500">${label}</td><td>${display}</td></tr>`;
                }).join('')}
              </tbody>
            </table>`
        }
      </div>

      <div class="form-group">
        <div class="form-label">Group Assignments</div>
        ${selectedGroups.length === 0
          ? '<span class="text-sm text-muted">No groups assigned. You can assign groups later.</span>'
          : selectedGroups.map(g => `<span class="chip" style="margin-right:0.35rem;">${g.displayName || g.id}</span>`).join('')
        }
      </div>
    `;
  },

  /* ----------------------------------------------------------
     Create the policy via Graph API
     ---------------------------------------------------------- */
  async wizardCreate() {
    const ws = this.wizardState;
    const meta = this.platforms[ws.platform];
    const btn = document.getElementById('wizCreateBtn');

    if (!ws.name.trim()) {
      Toast.show('Policy name is required', 'warning');
      return;
    }

    // Build the Graph API payload
    const payload = {
      '@odata.type': meta.odataType,
      displayName: ws.name.trim(),
      description: ws.description.trim(),
      ...ws.settings
    };

    // Disable button while creating
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    try {
      const tenantId = AppState.get('activeTenant');
      const created = await Graph.createPolicy(tenantId, payload);

      // If groups were selected, assign them
      if (ws.assignedGroups.length > 0 && created && created.id) {
        try {
          await Graph.assignPolicy(tenantId, created.id, ws.assignedGroups);
        } catch (assignErr) {
          Toast.show('Policy created but group assignment failed: ' + (assignErr.message || assignErr), 'warning');
          this.closeWizard();
          this.render();
          return;
        }
      }

      Toast.show('Compliance policy created successfully', 'success');
      this.closeWizard();
      this.render();
    } catch (e) {
      Toast.show('Failed to create policy: ' + (e.message || e), 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Policy'; }
    }
  }
};
