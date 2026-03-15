/* ============================================================
   UserCreation — User creation wizard with template system
   ============================================================ */

const UserCreation = {

  // SKU display name mappings
  SKU_NAMES: {
    'ENTERPRISEPACK': 'Office 365 E3',
    'ENTERPRISEPREMIUM': 'Office 365 E5',
    'SPE_E3': 'Microsoft 365 E3',
    'SPE_E5': 'Microsoft 365 E5',
    'EXCHANGESTANDARD': 'Exchange Online Plan 1',
    'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
    'FLOW_FREE': 'Power Automate Free',
    'POWER_BI_STANDARD': 'Power BI Free',
    'POWER_BI_PRO': 'Power BI Pro',
    'TEAMS_EXPLORATORY': 'Teams Exploratory',
    'STREAM': 'Microsoft Stream',
    'VISIOCLIENT': 'Visio Online Plan 2',
    'PROJECTPREMIUM': 'Project Plan 5',
    'EMS_E5': 'Enterprise Mobility + Security E5',
    'EMSPREMIUM': 'Enterprise Mobility + Security E5',
    'AAD_PREMIUM': 'Azure AD Premium P1',
    'AAD_PREMIUM_P2': 'Azure AD Premium P2',
    'INTUNE_A': 'Microsoft Intune',
    'WIN_DEF_ATP': 'Defender for Endpoint P2',
    'IDENTITY_THREAT_PROTECTION': 'Defender for Identity',
    'M365_F1': 'Microsoft 365 F1',
    'SPB': 'Microsoft 365 Business Premium',
    'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
    'SMB_BUSINESS': 'Microsoft 365 Business Basic',
  },

  _storageKey: 'msp_user_templates',
  _wizardState: null,

  // Common countries for usageLocation
  _countries: [
    { code: 'US', label: 'United States' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'AU', label: 'Australia' },
    { code: 'NZ', label: 'New Zealand' },
    { code: 'CA', label: 'Canada' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
    { code: 'NL', label: 'Netherlands' },
    { code: 'IE', label: 'Ireland' },
    { code: 'SE', label: 'Sweden' },
    { code: 'NO', label: 'Norway' },
    { code: 'DK', label: 'Denmark' },
    { code: 'FI', label: 'Finland' },
    { code: 'CH', label: 'Switzerland' },
    { code: 'AT', label: 'Austria' },
    { code: 'BE', label: 'Belgium' },
    { code: 'IT', label: 'Italy' },
    { code: 'ES', label: 'Spain' },
    { code: 'PT', label: 'Portugal' },
    { code: 'JP', label: 'Japan' },
    { code: 'SG', label: 'Singapore' },
    { code: 'IN', label: 'India' },
    { code: 'ZA', label: 'South Africa' },
    { code: 'BR', label: 'Brazil' },
    { code: 'MX', label: 'Mexico' },
  ],

  _generatePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*+-=?';
    const all = upper + lower + digits + symbols;
    let pw = '';
    // Ensure at least one from each category
    pw += upper[Math.floor(Math.random() * upper.length)];
    pw += lower[Math.floor(Math.random() * lower.length)];
    pw += digits[Math.floor(Math.random() * digits.length)];
    pw += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = 4; i < 16; i++) {
      pw += all[Math.floor(Math.random() * all.length)];
    }
    // Shuffle
    return pw.split('').sort(() => Math.random() - 0.5).join('');
  },

  _getSkuName(sku) {
    const partNumber = sku.skuPartNumber || '';
    return this.SKU_NAMES[partNumber] || partNumber || sku.skuId;
  },

  /* ----------------------------------------------------------
     Templates CRUD
     ---------------------------------------------------------- */

  _getTemplates() {
    try { return JSON.parse(localStorage.getItem(this._storageKey)) || []; } catch { return []; }
  },

  _saveTemplates(templates) {
    localStorage.setItem(this._storageKey, JSON.stringify(templates));
  },

  showTemplates() {
    document.getElementById('userTemplatesModal')?.remove();
    const templates = this._getTemplates();

    const modal = document.createElement('div');
    modal.id = 'userTemplatesModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:560px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">User Templates</h3>
          <button class="modal-close" onclick="document.getElementById('userTemplatesModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
          ${templates.length === 0 ? `
            <div class="text-center text-muted" style="padding:2rem;">
              <p class="mb-2">No templates saved yet.</p>
              <p class="text-xs">Create a user and save settings as a template during the wizard.</p>
            </div>
          ` : templates.map((t, i) => `
            <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border);">
              <div>
                <div class="fw-500 text-sm">${t.name}</div>
                <div class="text-xs text-muted">${t.department || ''} ${t.jobTitle ? '· ' + t.jobTitle : ''} ${t.licenseSkus?.length ? '· ' + t.licenseSkus.length + ' license(s)' : ''}</div>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-primary btn-sm" onclick="UserCreation._useTemplate(${i})">Use</button>
                <button class="btn btn-ghost btn-sm text-danger" onclick="UserCreation._deleteTemplate(${i})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('userTemplatesModal').remove()">Close</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _deleteTemplate(index) {
    const templates = this._getTemplates();
    templates.splice(index, 1);
    this._saveTemplates(templates);
    this.showTemplates(); // Re-render
    Toast.show('Template deleted', 'info');
  },

  _useTemplate(index) {
    const templates = this._getTemplates();
    const t = templates[index];
    if (!t) return;
    document.getElementById('userTemplatesModal')?.remove();
    // Open wizard pre-filled with template data
    this.showWizard(t);
  },

  _saveAsTemplate() {
    const s = this._wizardState;
    const name = prompt('Template name:');
    if (!name) return;
    const templates = this._getTemplates();
    templates.push({
      name,
      department: s.department,
      jobTitle: s.jobTitle,
      usageLocation: s.usageLocation,
      companyName: s.companyName,
      officeLocation: s.officeLocation,
      licenseSkus: s.licenseSkus || [],
    });
    this._saveTemplates(templates);
    Toast.show('Template saved', 'success');
  },

  /* ----------------------------------------------------------
     Creation Wizard
     ---------------------------------------------------------- */

  showWizard(template) {
    const tenantId = AppState.get('activeTenant');
    if (!tenantId || tenantId === 'all') {
      return Toast.show('Select a single tenant before creating a user', 'warning');
    }

    this._wizardState = {
      step: 1,
      firstName: '',
      lastName: '',
      displayName: '',
      upn: '',
      mailNickname: '',
      password: this._generatePassword(),
      forceChangePassword: true,
      jobTitle: template?.jobTitle || '',
      department: template?.department || '',
      usageLocation: template?.usageLocation || 'US',
      officeLocation: template?.officeLocation || '',
      mobilePhone: '',
      companyName: template?.companyName || '',
      licenseSkus: template?.licenseSkus || [],
    };

    // Load SKUs for the tenant
    const skus = AppState.get('subscribedSkus')?.[tenantId];
    if (!skus) {
      Graph.loadSubscribedSkus(tenantId).catch(() => {});
    }

    this._renderWizard();
  },

  _renderWizard() {
    document.getElementById('userCreateWizard')?.remove();
    const s = this._wizardState;
    const steps = ['Basic Info', 'Details', 'Licenses', 'Review'];

    const modal = document.createElement('div');
    modal.id = 'userCreateWizard';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:600px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Create User</h3>
          <button class="modal-close" onclick="document.getElementById('userCreateWizard').remove()">
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
        <div class="modal-body" style="min-height:280px;max-height:60vh;overflow-y:auto;" id="userWizardBody">
          ${this._wizardStep()}
        </div>
        <div class="modal-footer">
          ${s.step > 1 ? '<button class="btn btn-ghost" onclick="UserCreation._wizardBack()">Back</button>' : '<span></span>'}
          <div class="flex gap-2">
            ${s.step === 3 ? '<button class="btn btn-secondary btn-sm" onclick="UserCreation._saveAsTemplate()">Save as Template</button>' : ''}
            ${s.step < 4
              ? '<button class="btn btn-primary" onclick="UserCreation._wizardNext()">Next</button>'
              : '<button class="btn btn-primary" id="userCreateBtn" onclick="UserCreation._wizardCreate()">Create User</button>'}
          </div>
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _wizardStep() {
    switch (this._wizardState.step) {
      case 1: return this._step1();
      case 2: return this._step2();
      case 3: return this._step3();
      case 4: return this._step4();
    }
  },

  _step1() {
    const s = this._wizardState;
    return `
      <p class="text-sm text-muted mb-3">Enter the user's basic identity information.</p>
      <div class="grid grid-2 gap-3 mb-3">
        <div>
          <label class="form-label">First Name *</label>
          <input class="form-input" id="ucFirstName" type="text" value="${s.firstName}" oninput="UserCreation._updateNames()">
        </div>
        <div>
          <label class="form-label">Last Name *</label>
          <input class="form-input" id="ucLastName" type="text" value="${s.lastName}" oninput="UserCreation._updateNames()">
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Display Name *</label>
        <input class="form-input" id="ucDisplayName" type="text" value="${s.displayName}">
      </div>
      <div class="mb-3">
        <label class="form-label">User Principal Name (email) *</label>
        <input class="form-input" id="ucUPN" type="email" value="${s.upn}" placeholder="user@domain.com">
        <div class="text-xs text-muted mt-1">Will be auto-generated from first+last name if left empty</div>
      </div>
      <div class="mb-3">
        <label class="form-label">Mail Nickname</label>
        <input class="form-input" id="ucMailNickname" type="text" value="${s.mailNickname}" placeholder="Auto-generated from UPN">
      </div>
      <div class="mb-3">
        <label class="form-label">Password *</label>
        <div class="flex gap-2">
          <input class="form-input" id="ucPassword" type="text" value="${s.password}" style="flex:1;font-family:var(--font-mono);font-size:13px;">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('ucPassword').value=UserCreation._generatePassword();" style="white-space:nowrap;">Generate</button>
        </div>
      </div>
      <label class="flex items-center gap-2">
        <input type="checkbox" id="ucForceChange" ${s.forceChangePassword ? 'checked' : ''}>
        <span class="text-sm">Force password change on first sign-in</span>
      </label>`;
  },

  _updateNames() {
    const first = document.getElementById('ucFirstName')?.value || '';
    const last = document.getElementById('ucLastName')?.value || '';
    const displayEl = document.getElementById('ucDisplayName');
    const upnEl = document.getElementById('ucUPN');

    if (displayEl && !displayEl._userEdited) {
      displayEl.value = [first, last].filter(Boolean).join(' ');
    }
    if (upnEl && !upnEl.value) {
      // Auto-generate UPN hint (user will need to add domain)
      const nick = [first.toLowerCase(), last.toLowerCase()].filter(Boolean).join('.');
      if (nick) {
        const tenantId = AppState.get('activeTenant');
        const tenant = AppState.get('tenants').find(t => t.id === tenantId);
        const domain = tenant?.defaultDomainName || tenant?.displayName?.replace(/\s/g, '').toLowerCase() + '.onmicrosoft.com' || '';
        upnEl.placeholder = nick + '@' + domain;
      }
    }
  },

  _step2() {
    const s = this._wizardState;
    return `
      <p class="text-sm text-muted mb-3">Additional user details (optional but recommended).</p>
      <div class="grid grid-2 gap-3 mb-3">
        <div>
          <label class="form-label">Job Title</label>
          <input class="form-input" id="ucJobTitle" type="text" value="${s.jobTitle}">
        </div>
        <div>
          <label class="form-label">Department</label>
          <input class="form-input" id="ucDepartment" type="text" value="${s.department}">
        </div>
      </div>
      <div class="grid grid-2 gap-3 mb-3">
        <div>
          <label class="form-label">Company Name</label>
          <input class="form-input" id="ucCompanyName" type="text" value="${s.companyName}">
        </div>
        <div>
          <label class="form-label">Office Location</label>
          <input class="form-input" id="ucOfficeLocation" type="text" value="${s.officeLocation}">
        </div>
      </div>
      <div class="grid grid-2 gap-3 mb-3">
        <div>
          <label class="form-label">Mobile Phone</label>
          <input class="form-input" id="ucMobilePhone" type="tel" value="${s.mobilePhone}" placeholder="+1 555 000 0000">
        </div>
        <div>
          <label class="form-label">Usage Location *</label>
          <select class="form-input" id="ucUsageLocation">
            ${this._countries.map(c => `<option value="${c.code}" ${s.usageLocation === c.code ? 'selected' : ''}>${c.label} (${c.code})</option>`).join('')}
          </select>
          <div class="text-xs text-muted mt-1">Required for license assignment</div>
        </div>
      </div>`;
  },

  _step3() {
    const s = this._wizardState;
    const tenantId = AppState.get('activeTenant');
    const skus = (AppState.get('subscribedSkus') || {})[tenantId] || [];

    return `
      <p class="text-sm text-muted mb-3">Assign licenses to the new user. Usage location is required for licensing.</p>
      ${skus.length === 0 ? `
        <div class="text-center text-muted" style="padding:2rem;">
          <p class="mb-2">No license SKUs loaded.</p>
          <button class="btn btn-secondary btn-sm" onclick="Graph.loadSubscribedSkus('${tenantId}').then(() => { document.getElementById('userWizardBody').innerHTML = UserCreation._step3(); })">Load SKUs</button>
        </div>
      ` : `
        <div style="max-height:350px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px;">
          ${skus.map(sku => {
            const name = this._getSkuName(sku);
            const available = (sku.prepaidUnits?.enabled || 0) - (sku.consumedUnits || 0);
            const checked = s.licenseSkus.includes(sku.skuId);
            return `
              <label class="flex items-center gap-3" style="padding:8px 4px;border-bottom:1px solid var(--border-light);cursor:pointer;">
                <input type="checkbox" class="uc-sku-cb" value="${sku.skuId}" ${checked ? 'checked' : ''}>
                <div style="flex:1;">
                  <div class="text-sm fw-500">${name}</div>
                  <div class="text-xs text-muted">${sku.skuPartNumber} &middot; ${available} available of ${sku.prepaidUnits?.enabled || 0}</div>
                </div>
                ${available <= 0 ? '<span class="badge badge-danger">No seats</span>' : `<span class="badge badge-success">${available} left</span>`}
              </label>`;
          }).join('')}
        </div>
      `}`;
  },

  _step4() {
    const s = this._wizardState;
    const tenantId = AppState.get('activeTenant');
    const skus = (AppState.get('subscribedSkus') || {})[tenantId] || [];
    const selectedSkus = skus.filter(sk => s.licenseSkus.includes(sk.skuId));

    return `
      <h3 class="text-sm fw-500 mb-3">Review New User</h3>
      <div class="card" style="padding:16px;border:1px solid var(--border);">
        <div class="mb-3">
          <div class="text-xs text-muted">Display Name</div>
          <div class="fw-500">${s.displayName || '<span class="text-danger">Not set</span>'}</div>
        </div>
        <div class="mb-3">
          <div class="text-xs text-muted">User Principal Name</div>
          <div class="text-sm text-mono">${s.upn || '<span class="text-danger">Not set</span>'}</div>
        </div>
        <div class="mb-3">
          <div class="text-xs text-muted">Password</div>
          <div class="text-sm text-mono">${s.password}</div>
          <div class="text-xs text-muted">${s.forceChangePassword ? 'Must change on first sign-in' : 'No change required'}</div>
        </div>
        ${s.jobTitle || s.department ? `
          <div class="mb-3">
            <div class="text-xs text-muted">Role</div>
            <div class="text-sm">${[s.jobTitle, s.department].filter(Boolean).join(' — ')}</div>
          </div>
        ` : ''}
        ${s.companyName ? `<div class="mb-3"><div class="text-xs text-muted">Company</div><div class="text-sm">${s.companyName}</div></div>` : ''}
        <div class="mb-3">
          <div class="text-xs text-muted">Usage Location</div>
          <div class="text-sm">${s.usageLocation || 'Not set'}</div>
        </div>
        <div>
          <div class="text-xs text-muted">Licenses (${selectedSkus.length})</div>
          ${selectedSkus.length === 0 ? '<div class="text-sm text-muted">None assigned</div>' :
            selectedSkus.map(sk => `<span class="badge badge-info" style="margin:2px;">${this._getSkuName(sk)}</span>`).join('')}
        </div>
      </div>
      <div class="text-xs text-muted mt-3">The user will be created in <strong>${AppState.getTenantName(tenantId)}</strong>.</div>`;
  },

  _captureStep(step) {
    const s = this._wizardState;
    if (step === 1) {
      s.firstName = document.getElementById('ucFirstName')?.value || '';
      s.lastName = document.getElementById('ucLastName')?.value || '';
      s.displayName = document.getElementById('ucDisplayName')?.value || '';
      s.upn = document.getElementById('ucUPN')?.value || '';
      s.mailNickname = document.getElementById('ucMailNickname')?.value || '';
      s.password = document.getElementById('ucPassword')?.value || '';
      s.forceChangePassword = document.getElementById('ucForceChange')?.checked ?? true;
    }
    if (step === 2) {
      s.jobTitle = document.getElementById('ucJobTitle')?.value || '';
      s.department = document.getElementById('ucDepartment')?.value || '';
      s.companyName = document.getElementById('ucCompanyName')?.value || '';
      s.officeLocation = document.getElementById('ucOfficeLocation')?.value || '';
      s.mobilePhone = document.getElementById('ucMobilePhone')?.value || '';
      s.usageLocation = document.getElementById('ucUsageLocation')?.value || 'US';
    }
    if (step === 3) {
      const cbs = document.querySelectorAll('.uc-sku-cb:checked');
      s.licenseSkus = Array.from(cbs).map(cb => cb.value);
    }
  },

  _wizardBack() {
    this._captureStep(this._wizardState.step);
    this._wizardState.step--;
    this._renderWizard();
  },

  _wizardNext() {
    const s = this._wizardState;
    this._captureStep(s.step);

    if (s.step === 1) {
      if (!s.displayName.trim()) return Toast.show('Display name is required', 'warning');
      if (!s.upn.trim()) return Toast.show('User principal name is required', 'warning');
      if (!s.upn.includes('@')) return Toast.show('UPN must be a valid email address', 'warning');
      if (!s.password || s.password.length < 8) return Toast.show('Password must be at least 8 characters', 'warning');
      if (!s.mailNickname) s.mailNickname = s.upn.split('@')[0];
    }

    s.step++;
    this._renderWizard();
  },

  async _wizardCreate() {
    const btn = document.getElementById('userCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    const s = this._wizardState;
    const tenantId = AppState.get('activeTenant');

    const payload = {
      accountEnabled: true,
      displayName: s.displayName.trim(),
      userPrincipalName: s.upn.trim(),
      mailNickname: s.mailNickname || s.upn.split('@')[0],
      passwordProfile: {
        forceChangePasswordNextSignIn: s.forceChangePassword,
        password: s.password
      },
      usageLocation: s.usageLocation || 'US',
    };

    // Add optional fields
    if (s.firstName) payload.givenName = s.firstName;
    if (s.lastName) payload.surname = s.lastName;
    if (s.jobTitle) payload.jobTitle = s.jobTitle;
    if (s.department) payload.department = s.department;
    if (s.companyName) payload.companyName = s.companyName;
    if (s.officeLocation) payload.officeLocation = s.officeLocation;
    if (s.mobilePhone) payload.mobilePhone = s.mobilePhone;

    try {
      const user = await Graph.createUser(tenantId, payload);

      // Assign licenses if selected
      if (s.licenseSkus.length > 0 && user?.id) {
        try {
          const addLicenses = s.licenseSkus.map(skuId => ({ skuId, disabledPlans: [] }));
          await Graph.call(tenantId, `/users/${user.id}/assignLicense`, {
            method: 'POST',
            body: { addLicenses, removeLicenses: [] }
          });
        } catch (licErr) {
          Toast.show('User created but license assignment failed: ' + licErr.message, 'warning');
        }
      }

      Toast.show(`User "${s.displayName}" created successfully`, 'success');
      document.getElementById('userCreateWizard')?.remove();

      // Refresh users
      await Graph.loadUsers(tenantId).catch(() => {});
      if (typeof Users !== 'undefined') Users.render();

    } catch (err) {
      Toast.show('Failed to create user: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create User'; }
    }
  },
};
