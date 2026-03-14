/* ============================================================
   UserOnboarding — Bulk user creation wizard with CSV import
   ============================================================ */

const UserOnboarding = {
  _users: [],
  _step: 0,
  _selectedTenant: null,
  _assignLicenses: [],
  _assignGroups: [],
  _sendWelcomeEmail: true,

  show() {
    this._step = 0;
    this._users = [];
    this._selectedTenant = null;
    this._assignLicenses = [];
    this._assignGroups = [];
    this._renderWizard();
  },

  _steps: [
    { id: 'tenant',   title: 'Select Tenant' },
    { id: 'users',    title: 'Add Users' },
    { id: 'options',  title: 'Licenses & Groups' },
    { id: 'review',   title: 'Review & Create' }
  ],

  _renderWizard() {
    document.getElementById('userOnboardingWizard')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'userOnboardingWizard';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    overlay.innerHTML = `
      <div class="modal" style="max-width:700px;width:95%;max-height:90vh;overflow-y:auto;">
        <div class="modal-header">
          <h3 class="modal-title">Onboard New Users</h3>
          <button class="modal-close" onclick="UserOnboarding._close()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
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
          ${this._step > 0 ? '<button class="btn btn-secondary" onclick="UserOnboarding._prev()">Back</button>' : '<div></div>'}
          ${this._step < this._steps.length - 1
            ? `<button class="btn btn-primary" onclick="UserOnboarding._next()">Next</button>`
            : `<button class="btn btn-primary" onclick="UserOnboarding._execute()">Create ${this._users.length} User(s)</button>`}
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) UserOnboarding._close(); });
    document.body.appendChild(overlay);
  },

  _renderStep() {
    switch (this._step) {
      case 0: // Select tenant
        const tenants = AppState.get('tenants');
        return `
          <p class="text-sm text-muted mb-4">Select which tenant to create the users in.</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${tenants.map(t => `
              <label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid ${this._selectedTenant === t.id ? 'var(--primary)' : 'var(--border)'};border-radius:var(--radius);cursor:pointer;background:${this._selectedTenant === t.id ? 'var(--primary-bg)' : ''};"
                onclick="UserOnboarding._selectedTenant='${t.id}'; UserOnboarding._renderWizard();">
                <input type="radio" name="obTenant" ${this._selectedTenant === t.id ? 'checked' : ''}>
                <div>
                  <div class="fw-500">${t.displayName}</div>
                  <div class="text-xs text-muted text-mono">${t.id}</div>
                </div>
              </label>
            `).join('')}
            ${tenants.length === 0 ? '<div class="text-muted text-sm">No tenants connected.</div>' : ''}
          </div>
        `;

      case 1: // Add users
        return `
          <p class="text-sm text-muted mb-4">Add users manually or import from CSV.</p>

          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-primary btn-sm" onclick="UserOnboarding._addRow()">+ Add User</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
              Import CSV
              <input type="file" accept=".csv" style="display:none;" onchange="UserOnboarding._importCSV(this.files[0])">
            </label>
          </div>

          <div class="text-xs text-muted mb-2">CSV format: displayName, userPrincipalName, password, jobTitle, department</div>

          ${this._users.length === 0 ? '<div class="text-muted text-sm" style="padding:20px 0;">No users added yet. Click "Add User" or import a CSV file.</div>' : `
            <div class="table-wrapper" style="max-height:300px;overflow-y:auto;">
              <table class="table">
                <thead><tr><th>Display Name</th><th>UPN / Email</th><th>Job Title</th><th>Dept</th><th></th></tr></thead>
                <tbody>
                  ${this._users.map((u, i) => `
                    <tr>
                      <td><input class="form-input" value="${u.displayName}" style="padding:4px 8px;font-size:12px;" onchange="UserOnboarding._users[${i}].displayName=this.value"></td>
                      <td><input class="form-input" value="${u.userPrincipalName}" style="padding:4px 8px;font-size:12px;" onchange="UserOnboarding._users[${i}].userPrincipalName=this.value"></td>
                      <td><input class="form-input" value="${u.jobTitle || ''}" style="padding:4px 8px;font-size:12px;" onchange="UserOnboarding._users[${i}].jobTitle=this.value"></td>
                      <td><input class="form-input" value="${u.department || ''}" style="padding:4px 8px;font-size:12px;" onchange="UserOnboarding._users[${i}].department=this.value"></td>
                      <td><button class="btn btn-ghost btn-sm" onclick="UserOnboarding._users.splice(${i},1); UserOnboarding._renderWizard();">&#10005;</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        `;

      case 2: // Licenses & Groups
        const licenseData = AppState.get('subscribedSkus') || {};
        const skus = licenseData[this._selectedTenant] || [];
        const groups = AppState.get('groups')[this._selectedTenant] || [];
        return `
          <p class="text-sm text-muted mb-4">Optionally assign licenses and group memberships to all new users.</p>

          <div class="detail-section">
            <div class="detail-section-title">Assign Licenses</div>
            ${skus.length === 0 ? '<div class="text-xs text-muted">No license data loaded. Load licenses from the License Management page first.</div>' : `
              <div style="max-height:200px;overflow-y:auto;">
                ${skus.filter(s => (s.prepaidUnits?.enabled || 0) - s.consumedUnits > 0).map(s => `
                  <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
                    <input type="checkbox" ${this._assignLicenses.includes(s.skuId) ? 'checked' : ''}
                      onchange="UserOnboarding._toggleLicense('${s.skuId}', this.checked)">
                    <span class="text-sm">${Licenses.getSkuName(s.skuId)}</span>
                    <span class="text-xs text-muted">(${Math.max(0, (s.prepaidUnits?.enabled || 0) - s.consumedUnits)} available)</span>
                  </label>
                `).join('')}
              </div>
            `}
          </div>

          <div class="detail-section mt-4">
            <div class="detail-section-title">Add to Groups</div>
            ${groups.length === 0 ? '<div class="text-xs text-muted">No groups loaded for this tenant.</div>' : `
              <div style="max-height:200px;overflow-y:auto;">
                ${groups.slice(0, 30).map(g => `
                  <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
                    <input type="checkbox" ${this._assignGroups.includes(g.id) ? 'checked' : ''}
                      onchange="UserOnboarding._toggleGroup('${g.id}', this.checked)">
                    <span class="text-sm">${g.displayName}</span>
                  </label>
                `).join('')}
              </div>
            `}
          </div>

          <div class="detail-section mt-4">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" ${this._sendWelcomeEmail ? 'checked' : ''}
                onchange="UserOnboarding._sendWelcomeEmail = this.checked">
              <span class="text-sm fw-500">Force password change on first sign-in</span>
            </label>
          </div>
        `;

      case 3: // Review
        const tenantName = AppState.getTenantName(this._selectedTenant);
        return `
          <div style="background:var(--primary-bg);border:1px solid var(--primary-pale);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;">
            <div class="fw-500 text-sm">Ready to create ${this._users.length} user(s) in ${tenantName}</div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">Users (${this._users.length})</div>
            ${this._users.map(u => `
              <div class="detail-row">
                <span class="detail-label">${u.displayName}</span>
                <span class="detail-value text-xs text-mono">${u.userPrincipalName}</span>
              </div>
            `).join('')}
          </div>

          ${this._assignLicenses.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">Licenses (${this._assignLicenses.length})</div>
              ${this._assignLicenses.map(id => `<div class="text-sm" style="padding:2px 0;">${Licenses.getSkuName(id)}</div>`).join('')}
            </div>
          ` : ''}

          ${this._assignGroups.length > 0 ? `
            <div class="detail-section">
              <div class="detail-section-title">Groups (${this._assignGroups.length})</div>
              <div class="text-sm text-muted">${this._assignGroups.length} group(s) will be assigned</div>
            </div>
          ` : ''}
        `;
    }
  },

  _next() {
    if (this._step === 0 && !this._selectedTenant) { Toast.show('Select a tenant', 'warning'); return; }
    if (this._step === 1 && this._users.length === 0) { Toast.show('Add at least one user', 'warning'); return; }
    this._step++;
    this._renderWizard();
  },

  _prev() { this._step = Math.max(0, this._step - 1); this._renderWizard(); },

  _close() { document.getElementById('userOnboardingWizard')?.remove(); },

  _addRow() {
    this._users.push({ displayName: '', userPrincipalName: '', password: '', jobTitle: '', department: '' });
    this._renderWizard();
  },

  _importCSV(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      // Skip header if it looks like one
      const start = lines[0].toLowerCase().includes('displayname') || lines[0].toLowerCase().includes('name') ? 1 : 0;
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2) {
          this._users.push({
            displayName: cols[0] || '',
            userPrincipalName: cols[1] || '',
            password: cols[2] || '',
            jobTitle: cols[3] || '',
            department: cols[4] || ''
          });
        }
      }
      Toast.show(`Imported ${this._users.length} user(s) from CSV`, 'success');
      this._renderWizard();
    };
    reader.readAsText(file);
  },

  _toggleLicense(skuId, checked) {
    if (checked) { if (!this._assignLicenses.includes(skuId)) this._assignLicenses.push(skuId); }
    else { this._assignLicenses = this._assignLicenses.filter(id => id !== skuId); }
  },

  _toggleGroup(groupId, checked) {
    if (checked) { if (!this._assignGroups.includes(groupId)) this._assignGroups.push(groupId); }
    else { this._assignGroups = this._assignGroups.filter(id => id !== groupId); }
  },

  async _execute() {
    this._close();
    const tenantId = this._selectedTenant;
    const total = this._users.length;
    Toast.show(`Creating ${total} user(s)...`, 'info');

    let created = 0, failed = 0;
    for (const user of this._users) {
      try {
        const pwd = user.password || this._genPwd();
        const newUser = await Graph.createUser(tenantId, {
          accountEnabled: true,
          displayName: user.displayName,
          userPrincipalName: user.userPrincipalName,
          mailNickname: user.userPrincipalName.split('@')[0],
          jobTitle: user.jobTitle || undefined,
          department: user.department || undefined,
          passwordProfile: {
            forceChangePasswordNextSignIn: this._sendWelcomeEmail,
            password: pwd
          }
        });

        // Assign licenses
        if (this._assignLicenses.length > 0 && newUser?.id) {
          try {
            await Graph.call(tenantId, `/users/${newUser.id}/assignLicense`, {
              method: 'POST',
              body: {
                addLicenses: this._assignLicenses.map(skuId => ({ skuId })),
                removeLicenses: []
              }
            });
          } catch (e) { console.warn('License assignment failed:', e); }
        }

        // Add to groups
        for (const groupId of this._assignGroups) {
          try {
            await Graph.call(tenantId, `/groups/${groupId}/members/$ref`, {
              method: 'POST',
              body: { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${newUser.id}` }
            });
          } catch (e) { console.warn('Group assignment failed:', e); }
        }

        created++;
      } catch (e) {
        console.error(`Failed to create ${user.displayName}:`, e);
        failed++;
      }
    }

    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('users_onboarded', `Created ${created} user(s) in ${AppState.getTenantName(tenantId)}`, {
        created, failed, tenant: AppState.getTenantName(tenantId)
      });
    }

    Toast.show(
      failed === 0 ? `Successfully created ${created} user(s)` : `Created ${created}, failed ${failed}`,
      failed === 0 ? 'success' : 'warning'
    );

    Users.reload();
  },

  _genPwd() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  }
};
