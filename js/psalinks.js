/* ============================================================
   PSA Links — PSA/Ticketing system integration & quick links
   ============================================================ */

const PSALinks = {
  STORAGE_KEY: 'psa_configurations',

  // Supported PSA systems with default URL templates and icons
  systems: {
    connectwise: {
      name: 'ConnectWise Manage',
      urlTemplate: 'https://{instance}.connectwise.com/v4_6_release/services/system_io/Service/fv_sr100_request.rails?service_recid={ticketId}',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>`,
      color: '#0072CE'
    },
    autotask: {
      name: 'Autotask / Datto',
      urlTemplate: 'https://{instance}.autotask.net/Mvc/ServiceDesk/TicketDetail.mvc?ticketId={ticketId}',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h4"/></svg>`,
      color: '#00A1E0'
    },
    halo: {
      name: 'HaloPSA',
      urlTemplate: 'https://{instance}.halopsa.com/tickets?ticketid={ticketId}',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>`,
      color: '#6C2BD9'
    },
    freshdesk: {
      name: 'Freshdesk',
      urlTemplate: 'https://{instance}.freshdesk.com/a/tickets/{ticketId}',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8"/><path d="M8 13h6"/></svg>`,
      color: '#25C16F'
    },
    zendesk: {
      name: 'Zendesk',
      urlTemplate: 'https://{instance}.zendesk.com/agent/tickets/{ticketId}',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 22 22 22"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="18" r="0.5"/></svg>`,
      color: '#03363D'
    },
    servicenow: {
      name: 'ServiceNow',
      urlTemplate: 'https://{instance}.service-now.com/nav_to.do?uri=incident.do?sys_id={ticketId}',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>`,
      color: '#81B5A1'
    },
    custom: {
      name: 'Custom URL',
      urlTemplate: '',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
      color: '#6b7280'
    }
  },

  // ── Persistence ─────────────────────────────────────────────

  _loadConfigs() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('PSALinks: failed to load configs', e);
      return [];
    }
  },

  _saveConfigs(configs) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error('PSALinks: failed to save configs', e);
    }
  },

  // ── CRUD ────────────────────────────────────────────────────

  getAll() {
    return this._loadConfigs();
  },

  getById(id) {
    return this._loadConfigs().find(c => c.id === id) || null;
  },

  getDefaultPSA() {
    const configs = this._loadConfigs();
    return configs.find(c => c.isDefault && c.enabled) || configs.find(c => c.enabled) || null;
  },

  getEnabled() {
    return this._loadConfigs().filter(c => c.enabled);
  },

  add(config) {
    const configs = this._loadConfigs();
    const newConfig = {
      id: 'psa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: config.name || '',
      system: config.system || 'custom',
      instance: config.instance || '',
      urlTemplate: config.urlTemplate || '',
      enabled: config.enabled !== false,
      isDefault: config.isDefault || false
    };

    // If setting as default, clear others
    if (newConfig.isDefault) {
      configs.forEach(c => c.isDefault = false);
    }
    // If first config, make it default
    if (configs.length === 0) {
      newConfig.isDefault = true;
    }

    configs.push(newConfig);
    this._saveConfigs(configs);
    AuditLog.log('psa_integration_added', { name: newConfig.name, system: newConfig.system });
    return newConfig;
  },

  update(id, updates) {
    const configs = this._loadConfigs();
    const idx = configs.findIndex(c => c.id === id);
    if (idx === -1) return null;

    // If setting as default, clear others
    if (updates.isDefault) {
      configs.forEach(c => c.isDefault = false);
    }

    configs[idx] = { ...configs[idx], ...updates, id }; // preserve id
    this._saveConfigs(configs);
    AuditLog.log('psa_integration_updated', { name: configs[idx].name, system: configs[idx].system });
    return configs[idx];
  },

  remove(id) {
    const configs = this._loadConfigs();
    const config = configs.find(c => c.id === id);
    if (!config) return;
    const filtered = configs.filter(c => c.id !== id);

    // If we removed the default, assign a new default
    if (config.isDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }

    this._saveConfigs(filtered);
    AuditLog.log('psa_integration_removed', { name: config.name, system: config.system });
  },

  // ── URL Building ────────────────────────────────────────────

  buildUrl(psaId, replacements) {
    const config = typeof psaId === 'object' ? psaId : this.getById(psaId);
    if (!config) return '';

    let url = config.urlTemplate || '';
    // Fill in {instance} from config
    url = url.replace(/\{instance\}/g, encodeURIComponent(config.instance || ''));

    // Fill in all replacement placeholders
    if (replacements) {
      Object.keys(replacements).forEach(key => {
        const val = replacements[key] != null ? String(replacements[key]) : '';
        url = url.replace(new RegExp('\\{' + key + '\\}', 'g'), encodeURIComponent(val));
      });
    }

    return url;
  },

  _buildReplacements(entityType, entity, tenantName) {
    const base = {
      tenantName: tenantName || '',
      tenantId: entity?.tenantId || entity?.managedTenantId || ''
    };

    if (entityType === 'device') {
      return {
        ...base,
        ticketId: '',
        deviceName: entity?.deviceName || entity?.displayName || '',
        deviceId: entity?.id || '',
        userName: entity?.userPrincipalName || entity?.userDisplayName || '',
        userEmail: entity?.userPrincipalName || ''
      };
    }

    if (entityType === 'user') {
      return {
        ...base,
        ticketId: '',
        userName: entity?.displayName || '',
        userEmail: entity?.userPrincipalName || entity?.mail || '',
        deviceName: '',
        deviceId: ''
      };
    }

    return { ...base, ticketId: '', deviceName: '', deviceId: '', userName: '', userEmail: '' };
  },

  // ── Link Rendering ──────────────────────────────────────────

  createTicketLink(entityType, entity, tenantName) {
    const psa = this.getDefaultPSA();
    if (!psa) {
      return `<button class="btn btn-sm btn-ghost" onclick="Toast.show('No PSA integration configured. Go to Settings → PSA Links to add one.','warning')" title="No PSA configured">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        Create Ticket
      </button>`;
    }

    const replacements = this._buildReplacements(entityType, entity, tenantName);
    const url = this.buildUrl(psa, replacements);
    const sysInfo = this.systems[psa.system] || this.systems.custom;

    return `<a href="${this._escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary" title="Open in ${this._escapeHtml(psa.name)}">
      ${sysInfo.icon}
      <span style="margin-left:4px">Create Ticket</span>
    </a>`;
  },

  renderQuickLink(entityType, entity, tenantName) {
    const psa = this.getDefaultPSA();
    if (!psa) return '';

    const replacements = this._buildReplacements(entityType, entity, tenantName);
    const url = this.buildUrl(psa, replacements);
    const sysInfo = this.systems[psa.system] || this.systems.custom;

    return `<a href="${this._escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-ghost" style="padding:2px 6px;color:${sysInfo.color}" title="Open in ${this._escapeHtml(psa.name)}">
      ${sysInfo.icon}
    </a>`;
  },

  // ── Settings Page Render ────────────────────────────────────

  render() {
    const main = document.getElementById('mainContent');
    const configs = this.getAll();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">PSA / Ticketing Links</h1>
          <p class="page-subtitle">Configure integrations with your PSA or ticketing system for quick ticket creation</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="PSALinks.showAddModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Integration
          </button>
        </div>
      </div>

      <!-- Placeholder descriptions -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 class="card-header-title">URL Template Placeholders</h3>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;font-size:13px">
            <div><code>{ticketId}</code> — Ticket / incident ID</div>
            <div><code>{deviceName}</code> — Device display name</div>
            <div><code>{deviceId}</code> — Intune device ID</div>
            <div><code>{userName}</code> — User display name</div>
            <div><code>{userEmail}</code> — User email / UPN</div>
            <div><code>{tenantName}</code> — Tenant display name</div>
            <div><code>{tenantId}</code> — Azure AD tenant ID</div>
            <div><code>{instance}</code> — PSA instance name</div>
          </div>
        </div>
      </div>

      <!-- Configured integrations -->
      ${configs.length === 0 ? this._renderEmptyState() : this._renderConfigList(configs)}

      <!-- Add/Edit Modal -->
      ${this._renderModal()}
    `;
  },

  _renderEmptyState() {
    return `
      <div class="card">
        <div class="card-body" style="text-align:center;padding:48px 24px">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <h3 style="margin:0 0 8px;color:#1e293b">No PSA Integrations Configured</h3>
          <p style="margin:0 0 20px;color:#64748b">Add a PSA or ticketing system to enable quick ticket creation from devices and users.</p>
          <button class="btn btn-primary" onclick="PSALinks.showAddModal()">Add Your First Integration</button>
        </div>
      </div>
    `;
  },

  _renderConfigList(configs) {
    return `
      <div style="display:grid;gap:12px">
        ${configs.map(c => this._renderConfigCard(c)).join('')}
      </div>
    `;
  },

  _renderConfigCard(config) {
    const sys = this.systems[config.system] || this.systems.custom;
    const statusBadge = config.enabled
      ? '<span class="badge" style="background:#dcfce7;color:#16a34a">Enabled</span>'
      : '<span class="badge" style="background:#fee2e2;color:#dc2626">Disabled</span>';
    const defaultBadge = config.isDefault
      ? '<span class="badge" style="background:#dbeafe;color:#2563eb;margin-left:6px">Default</span>'
      : '';

    return `
      <div class="card" style="border-left:3px solid ${sys.color}">
        <div class="card-body" style="display:flex;align-items:center;gap:16px;padding:16px 20px">
          <div style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:${sys.color}15;display:flex;align-items:center;justify-content:center;color:${sys.color}">
            ${sys.icon.replace('width="16"', 'width="20"').replace('height="16"', 'height="20"')}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <strong style="font-size:14px;color:#1e293b">${this._escapeHtml(config.name)}</strong>
              ${statusBadge}${defaultBadge}
            </div>
            <div style="font-size:12px;color:#64748b">
              ${this._escapeHtml(sys.name)}${config.instance ? ' — ' + this._escapeHtml(config.instance) : ''}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${this._escapeHtml(config.urlTemplate)}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${!config.isDefault && config.enabled ? `
              <button class="btn btn-sm btn-ghost" onclick="PSALinks.setDefault('${config.id}')" title="Set as default">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            ` : ''}
            <button class="btn btn-sm btn-ghost" onclick="PSALinks.testUrl('${config.id}')" title="Test URL">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            <button class="btn btn-sm btn-ghost" onclick="PSALinks.showEditModal('${config.id}')" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-sm btn-danger" onclick="PSALinks.confirmRemove('${config.id}')" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Modal ───────────────────────────────────────────────────

  _renderModal() {
    const systemOptions = Object.entries(this.systems).map(([key, sys]) =>
      `<option value="${key}">${this._escapeHtml(sys.name)}</option>`
    ).join('');

    return `
      <div id="psaModal" class="modal-overlay hidden" onclick="if(event.target===this)PSALinks.closeModal()">
        <div class="modal" style="max-width:560px">
          <div class="modal-header">
            <h3 id="psaModalTitle">Add PSA Integration</h3>
            <button class="btn btn-ghost btn-sm" onclick="PSALinks.closeModal()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" style="padding:20px 24px">
            <input type="hidden" id="psaEditId" value="" />

            <div style="margin-bottom:16px">
              <label class="form-label">PSA System</label>
              <select id="psaSystem" class="form-select" onchange="PSALinks.onSystemChange()">
                <option value="">— Select a system —</option>
                ${systemOptions}
              </select>
            </div>

            <div style="margin-bottom:16px">
              <label class="form-label">Integration Name</label>
              <input type="text" id="psaName" class="form-input" placeholder="e.g. Our ConnectWise Instance" />
            </div>

            <div style="margin-bottom:16px">
              <label class="form-label">Instance Name</label>
              <input type="text" id="psaInstance" class="form-input" placeholder="e.g. mycompany (used in {instance} placeholder)" />
              <small style="color:#64748b;font-size:11px">The subdomain or instance identifier for your PSA system</small>
            </div>

            <div style="margin-bottom:16px">
              <label class="form-label">URL Template</label>
              <input type="text" id="psaUrlTemplate" class="form-input" placeholder="https://{instance}.example.com/tickets/{ticketId}" />
              <small style="color:#64748b;font-size:11px">Use placeholders: {instance}, {ticketId}, {deviceName}, {deviceId}, {userName}, {userEmail}, {tenantName}, {tenantId}</small>
            </div>

            <div style="display:flex;gap:16px;margin-bottom:16px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="psaEnabled" checked />
                <span class="form-label" style="margin:0">Enabled</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="psaDefault" />
                <span class="form-label" style="margin:0">Set as Default</span>
              </label>
            </div>

            <!-- Test URL preview -->
            <div style="margin-bottom:8px">
              <label class="form-label">URL Preview</label>
              <div id="psaUrlPreview" style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#475569;word-break:break-all;min-height:20px">
                Fill in the fields above to see a preview
              </div>
            </div>
          </div>
          <div class="modal-footer" style="display:flex;justify-content:space-between;padding:16px 24px;border-top:1px solid #e2e8f0">
            <button class="btn btn-ghost" onclick="PSALinks.testPreviewUrl()" title="Open preview URL in new tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Test URL
            </button>
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost" onclick="PSALinks.closeModal()">Cancel</button>
              <button class="btn btn-primary" onclick="PSALinks.saveFromModal()">Save Integration</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── Modal Actions ───────────────────────────────────────────

  showAddModal() {
    this.render(); // ensure modal is in DOM
    const modal = document.getElementById('psaModal');
    document.getElementById('psaModalTitle').textContent = 'Add PSA Integration';
    document.getElementById('psaEditId').value = '';
    document.getElementById('psaSystem').value = '';
    document.getElementById('psaName').value = '';
    document.getElementById('psaInstance').value = '';
    document.getElementById('psaUrlTemplate').value = '';
    document.getElementById('psaEnabled').checked = true;
    document.getElementById('psaDefault').checked = this.getAll().length === 0;
    this._updatePreview();
    modal.classList.remove('hidden');
  },

  showEditModal(id) {
    const config = this.getById(id);
    if (!config) return;

    this.render(); // ensure modal is in DOM
    const modal = document.getElementById('psaModal');
    document.getElementById('psaModalTitle').textContent = 'Edit PSA Integration';
    document.getElementById('psaEditId').value = config.id;
    document.getElementById('psaSystem').value = config.system;
    document.getElementById('psaName').value = config.name;
    document.getElementById('psaInstance').value = config.instance;
    document.getElementById('psaUrlTemplate').value = config.urlTemplate;
    document.getElementById('psaEnabled').checked = config.enabled;
    document.getElementById('psaDefault').checked = config.isDefault;
    this._updatePreview();
    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('psaModal')?.classList.add('hidden');
  },

  onSystemChange() {
    const system = document.getElementById('psaSystem').value;
    if (!system) return;

    const sys = this.systems[system];
    if (!sys) return;

    // Auto-fill name if empty
    const nameField = document.getElementById('psaName');
    if (!nameField.value) {
      nameField.value = sys.name;
    }

    // Auto-fill URL template (except custom)
    if (system !== 'custom' && sys.urlTemplate) {
      document.getElementById('psaUrlTemplate').value = sys.urlTemplate;
    }

    this._updatePreview();
  },

  _updatePreview() {
    const el = document.getElementById('psaUrlPreview');
    if (!el) return;

    const template = document.getElementById('psaUrlTemplate')?.value || '';
    const instance = document.getElementById('psaInstance')?.value || 'mycompany';

    if (!template) {
      el.textContent = 'Fill in the fields above to see a preview';
      return;
    }

    let preview = template
      .replace(/\{instance\}/g, instance || '{instance}')
      .replace(/\{ticketId\}/g, '12345')
      .replace(/\{deviceName\}/g, 'DESKTOP-ABC123')
      .replace(/\{deviceId\}/g, 'device-guid-example')
      .replace(/\{userName\}/g, 'John Doe')
      .replace(/\{userEmail\}/g, 'john@contoso.com')
      .replace(/\{tenantName\}/g, 'Contoso Ltd')
      .replace(/\{tenantId\}/g, 'tenant-guid-example');

    el.textContent = preview;
  },

  testPreviewUrl() {
    const template = document.getElementById('psaUrlTemplate')?.value || '';
    const instance = document.getElementById('psaInstance')?.value || '';

    if (!template) {
      Toast.show('Enter a URL template first', 'warning');
      return;
    }

    let url = template
      .replace(/\{instance\}/g, encodeURIComponent(instance || 'test'))
      .replace(/\{ticketId\}/g, '12345')
      .replace(/\{deviceName\}/g, 'DESKTOP-TEST')
      .replace(/\{deviceId\}/g, 'test-device-id')
      .replace(/\{userName\}/g, 'Test+User')
      .replace(/\{userEmail\}/g, 'test@example.com')
      .replace(/\{tenantName\}/g, 'Test+Tenant')
      .replace(/\{tenantId\}/g, 'test-tenant-id');

    window.open(url, '_blank', 'noopener,noreferrer');
  },

  testUrl(id) {
    const config = this.getById(id);
    if (!config) return;

    const url = this.buildUrl(config, {
      ticketId: '12345',
      deviceName: 'DESKTOP-TEST',
      deviceId: 'test-device-id',
      userName: 'Test User',
      userEmail: 'test@example.com',
      tenantName: 'Test Tenant',
      tenantId: 'test-tenant-id'
    });

    window.open(url, '_blank', 'noopener,noreferrer');
  },

  saveFromModal() {
    const editId = document.getElementById('psaEditId')?.value;
    const system = document.getElementById('psaSystem')?.value;
    const name = document.getElementById('psaName')?.value?.trim();
    const instance = document.getElementById('psaInstance')?.value?.trim();
    const urlTemplate = document.getElementById('psaUrlTemplate')?.value?.trim();
    const enabled = document.getElementById('psaEnabled')?.checked;
    const isDefault = document.getElementById('psaDefault')?.checked;

    // Validation
    if (!system) {
      Toast.show('Please select a PSA system', 'warning');
      return;
    }
    if (!name) {
      Toast.show('Please enter a name for this integration', 'warning');
      return;
    }
    if (!urlTemplate) {
      Toast.show('Please enter a URL template', 'warning');
      return;
    }

    const data = { system, name, instance, urlTemplate, enabled, isDefault };

    if (editId) {
      this.update(editId, data);
      Toast.show('Integration updated successfully', 'success');
    } else {
      this.add(data);
      Toast.show('Integration added successfully', 'success');
    }

    this.closeModal();
    this.render();
  },

  setDefault(id) {
    this.update(id, { isDefault: true });
    Toast.show('Default PSA integration updated', 'success');
    this.render();
  },

  confirmRemove(id) {
    const config = this.getById(id);
    if (!config) return;

    if (confirm(`Remove "${config.name}" integration? This cannot be undone.`)) {
      this.remove(id);
      Toast.show('Integration removed', 'success');
      this.render();
    }
  },

  // ── Helpers ─────────────────────────────────────────────────

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

// Update preview when fields change
document.addEventListener('input', (e) => {
  if (['psaUrlTemplate', 'psaInstance'].includes(e.target?.id)) {
    PSALinks._updatePreview();
  }
});
