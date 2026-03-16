/* ============================================================
   IncidentResponse — Guided playbooks for security incidents
   ============================================================ */

const IncidentResponse = {
  _playbooks: [
    {
      id: 'compromised-account',
      name: 'Compromised Account',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
      color: 'var(--danger)',
      desc: 'User account suspected compromised — reset, revoke, investigate',
      steps: [
        { title: 'Reset Password', desc: 'Force password reset and require change on next sign-in', action: 'resetPassword', actionLabel: 'Reset Password' },
        { title: 'Revoke Sessions', desc: 'Revoke all active refresh tokens to force re-authentication', action: 'revokeSessions', actionLabel: 'Revoke All Sessions' },
        { title: 'Enable MFA', desc: 'Ensure MFA is enabled on the account if not already', action: null, actionLabel: null },
        { title: 'Review Sign-In Logs', desc: 'Check for suspicious sign-in locations, IP addresses, and unusual activity', action: 'viewSignIns', actionLabel: 'View Sign-In Logs' },
        { title: 'Check Mail Rules', desc: 'Look for auto-forwarding rules that may exfiltrate data', action: null, actionLabel: null },
        { title: 'Disable Account (if needed)', desc: 'Temporarily disable the account if compromise is confirmed', action: 'disableAccount', actionLabel: 'Disable Account' },
        { title: 'Notify User', desc: 'Inform the user about the incident and next steps', action: null, actionLabel: null }
      ]
    },
    {
      id: 'ransomware',
      name: 'Ransomware Response',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><line x1="12" y1="16" x2="12" y2="19"/></svg>',
      color: 'var(--danger)',
      desc: 'Ransomware detected — isolate, contain, recover',
      steps: [
        { title: 'Isolate Affected Devices', desc: 'Immediately retire or wipe affected devices to prevent lateral movement', action: null, actionLabel: null },
        { title: 'Block User Sign-In', desc: 'Disable sign-in for affected accounts', action: 'disableAccount', actionLabel: 'Disable Account' },
        { title: 'Revoke All Sessions', desc: 'Revoke tokens for all potentially affected users', action: 'revokeSessions', actionLabel: 'Revoke Sessions' },
        { title: 'Review Conditional Access', desc: 'Enable location-based and device compliance CA policies', action: 'viewCA', actionLabel: 'View CA Policies' },
        { title: 'Check Device Compliance', desc: 'Review compliance status of all devices to identify unprotected endpoints', action: 'viewDevices', actionLabel: 'View Devices' },
        { title: 'Enable Enhanced Monitoring', desc: 'Increase audit logging and enable alerting for suspicious activities', action: null, actionLabel: null },
        { title: 'Initiate Recovery', desc: 'Restore from known-good backups, re-enroll clean devices via Autopilot', action: null, actionLabel: null },
        { title: 'Post-Incident Review', desc: 'Document timeline, affected systems, remediation steps, and lessons learned', action: null, actionLabel: null }
      ]
    },
    {
      id: 'data-breach',
      name: 'Data Breach',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      color: 'var(--warning)',
      desc: 'Potential data breach — assess, contain, notify',
      steps: [
        { title: 'Identify Scope', desc: 'Determine what data was accessed and which users/tenants are affected', action: null, actionLabel: null },
        { title: 'Review Audit Logs', desc: 'Check directory audit logs for unusual data access patterns', action: 'viewAuditLogs', actionLabel: 'View Audit Logs' },
        { title: 'Revoke External Sharing', desc: 'Remove any SharePoint/OneDrive external sharing links', action: null, actionLabel: null },
        { title: 'Reset Affected Credentials', desc: 'Force password resets for all potentially affected accounts', action: null, actionLabel: null },
        { title: 'Enable DLP Policies', desc: 'Strengthen Data Loss Prevention policies to prevent further exposure', action: null, actionLabel: null },
        { title: 'Document Evidence', desc: 'Preserve logs, screenshots, and timeline for compliance reporting', action: null, actionLabel: null },
        { title: 'Notify Stakeholders', desc: 'Inform management, legal team, and affected customers as required by regulations', action: null, actionLabel: null },
        { title: 'Regulatory Filing', desc: 'File required breach notifications per GDPR, HIPAA, or other applicable regulations', action: null, actionLabel: null }
      ]
    },
    {
      id: 'lost-device',
      name: 'Lost/Stolen Device',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="2" y1="3" x2="22" y2="17"/></svg>',
      color: 'var(--warning)',
      desc: 'Device reported lost or stolen — lock, wipe, revoke',
      steps: [
        { title: 'Remote Lock', desc: 'Immediately lock the device to prevent unauthorized access', action: null, actionLabel: null },
        { title: 'Locate Device', desc: 'Use Intune to attempt to locate the device if location services are enabled', action: null, actionLabel: null },
        { title: 'Remote Wipe', desc: 'If device cannot be recovered, initiate a remote wipe to protect data', action: null, actionLabel: null },
        { title: 'Revoke User Sessions', desc: 'Revoke the user\'s tokens to prevent access from the lost device', action: 'revokeSessions', actionLabel: 'Revoke Sessions' },
        { title: 'Reset Passwords', desc: 'Reset the user\'s password as a precaution', action: 'resetPassword', actionLabel: 'Reset Password' },
        { title: 'Retire Device', desc: 'Remove the device from Intune management and Azure AD', action: null, actionLabel: null },
        { title: 'Issue Replacement', desc: 'Provision a replacement device via Autopilot if available', action: null, actionLabel: null }
      ]
    }
  ],

  _activePlaybook: null,
  _completedSteps: {},
  _selectedTenant: null,
  _selectedUser: null,

  render() {
    const main = document.getElementById('mainContent');

    if (this._activePlaybook) {
      this._renderPlaybook(main);
      return;
    }

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Incident Response</h1>
          <p class="page-subtitle">Guided playbooks for security incidents</p>
        </div>
      </div>

      <div class="grid grid-2 gap-4">
        ${this._playbooks.map(p => `
          <div class="card" style="cursor:pointer;transition:all 0.15s;border:2px solid transparent;" onclick="IncidentResponse.startPlaybook('${p.id}')"
               onmouseover="this.style.borderColor='${p.color}'" onmouseout="this.style.borderColor='transparent'">
            <div class="card-body" style="padding:24px;">
              <div style="display:flex;align-items:flex-start;gap:16px;">
                <div style="color:${p.color};flex-shrink:0;">${p.icon}</div>
                <div>
                  <h3 style="margin:0 0 4px;font-size:16px;">${p.name}</h3>
                  <p class="text-sm text-muted" style="margin:0 0 8px;">${p.desc}</p>
                  <span class="text-xs text-muted">${p.steps.length} steps</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  startPlaybook(id) {
    this._activePlaybook = this._playbooks.find(p => p.id === id);
    this._completedSteps = {};
    this._selectedTenant = AppState.get('activeTenant') !== 'all' ? AppState.get('activeTenant') : null;
    this._selectedUser = null;
    this.render();
  },

  _renderPlaybook(main) {
    const p = this._activePlaybook;
    const completedCount = Object.keys(this._completedSteps).length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <button class="btn btn-ghost btn-sm" onclick="IncidentResponse._activePlaybook=null; IncidentResponse.render();" style="margin-right:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <h1 class="page-title">${p.name}</h1>
            <p class="page-subtitle">${completedCount}/${p.steps.length} steps completed</p>
          </div>
        </div>
      </div>

      <!-- Context Selector -->
      <div class="card mb-4" style="padding:16px;">
        <div style="display:flex;gap:16px;align-items:center;">
          <div style="flex:1;">
            <label class="form-label" style="margin-bottom:4px;">Target Tenant</label>
            <select class="form-input" id="irTenant" onchange="IncidentResponse._selectedTenant=this.value" style="max-width:300px;">
              <option value="">Select tenant...</option>
              ${AppState.get('tenants').map(t => `<option value="${t.id}" ${this._selectedTenant === t.id ? 'selected' : ''}>${t.name || t.id}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1;">
            <label class="form-label" style="margin-bottom:4px;">Affected User (optional)</label>
            <input type="text" class="form-input" id="irUser" placeholder="user@domain.com" value="${this._selectedUser || ''}" oninput="IncidentResponse._selectedUser=this.value" style="max-width:300px;">
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div style="margin-bottom:20px;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${(completedCount / p.steps.length) * 100}%;background:var(--success);transition:width 0.3s;border-radius:3px;"></div>
      </div>

      <!-- Steps -->
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${p.steps.map((step, i) => {
          const done = this._completedSteps[i];
          return `
          <div class="card" style="padding:16px;border-left:4px solid ${done ? 'var(--success)' : 'var(--border)'};">
            <div style="display:flex;align-items:flex-start;gap:12px;">
              <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;
                background:${done ? 'var(--success)' : 'var(--gray-100)'};color:${done ? 'white' : 'var(--ink-tertiary)'};">
                ${done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : i + 1}
              </div>
              <div style="flex:1;">
                <h4 style="margin:0 0 2px;font-size:14px;${done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${step.title}</h4>
                <p class="text-sm text-muted" style="margin:0;">${step.desc}</p>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                ${step.action && !done ? `<button class="btn btn-secondary btn-xs" onclick="IncidentResponse._executeAction('${step.action}',${i})">${step.actionLabel}</button>` : ''}
                <button class="btn ${done ? 'btn-ghost' : 'btn-primary'} btn-xs" onclick="IncidentResponse._toggleStep(${i})">
                  ${done ? 'Undo' : 'Mark Done'}
                </button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

      ${completedCount === p.steps.length ? `
        <div class="card mt-4" style="padding:24px;text-align:center;border:2px solid var(--success);background:var(--success-pale);">
          <h3 style="color:var(--success);margin:0 0 8px;">Playbook Complete</h3>
          <p class="text-sm text-muted" style="margin:0;">All steps have been completed. Remember to document the incident for future reference.</p>
        </div>
      ` : ''}
    `;
  },

  _toggleStep(idx) {
    if (this._completedSteps[idx]) delete this._completedSteps[idx];
    else this._completedSteps[idx] = true;
    this.render();
  },

  async _executeAction(action, stepIdx) {
    const tenant = this._selectedTenant;
    if (!tenant) { Toast.show('Select a target tenant first', 'warning'); return; }

    switch (action) {
      case 'resetPassword': {
        const userUPN = this._selectedUser;
        if (!userUPN) { Toast.show('Enter an affected user email', 'warning'); return; }
        const users = AppState.getForContext('users').filter(u => u._tenantId === tenant && (u.userPrincipalName || '').toLowerCase() === userUPN.toLowerCase());
        if (users.length === 0) { Toast.show('User not found in this tenant', 'warning'); return; }
        const newPwd = this._generatePassword();
        try {
          await Graph.call(tenant, `/users/${users[0].id}`, { method: 'PATCH', body: { passwordProfile: { password: newPwd, forceChangePasswordNextSignIn: true } } });
          Toast.show(`Password reset. Temp: ${newPwd}`, 'success');
          AuditLog.log('IR: Reset Password', `Reset password for ${userUPN}`, AppState.getTenantName(tenant));
          this._completedSteps[stepIdx] = true;
          this.render();
        } catch (err) { Toast.show(`Failed: ${err.message}`, 'error'); }
        break;
      }
      case 'revokeSessions': {
        const userUPN = this._selectedUser;
        if (!userUPN) { Toast.show('Enter an affected user email', 'warning'); return; }
        const users = AppState.getForContext('users').filter(u => u._tenantId === tenant && (u.userPrincipalName || '').toLowerCase() === userUPN.toLowerCase());
        if (users.length === 0) { Toast.show('User not found', 'warning'); return; }
        try {
          await Graph.call(tenant, `/users/${users[0].id}/revokeSignInSessions`, { method: 'POST' });
          Toast.show('All sessions revoked', 'success');
          AuditLog.log('IR: Revoke Sessions', `Revoked sessions for ${userUPN}`, AppState.getTenantName(tenant));
          this._completedSteps[stepIdx] = true; this.render();
        } catch (err) { Toast.show(`Failed: ${err.message}`, 'error'); }
        break;
      }
      case 'disableAccount': {
        const userUPN = this._selectedUser;
        if (!userUPN) { Toast.show('Enter an affected user email', 'warning'); return; }
        const users = AppState.getForContext('users').filter(u => u._tenantId === tenant && (u.userPrincipalName || '').toLowerCase() === userUPN.toLowerCase());
        if (users.length === 0) { Toast.show('User not found', 'warning'); return; }
        if (!await Confirm.show({ title: 'Disable Account', message: `Disable <strong>${userUPN}</strong>?`, confirmText: 'Disable', type: 'danger' })) return;
        try {
          await Graph.call(tenant, `/users/${users[0].id}`, { method: 'PATCH', body: { accountEnabled: false } });
          Toast.show('Account disabled', 'success');
          AuditLog.log('IR: Disable Account', `Disabled ${userUPN}`, AppState.getTenantName(tenant));
          this._completedSteps[stepIdx] = true; this.render();
        } catch (err) { Toast.show(`Failed: ${err.message}`, 'error'); }
        break;
      }
      case 'viewSignIns': Router.navigate('auditlog'); AuditLog._tab = 'signins'; break;
      case 'viewAuditLogs': Router.navigate('auditlog'); AuditLog._tab = 'directory'; break;
      case 'viewCA': Router.navigate('conditionalaccess'); break;
      case 'viewDevices': Router.navigate('devices'); break;
    }
  },

  _generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  }
};
