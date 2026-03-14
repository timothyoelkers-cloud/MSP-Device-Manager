/* ============================================================
   Policy Wizard — Step-by-step guided policy creation
   ============================================================ */

const PolicyWizard = {
  _step: 0,
  _data: {},
  _templates: [
    {
      id: 'baseline-compliance',
      name: 'Baseline Compliance Policy',
      desc: 'Require encryption, password, and OS version',
      category: 'compliance',
      settings: { requireEncryption: true, minPasswordLength: 8, requireOsUpdate: true }
    },
    {
      id: 'mfa-all-users',
      name: 'MFA for All Users',
      desc: 'Require multi-factor authentication for all cloud apps',
      category: 'conditional-access',
      settings: { users: 'All', apps: 'All', grantControls: ['mfa'] }
    },
    {
      id: 'block-legacy-auth',
      name: 'Block Legacy Authentication',
      desc: 'Block Exchange ActiveSync and other legacy protocols',
      category: 'conditional-access',
      settings: { users: 'All', clientApps: ['exchangeActiveSync', 'other'], grantControls: ['block'] }
    },
    {
      id: 'device-compliance-req',
      name: 'Require Compliant Device',
      desc: 'Only allow access from Intune-compliant devices',
      category: 'conditional-access',
      settings: { users: 'All', apps: 'All', grantControls: ['compliantDevice'] }
    },
    {
      id: 'windows-update-ring',
      name: 'Windows Update Ring',
      desc: 'Standard update ring with 7-day deferral',
      category: 'update',
      settings: { qualityDeferral: 7, featureDeferral: 30, autoRestart: true }
    },
    {
      id: 'bitlocker-encryption',
      name: 'BitLocker Encryption',
      desc: 'Enable BitLocker for all Windows devices',
      category: 'security',
      settings: { encryptionMethod: 'xtsAes256', requireStartupPin: false }
    }
  ],

  show() {
    this._step = 0;
    this._data = { template: null, tenants: [], name: '', description: '' };
    this._render();
  },

  _render() {
    const existing = document.getElementById('policyWizardModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'policyWizardModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg" style="max-width:700px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Policy Deployment Wizard</h3>
            <p class="text-xs text-muted">Step ${this._step + 1} of 4</p>
          </div>
          <button class="modal-close" onclick="PolicyWizard.close()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <!-- Progress -->
        <div style="display:flex;padding:0 24px;gap:4px;padding-top:16px;">
          ${['Choose Template', 'Select Tenants', 'Configure', 'Review & Deploy'].map((label, i) => `
            <div style="flex:1;text-align:center;">
              <div style="height:4px;border-radius:2px;background:${i <= this._step ? 'var(--primary)' : 'var(--gray-200)'};margin-bottom:6px;transition:background 0.3s;"></div>
              <span class="text-xs ${i <= this._step ? 'text-primary fw-600' : 'text-muted'}">${label}</span>
            </div>
          `).join('')}
        </div>
        <div class="modal-body" style="min-height:300px;">
          ${this._renderStep()}
        </div>
        <div class="modal-footer">
          ${this._step > 0 ? `<button class="btn btn-secondary" onclick="PolicyWizard.prev()">Back</button>` : '<div></div>'}
          ${this._step < 3 ? `
            <button class="btn btn-primary" onclick="PolicyWizard.next()">Continue</button>
          ` : `
            <button class="btn btn-primary" onclick="PolicyWizard.deploy()">Deploy Policy</button>
          `}
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) PolicyWizard.close(); });
    document.body.appendChild(modal);
  },

  _renderStep() {
    switch (this._step) {
      case 0: return this._stepTemplate();
      case 1: return this._stepTenants();
      case 2: return this._stepConfigure();
      case 3: return this._stepReview();
    }
  },

  _stepTemplate() {
    const categories = [...new Set(this._templates.map(t => t.category))];
    return `
      <p class="text-sm mb-4">Choose a policy template to deploy across your tenants.</p>
      ${categories.map(cat => `
        <div class="mb-4">
          <div class="text-xs fw-600 text-muted mb-2" style="text-transform:uppercase;">${cat.replace('-', ' ')}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
            ${this._templates.filter(t => t.category === cat).map(t => `
              <div class="card card-interactive" style="padding:12px 16px;border:2px solid ${this._data.template?.id === t.id ? 'var(--primary)' : 'var(--border)'};"
                   onclick="PolicyWizard._data.template=${JSON.stringify(t).replace(/"/g, '&quot;')}; PolicyWizard._render();">
                <div class="fw-500 text-sm">${t.name}</div>
                <div class="text-xs text-muted mt-1">${t.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    `;
  },

  _stepTenants() {
    const tenants = AppState.get('tenants');
    return `
      <p class="text-sm mb-4">Select which tenants to deploy this policy to.</p>
      <div class="mb-3">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 0;">
          <input type="checkbox" class="table-checkbox" id="wizAllTenants"
            ${this._data.tenants.length === tenants.length ? 'checked' : ''}
            onchange="PolicyWizard._toggleAllTenants(this.checked)">
          <span class="text-sm fw-500">Select All Tenants</span>
        </label>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:250px;overflow-y:auto;">
        ${tenants.map(t => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 8px;border-radius:var(--radius-md);border:1px solid var(--border-light);">
            <input type="checkbox" class="table-checkbox" value="${t.id}"
              ${this._data.tenants.includes(t.id) ? 'checked' : ''}
              onchange="PolicyWizard._toggleTenant('${t.id}', this.checked)">
            <span class="text-sm">${t.displayName}</span>
            <span class="text-xs text-mono text-muted" style="margin-left:auto;">${t.id.substring(0, 8)}...</span>
          </label>
        `).join('')}
      </div>
    `;
  },

  _stepConfigure() {
    const tmpl = this._data.template;
    return `
      <p class="text-sm mb-4">Configure the policy settings before deployment.</p>
      <div class="form-group mb-4">
        <label class="form-label">Policy Name</label>
        <input type="text" class="form-input" value="${this._data.name || tmpl?.name || ''}"
          onchange="PolicyWizard._data.name = this.value" placeholder="Enter policy name">
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" rows="2" onchange="PolicyWizard._data.description = this.value"
          placeholder="Optional description">${this._data.description || ''}</textarea>
      </div>
      ${tmpl ? `
        <div class="detail-section">
          <div class="detail-section-title">Template Settings</div>
          ${Object.entries(tmpl.settings).map(([k, v]) => `
            <div class="detail-row">
              <span class="detail-label">${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
              <span class="detail-value">${Array.isArray(v) ? v.join(', ') : String(v)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  },

  _stepReview() {
    const tmpl = this._data.template;
    const tenants = AppState.get('tenants');
    const selectedTenants = tenants.filter(t => this._data.tenants.includes(t.id));
    return `
      <p class="text-sm mb-4">Review your policy deployment before proceeding.</p>
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div class="detail-row"><span class="detail-label">Template</span><span class="detail-value">${tmpl?.name || 'None'}</span></div>
        <div class="detail-row"><span class="detail-label">Policy Name</span><span class="detail-value">${this._data.name || tmpl?.name || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${tmpl?.category || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${this._data.description || 'None'}</span></div>
      </div>
      <div class="text-xs fw-600 text-muted mb-2" style="text-transform:uppercase;">Target Tenants (${selectedTenants.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
        ${selectedTenants.map(t => `<span class="chip">${t.displayName}</span>`).join('')}
      </div>
      <div class="tier-banner free" style="margin:0;">
        <div class="tier-banner-text">
          <strong>Note:</strong> This will save the policy as a template. Actual Graph API deployment requires write permissions and is simulated in preview mode.
        </div>
      </div>
    `;
  },

  _toggleAllTenants(checked) {
    const tenants = AppState.get('tenants');
    this._data.tenants = checked ? tenants.map(t => t.id) : [];
    this._render();
  },

  _toggleTenant(id, checked) {
    if (checked && !this._data.tenants.includes(id)) this._data.tenants.push(id);
    if (!checked) this._data.tenants = this._data.tenants.filter(t => t !== id);
    this._render();
  },

  next() {
    if (this._step === 0 && !this._data.template) {
      Toast.show('Please select a template', 'warning');
      return;
    }
    if (this._step === 1 && this._data.tenants.length === 0) {
      Toast.show('Please select at least one tenant', 'warning');
      return;
    }
    if (this._step === 2) {
      if (!this._data.name) this._data.name = this._data.template?.name || 'Untitled Policy';
    }
    this._step = Math.min(3, this._step + 1);
    this._render();
  },

  prev() {
    this._step = Math.max(0, this._step - 1);
    this._render();
  },

  deploy() {
    // Save as template in localStorage
    const tmpl = this._data.template;
    const templates = JSON.parse(localStorage.getItem('msp_policy_templates') || '[]');
    templates.push({
      name: this._data.name || tmpl?.name,
      description: this._data.description,
      category: tmpl?.category,
      settings: tmpl?.settings,
      tenants: this._data.tenants,
      deployedAt: new Date().toISOString()
    });
    localStorage.setItem('msp_policy_templates', JSON.stringify(templates));

    // Log to audit
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('Policy Deployed', `Deployed "${this._data.name}" to ${this._data.tenants.length} tenant(s)`, null, 'action');
    }

    Toast.show(`Policy "${this._data.name}" deployed to ${this._data.tenants.length} tenant(s)`, 'success');
    this.close();
  },

  close() {
    const modal = document.getElementById('policyWizardModal');
    if (modal) modal.remove();
  }
};
