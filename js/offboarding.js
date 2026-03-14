/* ============================================================
   Offboarding — User offboarding wizard & scheduled offboardings
   ============================================================ */

const Offboarding = {
  _storageKey: 'msp_offboarding_scheduled',
  _historyKey: 'msp_offboarding_history',
  _currentUser: null,
  _currentTenant: null,
  _step: 0,

  // Steps config
  _steps: [
    { id: 'review',   title: 'Review User' },
    { id: 'actions',  title: 'Select Actions' },
    { id: 'schedule', title: 'Schedule' },
    { id: 'confirm',  title: 'Confirm & Execute' }
  ],

  // Default offboarding actions
  _defaultActions: [
    { id: 'disableAccount',    label: 'Disable sign-in',                desc: 'Block the user from signing in', icon: '&#128683;', checked: true, critical: false },
    { id: 'revokeSession',     label: 'Revoke all sessions',            desc: 'Invalidate all active tokens and sessions', icon: '&#128274;', checked: true, critical: false },
    { id: 'resetPassword',     label: 'Reset password',                 desc: 'Set a random password to prevent access', icon: '&#128273;', checked: true, critical: false },
    { id: 'removeLicenses',    label: 'Remove all licenses',            desc: 'Reclaim license seats for reassignment', icon: '&#128196;', checked: true, critical: false },
    { id: 'removeGroups',      label: 'Remove from all groups',         desc: 'Remove membership from security and M365 groups', icon: '&#128101;', checked: true, critical: false },
    { id: 'setOutOfOffice',    label: 'Set out-of-office reply',        desc: 'Configure automatic reply for the mailbox', icon: '&#9993;', checked: false, critical: false },
    { id: 'convertMailbox',    label: 'Convert to shared mailbox',      desc: 'Convert user mailbox to shared (preserves email)', icon: '&#128231;', checked: false, critical: false },
    { id: 'forwardEmail',      label: 'Set mail forwarding',            desc: 'Forward incoming mail to a manager or team', icon: '&#8594;', checked: false, critical: false },
    { id: 'removeDevices',     label: 'Wipe managed devices',           desc: 'Remote wipe all devices assigned to this user', icon: '&#128187;', checked: false, critical: true },
    { id: 'hideFromGAL',       label: 'Hide from address lists',        desc: 'Remove user from the Global Address List', icon: '&#128065;', checked: false, critical: false },
    { id: 'deleteAccount',     label: 'Delete user account',            desc: 'Permanently delete (30-day soft-delete recovery)', icon: '&#128465;', checked: false, critical: true },
  ],

  // --- WIZARD ---

  show(tenantId, userId) {
    const users = AppState.getForContext('users');
    const user = users.find(u => u.id === userId && u._tenantId === tenantId);
    if (!user) { Toast.show('User not found', 'error'); return; }

    this._currentUser = user;
    this._currentTenant = tenantId;
    this._step = 0;
    this._selectedActions = this._defaultActions.map(a => ({ ...a }));
    this._scheduleType = 'now'; // 'now' or 'scheduled'
    this._scheduleDate = '';
    this._forwardEmail = '';
    this._outOfOfficeMsg = '';
    this._mailboxDelegate = '';
    this._renderWizard();
  },

  _renderWizard() {
    // Remove existing
    document.getElementById('offboardingWizard')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'offboardingWizard';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    const step = this._steps[this._step];
    const user = this._currentUser;

    overlay.innerHTML = `
      <div class="modal" style="max-width:640px;width:95%;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Offboard User</h3>
            <p class="text-sm text-muted">${user.displayName} &mdash; ${user.userPrincipalName}</p>
          </div>
          <button class="modal-close" onclick="Offboarding._close()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Progress -->
        <div style="display:flex;padding:16px 24px;gap:8px;border-bottom:1px solid var(--border-light);">
          ${this._steps.map((s, i) => `
            <div style="flex:1;text-align:center;">
              <div style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;
                ${i < this._step ? 'background:var(--success);color:white;' : i === this._step ? 'background:var(--primary);color:white;' : 'background:var(--gray-100);color:var(--ink-muted);'}">
                ${i < this._step ? '&#10003;' : i + 1}
              </div>
              <div class="text-xs ${i === this._step ? 'text-primary fw-500' : 'text-muted'}" style="margin-top:4px;">${s.title}</div>
            </div>
          `).join('')}
        </div>

        <div class="modal-body" style="padding:20px 24px;">
          ${this._renderStep()}
        </div>

        <div class="modal-footer" style="display:flex;justify-content:space-between;">
          ${this._step > 0 ? `<button class="btn btn-secondary" onclick="Offboarding._prev()">Back</button>` : '<div></div>'}
          ${this._step < this._steps.length - 1
            ? `<button class="btn btn-primary" onclick="Offboarding._next()">Next</button>`
            : `<button class="btn btn-danger" onclick="Offboarding._execute()">
                ${this._scheduleType === 'scheduled' ? 'Schedule Offboarding' : 'Execute Offboarding'}
              </button>`
          }
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) Offboarding._close(); });
    document.body.appendChild(overlay);
  },

  _renderStep() {
    const user = this._currentUser;
    const tenantName = AppState.getTenantName(this._currentTenant);

    switch (this._step) {
      case 0: // Review
        return `
          <div class="detail-section">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
              <div class="topbar-avatar" style="width:56px;height:56px;font-size:20px;">
                ${(user.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div class="fw-600" style="font-size:var(--text-lg);">${user.displayName}</div>
                <div class="text-sm text-muted">${user.userPrincipalName}</div>
                <div class="text-xs text-muted mt-1">${user.jobTitle || ''} ${user.department ? '&bull; ' + user.department : ''}</div>
              </div>
            </div>
            <div class="grid grid-3 gap-3">
              <div class="stat-card"><div class="stat-card-value">${user.accountEnabled ? '<span class="text-success">Active</span>' : '<span class="text-muted">Disabled</span>'}</div><div class="stat-card-label">Status</div></div>
              <div class="stat-card"><div class="stat-card-value">${user.assignedLicenses?.length || 0}</div><div class="stat-card-label">Licenses</div></div>
              <div class="stat-card"><div class="stat-card-value">${user._deviceCount || 0}</div><div class="stat-card-label">Devices</div></div>
            </div>
            <div class="detail-row mt-4"><span class="detail-label">Tenant</span><span class="detail-value"><span class="chip">${tenantName}</span></span></div>
            <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${user.createdDateTime ? new Date(user.createdDateTime).toLocaleDateString() : '-'}</span></div>
            <div class="detail-row"><span class="detail-label">Last Sign-In</span><span class="detail-value">${user.signInActivity?.lastSignInDateTime ? new Date(user.signInActivity.lastSignInDateTime).toLocaleString() : 'Never'}</span></div>
          </div>
        `;

      case 1: // Select Actions
        return `
          <p class="text-sm text-muted mb-4">Select the offboarding actions to perform. Critical actions are marked in red.</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${this._selectedActions.map((a, i) => `
              <label style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border:1px solid ${a.critical ? 'var(--danger-pale, #fee2e2)' : 'var(--border-light)'};border-radius:var(--radius);cursor:pointer;transition:background 0.15s;"
                onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
                <input type="checkbox" class="toggle" style="margin-top:2px;" ${a.checked ? 'checked' : ''}
                  onchange="Offboarding._selectedActions[${i}].checked = this.checked; if(['forwardEmail','setOutOfOffice','convertMailbox'].includes('${a.id}')) Offboarding._renderWizard();">
                <div style="flex:1;">
                  <div class="text-sm fw-500">${a.icon} ${a.label} ${a.critical ? '<span class="badge badge-danger" style="font-size:10px;padding:1px 6px;">Critical</span>' : ''}</div>
                  <div class="text-xs text-muted">${a.desc}</div>
                </div>
              </label>
            `).join('')}
          </div>

          ${this._selectedActions.find(a => a.id === 'forwardEmail' && a.checked) ? `
            <div class="form-group mt-4" style="background:var(--gray-50);padding:12px 16px;border-radius:var(--radius);border:1px solid var(--border-light);">
              <label class="form-label">Forward email to:</label>
              <input type="email" class="form-input" id="offboardForwardEmail" value="${this._forwardEmail}"
                placeholder="manager@company.com" oninput="Offboarding._forwardEmail = this.value"
                list="offboardUserList">
              <datalist id="offboardUserList">
                ${(AppState.get('users')[this._currentTenant] || [])
                  .filter(u => u.accountEnabled && u.id !== this._currentUser?.id)
                  .slice(0, 50)
                  .map(u => `<option value="${u.mail || u.userPrincipalName}">${u.displayName}</option>`).join('')}
              </datalist>
              <span class="form-hint">Select a colleague or type an email address to forward incoming mail to.</span>
            </div>
          ` : ''}

          ${this._selectedActions.find(a => a.id === 'setOutOfOffice' && a.checked) ? `
            <div class="form-group mt-4" style="background:var(--gray-50);padding:12px 16px;border-radius:var(--radius);border:1px solid var(--border-light);">
              <label class="form-label">Out-of-office message:</label>
              <textarea class="form-textarea" id="offboardOOO" rows="3"
                style="background:var(--surface);"
                placeholder="This person is no longer with the organization. Please contact..."
                oninput="Offboarding._outOfOfficeMsg = this.value">${this._outOfOfficeMsg}</textarea>
              <span class="form-hint">This auto-reply will be sent to both internal and external senders.</span>
            </div>
          ` : ''}

          ${this._selectedActions.find(a => a.id === 'convertMailbox' && a.checked) ? `
            <div class="form-group mt-4" style="background:var(--gray-50);padding:12px 16px;border-radius:var(--radius);border:1px solid var(--border-light);">
              <label class="form-label">Grant shared mailbox access to:</label>
              <input type="email" class="form-input" id="offboardMailboxDelegate" value="${this._mailboxDelegate || ''}"
                placeholder="manager@company.com" oninput="Offboarding._mailboxDelegate = this.value"
                list="offboardDelegateList">
              <datalist id="offboardDelegateList">
                ${(AppState.get('users')[this._currentTenant] || [])
                  .filter(u => u.accountEnabled && u.id !== this._currentUser?.id)
                  .slice(0, 50)
                  .map(u => `<option value="${u.mail || u.userPrincipalName}">${u.displayName}</option>`).join('')}
              </datalist>
              <span class="form-hint">Optional: grant full access to the shared mailbox after conversion.</span>
            </div>
          ` : ''}
        `;

      case 2: // Schedule
        return `
          <p class="text-sm text-muted mb-4">Execute immediately or schedule for a future date.</p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <label style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;"
              onclick="Offboarding._scheduleType='now'; Offboarding._renderWizard();">
              <input type="radio" name="schedType" value="now" ${this._scheduleType === 'now' ? 'checked' : ''}>
              <div>
                <div class="fw-500">Execute Now</div>
                <div class="text-xs text-muted">Run all selected actions immediately</div>
              </div>
            </label>
            <label style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;"
              onclick="Offboarding._scheduleType='scheduled'; Offboarding._renderWizard();">
              <input type="radio" name="schedType" value="scheduled" ${this._scheduleType === 'scheduled' ? 'checked' : ''}>
              <div>
                <div class="fw-500">Schedule for Later</div>
                <div class="text-xs text-muted">Queue the offboarding for a specific date (e.g., last working day)</div>
              </div>
            </label>
          </div>
          ${this._scheduleType === 'scheduled' ? `
            <div class="form-group mt-4">
              <label class="form-label">Offboarding Date</label>
              <input type="date" class="form-input" id="offboardDate" value="${this._scheduleDate}"
                min="${new Date().toISOString().slice(0, 10)}"
                onchange="Offboarding._scheduleDate = this.value">
              <span class="form-hint">Actions will be queued and must be manually triggered on this date (reminder will appear).</span>
            </div>
          ` : ''}
        `;

      case 3: // Confirm
        const active = this._selectedActions.filter(a => a.checked);
        return `
          <div style="background:var(--warning-pale, #fef3c7);border:1px solid var(--warning, #f59e0b);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;">
            <div class="fw-500 text-sm">&#9888; Please review carefully before proceeding</div>
            <div class="text-xs" style="margin-top:4px;">
              ${this._scheduleType === 'scheduled'
                ? `This offboarding is scheduled for <strong>${this._scheduleDate}</strong>. A reminder will appear on that date.`
                : 'These actions will be executed <strong>immediately</strong> and some cannot be undone.'}
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">User</div>
            <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${this._currentUser.displayName}</span></div>
            <div class="detail-row"><span class="detail-label">UPN</span><span class="detail-value">${this._currentUser.userPrincipalName}</span></div>
            <div class="detail-row"><span class="detail-label">Tenant</span><span class="detail-value">${AppState.getTenantName(this._currentTenant)}</span></div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Actions (${active.length})</div>
            ${active.map(a => `
              <div class="detail-row">
                <span class="detail-label">${a.icon} ${a.label}</span>
                <span class="detail-value">${a.critical ? '<span class="badge badge-danger">Critical</span>' : '<span class="badge badge-success">Safe</span>'}</span>
              </div>
            `).join('')}
          </div>

          ${this._forwardEmail ? `<div class="detail-row"><span class="detail-label">Forward to</span><span class="detail-value">${this._forwardEmail}</span></div>` : ''}
          ${this._mailboxDelegate ? `<div class="detail-row"><span class="detail-label">Mailbox delegate</span><span class="detail-value">${this._mailboxDelegate}</span></div>` : ''}
        `;
    }
  },

  _next() {
    if (this._step === 2 && this._scheduleType === 'scheduled' && !this._scheduleDate) {
      Toast.show('Please select an offboarding date', 'warning');
      return;
    }
    // Save form values before advancing
    if (this._step === 1) {
      this._forwardEmail = document.getElementById('offboardForwardEmail')?.value || this._forwardEmail;
      this._outOfOfficeMsg = document.getElementById('offboardOOO')?.value || this._outOfOfficeMsg;
      this._mailboxDelegate = document.getElementById('offboardMailboxDelegate')?.value || this._mailboxDelegate;
    }
    this._step++;
    this._renderWizard();
  },

  _prev() {
    this._step = Math.max(0, this._step - 1);
    this._renderWizard();
  },

  _close() {
    document.getElementById('offboardingWizard')?.remove();
  },

  // --- EXECUTION ---

  async _execute() {
    const actions = this._selectedActions.filter(a => a.checked);
    if (actions.length === 0) {
      Toast.show('No actions selected', 'warning');
      return;
    }

    if (this._scheduleType === 'scheduled') {
      this._scheduleOffboarding(actions);
      return;
    }

    // Execute now
    this._close();
    const user = this._currentUser;
    const tenantId = this._currentTenant;
    Toast.show(`Starting offboarding for ${user.displayName}...`, 'info');

    const results = [];
    for (const action of actions) {
      try {
        await this._runAction(action.id, tenantId, user.id);
        results.push({ action: action.label, success: true });
      } catch (err) {
        results.push({ action: action.label, success: false, error: err.message });
      }
    }

    // Log to history
    this._addHistory({
      userId: user.id,
      userName: user.displayName,
      upn: user.userPrincipalName,
      tenantId,
      tenantName: AppState.getTenantName(tenantId),
      actions: results,
      executedAt: new Date().toISOString(),
      executedBy: AppState.get('account')?.name || 'Unknown'
    });

    // Audit log
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('user_offboarded', `Offboarded user ${user.displayName} (${user.userPrincipalName})`, {
        actions: results.map(r => r.action),
        tenant: AppState.getTenantName(tenantId)
      });
    }

    const failed = results.filter(r => !r.success);
    if (failed.length === 0) {
      Toast.show(`Successfully offboarded ${user.displayName}`, 'success');
    } else {
      Toast.show(`Offboarding completed with ${failed.length} error(s)`, 'warning');
    }

    // Refresh users
    Users.reload();
  },

  async _runAction(actionId, tenantId, userId) {
    switch (actionId) {
      case 'disableAccount':
        await Graph.updateUser(tenantId, userId, { accountEnabled: false });
        break;
      case 'revokeSession':
        await Graph.revokeUserSessions(tenantId, userId);
        break;
      case 'resetPassword':
        const pwd = this._generatePassword();
        await Graph.resetUserPassword(tenantId, userId, pwd);
        break;
      case 'removeLicenses':
        await Graph.removeAllUserLicenses(tenantId, userId);
        break;
      case 'removeGroups':
        await Graph.removeUserFromAllGroups(tenantId, userId);
        break;
      case 'setOutOfOffice':
        await Graph.setAutoReply(tenantId, userId, this._outOfOfficeMsg || 'This user is no longer with the organization.');
        break;
      case 'convertMailbox':
        // Exchange Online operation — would need Exchange Graph endpoint
        Toast.show('Shared mailbox conversion requires Exchange admin', 'info');
        break;
      case 'forwardEmail':
        if (this._forwardEmail) {
          await Graph.setMailForwarding(tenantId, userId, this._forwardEmail);
        }
        break;
      case 'removeDevices':
        await Graph.wipeUserDevices(tenantId, userId);
        break;
      case 'hideFromGAL':
        await Graph.updateUser(tenantId, userId, { showInAddressList: false });
        break;
      case 'deleteAccount':
        await Graph.deleteUser(tenantId, userId);
        break;
    }
  },

  _generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 24; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  },

  // --- SCHEDULING ---

  _scheduleOffboarding(actions) {
    const scheduled = this.getScheduled();
    scheduled.push({
      id: 'ob_' + Date.now(),
      userId: this._currentUser.id,
      userName: this._currentUser.displayName,
      upn: this._currentUser.userPrincipalName,
      tenantId: this._currentTenant,
      tenantName: AppState.getTenantName(this._currentTenant),
      date: this._scheduleDate,
      actions: actions.map(a => ({ id: a.id, label: a.label })),
      forwardEmail: this._forwardEmail,
      outOfOfficeMsg: this._outOfOfficeMsg,
      createdAt: new Date().toISOString(),
      createdBy: AppState.get('account')?.name || 'Unknown',
      status: 'pending'
    });
    localStorage.setItem(this._storageKey, JSON.stringify(scheduled));

    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('offboarding_scheduled', `Scheduled offboarding for ${this._currentUser.displayName} on ${this._scheduleDate}`, {
        tenant: AppState.getTenantName(this._currentTenant)
      });
    }

    this._close();
    Toast.show(`Offboarding scheduled for ${this._scheduleDate}`, 'success');
  },

  getScheduled() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  },

  getHistory() {
    try { return JSON.parse(localStorage.getItem(this._historyKey) || '[]'); } catch { return []; }
  },

  _addHistory(entry) {
    const history = this.getHistory();
    history.unshift(entry);
    if (history.length > 200) history.length = 200;
    localStorage.setItem(this._historyKey, JSON.stringify(history));
  },

  async executeScheduled(id) {
    const scheduled = this.getScheduled();
    const task = scheduled.find(s => s.id === id);
    if (!task) return;

    if (!confirm(`Execute offboarding for ${task.userName} now?`)) return;

    this._currentUser = { id: task.userId, displayName: task.userName, userPrincipalName: task.upn };
    this._currentTenant = task.tenantId;
    this._forwardEmail = task.forwardEmail;
    this._outOfOfficeMsg = task.outOfOfficeMsg;

    Toast.show(`Executing offboarding for ${task.userName}...`, 'info');
    const results = [];
    for (const action of task.actions) {
      try {
        await this._runAction(action.id, task.tenantId, task.userId);
        results.push({ action: action.label, success: true });
      } catch (err) {
        results.push({ action: action.label, success: false, error: err.message });
      }
    }

    // Update status
    task.status = 'completed';
    task.executedAt = new Date().toISOString();
    localStorage.setItem(this._storageKey, JSON.stringify(scheduled));

    this._addHistory({
      ...task,
      actions: results,
      executedAt: new Date().toISOString()
    });

    const failed = results.filter(r => !r.success);
    Toast.show(failed.length === 0
      ? `Successfully offboarded ${task.userName}`
      : `Completed with ${failed.length} error(s)`,
      failed.length === 0 ? 'success' : 'warning');

    this.render();
  },

  cancelScheduled(id) {
    if (!confirm('Cancel this scheduled offboarding?')) return;
    const scheduled = this.getScheduled().filter(s => s.id !== id);
    localStorage.setItem(this._storageKey, JSON.stringify(scheduled));
    Toast.show('Scheduled offboarding cancelled', 'success');
    this.render();
  },

  // --- RENDER PAGE ---

  render() {
    const main = document.getElementById('mainContent');
    const scheduled = this.getScheduled().filter(s => s.status === 'pending');
    const history = this.getHistory().slice(0, 20);

    // Check for due offboardings
    const today = new Date().toISOString().slice(0, 10);
    const due = scheduled.filter(s => s.date <= today);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">User Offboarding</h1>
          <p class="page-subtitle">Manage user lifecycle, scheduled departures, and offboarding history</p>
        </div>
      </div>

      ${due.length > 0 ? `
        <div style="background:var(--warning-pale, #fef3c7);border:1px solid var(--warning, #f59e0b);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:20px;">
          <div class="fw-600">&#9888; ${due.length} offboarding(s) due today or overdue</div>
          <div class="text-sm text-muted mt-1">Review and execute these pending offboardings.</div>
        </div>
      ` : ''}

      <div class="grid grid-3 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${scheduled.length}</div><div class="stat-card-label">Scheduled</div></div>
        <div class="stat-card"><div class="stat-card-value text-warning">${due.length}</div><div class="stat-card-label">Due / Overdue</div></div>
        <div class="stat-card"><div class="stat-card-value text-muted">${this.getHistory().length}</div><div class="stat-card-label">Completed</div></div>
      </div>

      <!-- Scheduled -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-header-title">Scheduled Offboardings</div>
        </div>
        <div class="card-body">
          ${scheduled.length === 0 ? '<div class="text-sm text-muted" style="padding:16px 0;">No pending offboardings scheduled.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>User</th><th>Tenant</th><th>Date</th><th>Actions</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${scheduled.map(s => `
                    <tr>
                      <td>
                        <div class="fw-500">${s.userName}</div>
                        <div class="text-xs text-muted">${s.upn}</div>
                      </td>
                      <td><span class="chip">${s.tenantName}</span></td>
                      <td>
                        <span class="${s.date <= today ? 'text-warning fw-500' : 'text-sm'}">${s.date}</span>
                        ${s.date <= today ? '<br><span class="badge badge-warning">Due</span>' : ''}
                      </td>
                      <td><span class="text-sm">${s.actions.length} action(s)</span></td>
                      <td><span class="badge badge-info">Pending</span></td>
                      <td>
                        <div style="display:flex;gap:4px;">
                          <button class="btn btn-primary btn-sm" onclick="Offboarding.executeScheduled('${s.id}')">Execute</button>
                          <button class="btn btn-ghost btn-sm" onclick="Offboarding.cancelScheduled('${s.id}')">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- History -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">Offboarding History</div>
        </div>
        <div class="card-body">
          ${history.length === 0 ? '<div class="text-sm text-muted" style="padding:16px 0;">No offboarding history yet.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>User</th><th>Tenant</th><th>Date</th><th>Actions</th><th>Result</th></tr></thead>
                <tbody>
                  ${history.map(h => {
                    const failed = (h.actions || []).filter(a => !a.success).length;
                    return `
                      <tr>
                        <td>
                          <div class="fw-500">${h.userName}</div>
                          <div class="text-xs text-muted">${h.upn}</div>
                        </td>
                        <td><span class="chip">${h.tenantName}</span></td>
                        <td class="text-sm">${h.executedAt ? new Date(h.executedAt).toLocaleDateString() : '-'}</td>
                        <td><span class="text-sm">${(h.actions || []).length} action(s)</span></td>
                        <td>${failed === 0
                          ? '<span class="badge badge-success">Success</span>'
                          : `<span class="badge badge-warning">${failed} failed</span>`
                        }</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  // Check for due offboardings on notification poll
  checkDue() {
    const scheduled = this.getScheduled().filter(s => s.status === 'pending');
    const today = new Date().toISOString().slice(0, 10);
    return scheduled.filter(s => s.date <= today);
  }
};
