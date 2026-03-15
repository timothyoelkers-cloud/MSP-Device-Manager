/* ============================================================
   TenantGroups — Organize tenants into named, color-coded groups
   ============================================================ */

const TenantGroups = {
  _storageKey: 'msp_tenant_groups',

  _colors: [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Teal', value: '#0891b2' },
    { name: 'Green', value: '#059669' },
    { name: 'Orange', value: '#d97706' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Pink', value: '#db2777' },
    { name: 'Slate', value: '#475569' },
  ],

  getGroups() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  },

  _save(groups) {
    localStorage.setItem(this._storageKey, JSON.stringify(groups));
  },

  getGroupForTenant(tenantId) {
    return this.getGroups().find(g => (g.tenants || []).includes(tenantId));
  },

  // Render tenant group management page (accessed from Tenants page or Settings)
  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const groups = this.getGroups();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Tenant Groups</h1>
          <p class="page-subtitle">Organize tenants into logical groups for easier management</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="TenantGroups._showCreateGroup()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Group
          </button>
        </div>
      </div>

      ${groups.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon" style="font-size:40px;">&#128193;</div>
          <h3 class="empty-state-title">No Groups Yet</h3>
          <p class="empty-state-text">Create groups to organize your tenants by region, contract tier, or any criteria you choose.</p>
          <button class="btn btn-primary" onclick="TenantGroups._showCreateGroup()">Create First Group</button>
        </div>
      ` : `
        <div class="grid grid-2 gap-4 mb-6">
          ${groups.map((g, gi) => `
            <div class="card" style="border-left:4px solid ${g.color};">
              <div class="card-header">
                <div>
                  <div class="card-header-title" style="display:flex;align-items:center;gap:8px;">
                    <span style="width:10px;height:10px;border-radius:50%;background:${g.color};display:inline-block;"></span>
                    ${g.name}
                  </div>
                  <div class="card-header-subtitle">${(g.tenants || []).length} tenant(s)</div>
                </div>
                <div class="flex gap-2">
                  <button class="btn btn-ghost btn-sm" onclick="TenantGroups._showEditGroup(${gi})" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick="TenantGroups._deleteGroup(${gi})" title="Delete" style="color:var(--danger);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div class="card-body">
                ${(g.tenants || []).length === 0 ? '<div class="text-sm text-muted">No tenants assigned to this group.</div>' :
                  (g.tenants || []).map(tid => {
                    const t = tenants.find(x => x.id === tid);
                    return t ? `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light);">
                        <div>
                          <div class="text-sm fw-500">${t.displayName}</div>
                          <div class="text-xs text-mono text-muted">${t.id.substring(0, 8)}...</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="TenantGroups._removeTenant(${gi}, '${tid}')" style="color:var(--danger);font-size:12px;">Remove</button>
                      </div>
                    ` : '';
                  }).join('')}
                ${tenants.filter(t => !(g.tenants || []).includes(t.id)).length > 0 ? `
                  <div style="margin-top:8px;">
                    <select class="form-input" style="font-size:12px;" onchange="if(this.value) TenantGroups._addTenant(${gi}, this.value);">
                      <option value="">+ Add tenant to group...</option>
                      ${tenants.filter(t => !(g.tenants || []).includes(t.id)).map(t =>
                        `<option value="${t.id}">${t.displayName}</option>`
                      ).join('')}
                    </select>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- Ungrouped Tenants -->
      ${(() => {
        const grouped = new Set(groups.flatMap(g => g.tenants || []));
        const ungrouped = tenants.filter(t => !grouped.has(t.id));
        if (ungrouped.length === 0) return '';
        return `
          <div class="card">
            <div class="card-header">
              <div class="card-header-title">Ungrouped Tenants (${ungrouped.length})</div>
            </div>
            <div class="card-body">
              <div class="flex flex-wrap gap-2">
                ${ungrouped.map(t => `<span class="chip">${t.displayName}</span>`).join('')}
              </div>
            </div>
          </div>
        `;
      })()}
    `;
  },

  _showCreateGroup() {
    this._showGroupModal(-1);
  },

  _showEditGroup(idx) {
    this._showGroupModal(idx);
  },

  _showGroupModal(idx) {
    const groups = this.getGroups();
    const existing = idx >= 0 ? groups[idx] : null;
    const isEdit = !!existing;

    document.getElementById('tgModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'tgModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:420px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit' : 'Create'} Group</h3>
          <button class="modal-close" onclick="document.getElementById('tgModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-3">
            <label class="form-label">Group Name</label>
            <input type="text" class="form-input" id="tgName" value="${isEdit ? existing.name : ''}" placeholder="e.g., Region: East Coast">
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="flex flex-wrap gap-2">
              ${this._colors.map(c => `
                <button class="tg-color-btn" data-color="${c.value}" onclick="document.querySelectorAll('.tg-color-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--ink)';"
                  style="width:28px;height:28px;border-radius:50%;background:${c.value};border:2px solid white;box-shadow:0 0 0 1px var(--border);cursor:pointer;${(isEdit && existing.color === c.value) ? 'outline:2px solid var(--ink);' : ''}" title="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('tgModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="TenantGroups._saveGroup(${idx})">${isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    document.getElementById('tgName').focus();
  },

  _saveGroup(idx) {
    const name = document.getElementById('tgName')?.value?.trim();
    if (!name) { Toast.show('Enter a group name', 'warning'); return; }

    const colorBtn = document.querySelector('.tg-color-btn[style*="outline: 2px"], .tg-color-btn[style*="outline:2px"]');
    const color = colorBtn?.dataset?.color || this._colors[0].value;

    const groups = this.getGroups();
    if (idx >= 0) {
      groups[idx].name = name;
      groups[idx].color = color;
    } else {
      groups.push({ name, color, tenants: [] });
    }
    this._save(groups);
    document.getElementById('tgModal')?.remove();
    Toast.show(`Group "${name}" ${idx >= 0 ? 'updated' : 'created'}`, 'success');
    this.render();
  },

  async _deleteGroup(idx) {
    const groups = this.getGroups();
    const name = groups[idx]?.name;
    const ok = await Confirm.show({
      title: 'Delete Group',
      message: `Delete the group "${name}"? Tenants won't be removed from the system.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!ok) return;
    groups.splice(idx, 1);
    this._save(groups);
    Toast.show('Group deleted', 'info');
    this.render();
  },

  _addTenant(groupIdx, tenantId) {
    const groups = this.getGroups();
    if (!groups[groupIdx].tenants) groups[groupIdx].tenants = [];
    // Remove from other groups first
    groups.forEach(g => { g.tenants = (g.tenants || []).filter(id => id !== tenantId); });
    groups[groupIdx].tenants.push(tenantId);
    this._save(groups);
    this.render();
  },

  _removeTenant(groupIdx, tenantId) {
    const groups = this.getGroups();
    groups[groupIdx].tenants = (groups[groupIdx].tenants || []).filter(id => id !== tenantId);
    this._save(groups);
    this.render();
  },

  // Get a badge HTML for a tenant's group (used in tenant lists)
  badge(tenantId) {
    const group = this.getGroupForTenant(tenantId);
    if (!group) return '';
    return `<span class="badge" style="background:${group.color}20;color:${group.color};border:1px solid ${group.color}40;font-size:10px;">${group.name}</span>`;
  }
};
