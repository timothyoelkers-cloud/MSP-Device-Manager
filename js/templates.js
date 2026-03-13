/* ============================================================
   Policy Templates — Cross-tenant policy sync & management
   ============================================================ */

const Templates = {
  viewTab: 'templates', // templates | compare

  render() {
    const main = document.getElementById('mainContent');
    const templates = this._getTemplates();
    const tenants = AppState.get('tenants');

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Policy Templates</h1>
          <p class="page-subtitle">Create gold-standard policies and deploy across tenants</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Templates.showCreateModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Template
          </button>
        </div>
      </div>

      <div class="tabs mb-4">
        <button class="tab ${this.viewTab === 'templates' ? 'active' : ''}" onclick="Templates.viewTab='templates'; Templates.render();">Templates (${templates.length})</button>
        <button class="tab ${this.viewTab === 'compare' ? 'active' : ''}" onclick="Templates.viewTab='compare'; Templates.render();">Cross-Tenant Compare</button>
      </div>

      <div id="templatesContent">
        ${this.viewTab === 'templates' ? this._renderTemplates(templates, tenants) : this._renderCompare(tenants)}
      </div>

      <!-- Create Template Modal -->
      <div class="modal-overlay hidden" id="createTemplateModal">
        <div class="modal" style="max-width:600px;">
          <div class="modal-header">
            <h3 class="modal-title">Create Policy Template</h3>
            <button class="modal-close" onclick="document.getElementById('createTemplateModal').classList.add('hidden')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="createTemplateBody"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('createTemplateModal').classList.add('hidden')">Cancel</button>
            <button class="btn btn-primary" onclick="Templates.saveTemplate()">Save Template</button>
          </div>
        </div>
      </div>

      <!-- Deploy Modal -->
      <div class="modal-overlay hidden" id="deployTemplateModal">
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <h3 class="modal-title">Deploy Template</h3>
            <button class="modal-close" onclick="document.getElementById('deployTemplateModal').classList.add('hidden')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="deployTemplateBody"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('deployTemplateModal').classList.add('hidden')">Cancel</button>
            <button class="btn btn-primary" onclick="Templates.executeDeploy()">Deploy to Selected Tenants</button>
          </div>
        </div>
      </div>
    `;
  },

  _renderTemplates(templates, tenants) {
    if (templates.length === 0) {
      return `<div class="card"><div class="empty-state" style="padding:3rem;">
        <h3 class="empty-state-title">No Templates Yet</h3>
        <p class="empty-state-text">Create a policy template from an existing tenant's policies, then deploy it across all your managed tenants.</p>
        <button class="btn btn-primary" onclick="Templates.showCreateModal()">Create First Template</button>
      </div></div>`;
    }

    return `<div class="grid grid-auto gap-4">
      ${templates.map((tpl, i) => `
        <div class="card">
          <div style="padding:16px;">
            <div class="flex items-center justify-between mb-2">
              <span class="badge ${tpl.type === 'compliance' ? 'badge-blue' : 'badge-default'}">${tpl.type === 'compliance' ? 'Compliance' : 'Configuration'}</span>
              <span class="badge badge-default">${tpl.platform}</span>
            </div>
            <div class="fw-500 mb-1">${tpl.name}</div>
            <div class="text-xs text-muted mb-3">${tpl.description || 'No description'}</div>
            <div class="text-xs text-muted mb-3">${Object.keys(tpl.settings || {}).length} setting(s) configured</div>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm" onclick="Templates.showDeployModal(${i})">Deploy</button>
              <button class="btn btn-secondary btn-sm" onclick="Templates.viewTemplate(${i})">View</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="Templates.deleteTemplate(${i})">Delete</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
  },

  _renderCompare(tenants) {
    if (tenants.length < 2) return '<div class="card"><div class="empty-state" style="padding:2rem;"><p class="text-muted">Connect at least 2 tenants to compare policies.</p></div></div>';

    const compliancePolicies = {};
    const configProfiles = {};
    tenants.forEach(t => {
      compliancePolicies[t.id] = AppState.get('compliancePolicies')[t.id] || [];
      configProfiles[t.id] = AppState.get('configProfiles')[t.id] || [];
    });

    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Compliance Policies</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr><th style="min-width:200px;">Tenant</th><th>Policy Count</th><th>Policies</th></tr></thead>
            <tbody>${tenants.map(t => {
              const policies = compliancePolicies[t.id];
              return `<tr>
                <td class="fw-500">${t.displayName}</td>
                <td>${policies.length}</td>
                <td class="text-sm">${policies.map(p => `<span class="chip" style="margin:2px;">${p.displayName || 'Unnamed'}</span>`).join('') || '<span class="text-muted">None</span>'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-header-title">Configuration Profiles</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr><th style="min-width:200px;">Tenant</th><th>Profile Count</th><th>Profiles</th></tr></thead>
            <tbody>${tenants.map(t => {
              const profiles = configProfiles[t.id];
              return `<tr>
                <td class="fw-500">${t.displayName}</td>
                <td>${profiles.length}</td>
                <td class="text-sm">${profiles.map(p => `<span class="chip" style="margin:2px;">${p.displayName || 'Unnamed'}</span>`).join('') || '<span class="text-muted">None</span>'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  showCreateModal() {
    const tenants = AppState.get('tenants');
    document.getElementById('createTemplateBody').innerHTML = `
      <div class="form-group mb-3">
        <label class="form-label">Template Name</label>
        <input type="text" class="form-input" id="tplName" placeholder="e.g. Standard Compliance - Windows">
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="tplDesc" placeholder="Optional description">
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Type</label>
        <select class="form-input" id="tplType">
          <option value="compliance">Compliance Policy</option>
          <option value="configuration">Configuration Profile</option>
        </select>
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Platform</label>
        <select class="form-input" id="tplPlatform">
          <option value="windows10">Windows 10/11</option>
          <option value="ios">iOS/iPadOS</option>
          <option value="macos">macOS</option>
          <option value="android">Android</option>
        </select>
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Import from existing tenant (optional)</label>
        <select class="form-input" id="tplSourceTenant">
          <option value="">— Create from scratch —</option>
          ${tenants.map(t => `<option value="${t.id}">${t.displayName}</option>`).join('')}
        </select>
        <span class="form-hint">Select a tenant to import its policies as a starting template</span>
      </div>
      <div id="tplSettingsArea">
        <div class="form-group mb-3">
          <label class="form-label">Settings (JSON)</label>
          <textarea class="form-input" id="tplSettings" rows="6" placeholder='{"passwordRequired": true, "osMinimumVersion": "10.0.19045"}'></textarea>
          <span class="form-hint">Policy settings in JSON format. These will be sent as the policy body.</span>
        </div>
      </div>
    `;
    document.getElementById('createTemplateModal').classList.remove('hidden');

    // Auto-load settings when source tenant is selected
    document.getElementById('tplSourceTenant').addEventListener('change', async (e) => {
      const tenantId = e.target.value;
      if (!tenantId) return;
      const type = document.getElementById('tplType').value;
      const policies = type === 'compliance'
        ? (AppState.get('compliancePolicies')[tenantId] || [])
        : (AppState.get('configProfiles')[tenantId] || []);
      if (policies.length > 0) {
        const first = policies[0];
        document.getElementById('tplSettings').value = JSON.stringify(first, null, 2);
        if (!document.getElementById('tplName').value) {
          document.getElementById('tplName').value = (first.displayName || '') + ' (Template)';
        }
      }
    });
  },

  saveTemplate() {
    const name = document.getElementById('tplName')?.value?.trim();
    if (!name) { Toast.show('Template name is required', 'warning'); return; }
    let settings = {};
    try {
      const raw = document.getElementById('tplSettings')?.value?.trim();
      if (raw) settings = JSON.parse(raw);
    } catch { Toast.show('Invalid JSON in settings', 'error'); return; }

    const template = {
      name,
      description: document.getElementById('tplDesc')?.value?.trim() || '',
      type: document.getElementById('tplType')?.value || 'compliance',
      platform: document.getElementById('tplPlatform')?.value || 'windows10',
      settings,
      createdAt: new Date().toISOString()
    };

    const templates = this._getTemplates();
    templates.push(template);
    this._saveTemplates(templates);
    document.getElementById('createTemplateModal').classList.add('hidden');
    Toast.show('Template saved', 'success');
    this.render();
  },

  _deployingTemplateIdx: null,

  showDeployModal(idx) {
    this._deployingTemplateIdx = idx;
    const templates = this._getTemplates();
    const tpl = templates[idx];
    const tenants = AppState.get('tenants');

    document.getElementById('deployTemplateBody').innerHTML = `
      <p class="text-sm mb-3">Deploy <strong>${tpl.name}</strong> to selected tenants:</p>
      <div class="flex flex-col gap-2">
        ${tenants.map(t => `
          <label class="flex items-center gap-2" style="cursor:pointer;">
            <input type="checkbox" class="deploy-tenant-cb" value="${t.id}" checked>
            <span class="text-sm">${t.displayName}</span>
          </label>
        `).join('')}
      </div>
    `;
    document.getElementById('deployTemplateModal').classList.remove('hidden');
  },

  async executeDeploy() {
    const idx = this._deployingTemplateIdx;
    const templates = this._getTemplates();
    const tpl = templates[idx];
    if (!tpl) return;

    const checkboxes = document.querySelectorAll('.deploy-tenant-cb:checked');
    const tenantIds = Array.from(checkboxes).map(cb => cb.value);
    if (tenantIds.length === 0) { Toast.show('Select at least one tenant', 'warning'); return; }

    document.getElementById('deployTemplateModal').classList.add('hidden');
    Toast.show(`Deploying "${tpl.name}" to ${tenantIds.length} tenant(s)...`, 'info');

    let success = 0, fail = 0;
    for (const tid of tenantIds) {
      try {
        if (tpl.type === 'compliance') {
          await Graph.createCompliancePolicy(tid, tpl.settings);
        } else {
          await Graph.createConfigProfile(tid, tpl.settings);
        }
        success++;
      } catch (err) {
        console.error(`Deploy to ${tid} failed:`, err);
        fail++;
      }
    }

    if (fail === 0) {
      Toast.show(`Successfully deployed to ${success} tenant(s)`, 'success');
    } else {
      Toast.show(`Deployed to ${success}, failed on ${fail} tenant(s)`, 'warning');
    }

    // Reload policies
    for (const tid of tenantIds) {
      if (tpl.type === 'compliance') {
        Graph.loadCompliancePolicies(tid).catch(() => {});
      } else {
        Graph.loadConfigProfiles(tid).catch(() => {});
      }
    }
  },

  viewTemplate(idx) {
    const templates = this._getTemplates();
    const tpl = templates[idx];
    const main = document.getElementById('templatesContent');
    main.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">${tpl.name}</div>
          <button class="btn btn-ghost btn-sm" onclick="Templates.render()">Back</button>
        </div>
        <div class="card-body">
          <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${tpl.type}</span></div>
          <div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">${tpl.platform}</span></div>
          <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${tpl.description || '-'}</span></div>
          <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString() : '-'}</span></div>
          <div class="detail-section-title" style="margin-top:16px;">Settings (JSON)</div>
          <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;max-height:400px;">${JSON.stringify(tpl.settings, null, 2)}</pre>
        </div>
      </div>
    `;
  },

  deleteTemplate(idx) {
    if (!confirm('Delete this template?')) return;
    const templates = this._getTemplates();
    templates.splice(idx, 1);
    this._saveTemplates(templates);
    Toast.show('Template deleted', 'info');
    this.render();
  },

  _getTemplates() {
    try { return JSON.parse(localStorage.getItem('msp_policy_templates') || '[]'); } catch { return []; }
  },

  _saveTemplates(templates) {
    localStorage.setItem('msp_policy_templates', JSON.stringify(templates));
  }
};
