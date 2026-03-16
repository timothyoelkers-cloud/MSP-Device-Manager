/* ============================================================
   Groups — Device group management with CRUD
   ============================================================ */

const Groups = {
  _activeTab: 'all',

  render() {
    const main = document.getElementById('mainContent');
    const groups = AppState.getForContext('groups');
    const isAll = AppState.get('activeTenant') === 'all';

    const dynamicGroups = groups.filter(g => g.groupTypes?.includes('DynamicMembership'));
    const staticGroups = groups.filter(g => !g.groupTypes?.includes('DynamicMembership'));

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Device Groups</h1>
          <p class="page-subtitle">${groups.length} groups ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="Groups.showCreateWizard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Group
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <div class="tab ${this._activeTab === 'all' ? 'active' : ''}" onclick="Groups.showTab(this, 'all')">All Groups (${groups.length})</div>
        <div class="tab ${this._activeTab === 'dynamic' ? 'active' : ''}" onclick="Groups.showTab(this, 'dynamic')">Dynamic (${dynamicGroups.length})</div>
        <div class="tab ${this._activeTab === 'static' ? 'active' : ''}" onclick="Groups.showTab(this, 'static')">Assigned (${staticGroups.length})</div>
      </div>

      ${groups.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <h3 class="empty-state-title">No Groups Found</h3>
            <p class="empty-state-text">Connect a tenant to view and manage device groups, or create a new group.</p>
          </div>
        </div>
      ` : `
        <div class="table-wrapper animate-fade">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <div class="table-search">
                <span class="table-search-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input type="text" placeholder="Search groups..." oninput="Groups.filterTable(this.value)">
              </div>
            </div>
          </div>
          <table class="table" id="groupsTable">
            <thead>
              <tr>
                <th>Group Name</th>
                ${isAll ? '<th>Tenant</th>' : ''}
                <th>Type</th>
                <th>Membership Rule</th>
                <th>Created</th>
                <th style="width:120px">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${groups.map(g => {
                const isDynamic = g.groupTypes?.includes('DynamicMembership');
                return `
                <tr data-type="${isDynamic ? 'dynamic' : 'static'}">
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="table-device-icon" style="background: ${isDynamic ? 'var(--secondary-pale)' : 'var(--gray-100)'}; color: ${isDynamic ? 'var(--secondary)' : 'var(--ink-tertiary)'};">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      </div>
                      <div>
                        <div class="fw-500">${g.displayName || 'Unnamed Group'}</div>
                        <div class="text-xs text-muted">${g.description || ''}</div>
                      </div>
                    </div>
                  </td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(g._tenantId)}</span></td>` : ''}
                  <td><span class="badge ${isDynamic ? 'badge-primary' : 'badge-default'}">${isDynamic ? 'Dynamic' : 'Assigned'}</span></td>
                  <td><span class="text-xs text-mono" style="max-width:250px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.membershipRule || '-'}</span></td>
                  <td class="text-sm">${Devices.formatDate(g.createdDateTime)}</td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-xs" onclick="Groups.showMembers('${g._tenantId}','${g.id}','${(g.displayName||'').replace(/'/g,"\\'")}')" title="Members">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-xs" onclick="Groups.showEditModal('${g._tenantId}','${g.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-xs text-danger" onclick="Groups.deleteGroup('${g._tenantId}','${g.id}','${(g.displayName||'').replace(/'/g,"\\'")}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  showTab(el, type) {
    this._activeTab = type;
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('#groupsTable tbody tr').forEach(row => {
      row.style.display = (type === 'all' || row.dataset.type === type) ? '' : 'none';
    });
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#groupsTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  // --- Create Group Wizard ---
  _wizardState: {},

  showCreateWizard() {
    const tenant = AppState.get('activeTenant');
    if (tenant === 'all') {
      Toast.show('Select a specific tenant to create a group', 'warning');
      return;
    }
    this._wizardState = { step: 1, tenantId: tenant, type: 'security', name: '', description: '', membershipRule: '', mailEnabled: false, mailNickname: '' };
    this._renderWizard();
  },

  _renderWizard() {
    document.getElementById('groupWizardModal')?.remove();
    const s = this._wizardState;
    const overlay = document.createElement('div');
    overlay.id = 'groupWizardModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);';

    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:12px;width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:16px;">Create Group — Step ${s.step} of 3</h3>
          <button onclick="document.getElementById('groupWizardModal').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--ink-tertiary);">&times;</button>
        </div>
        <div style="padding:24px;" id="groupWizardBody"></div>
        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">
          ${s.step > 1 ? `<button class="btn btn-secondary btn-sm" onclick="Groups._wizardBack()">Back</button>` : ''}
          ${s.step < 3
            ? `<button class="btn btn-primary btn-sm" onclick="Groups._wizardNext()">Next</button>`
            : `<button class="btn btn-primary btn-sm" onclick="Groups._wizardCreate()">Create Group</button>`
          }
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._renderWizardStep();
  },

  _renderWizardStep() {
    const body = document.getElementById('groupWizardBody');
    if (!body) return;
    const s = this._wizardState;

    if (s.step === 1) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;">
          <label class="form-label">Group Type</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${[
              { id: 'security', label: 'Security Group', desc: 'For managing access and permissions' },
              { id: 'microsoft365', label: 'Microsoft 365', desc: 'Collaboration with shared mailbox, calendar' },
              { id: 'dynamic-security', label: 'Dynamic Security', desc: 'Auto-membership based on rules' },
              { id: 'dynamic-m365', label: 'Dynamic M365', desc: 'Dynamic membership with M365 features' }
            ].map(t => `
              <div onclick="Groups._wizardState.type='${t.id}'; Groups._renderWizardStep();"
                   style="padding:14px;border:2px solid ${s.type === t.id ? 'var(--primary)' : 'var(--border)'};border-radius:8px;cursor:pointer;background:${s.type === t.id ? 'var(--primary-pale)' : 'var(--surface)'};">
                <div class="fw-500 text-sm">${t.label}</div>
                <div class="text-xs text-muted">${t.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (s.step === 2) {
      const isDynamic = s.type.startsWith('dynamic');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label class="form-label">Display Name *</label>
            <input type="text" class="form-input" value="${s.name}" oninput="Groups._wizardState.name=this.value" placeholder="e.g. All Windows Devices">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea class="form-input" rows="2" oninput="Groups._wizardState.description=this.value" placeholder="Optional description">${s.description}</textarea>
          </div>
          <div>
            <label class="form-label">Mail Nickname *</label>
            <input type="text" class="form-input" value="${s.mailNickname || s.name.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()}" oninput="Groups._wizardState.mailNickname=this.value" placeholder="e.g. allwindowsdevices">
            <div class="text-xs text-muted" style="margin-top:4px;">Unique identifier for mail-enabled groups</div>
          </div>
          ${isDynamic ? `
            <div>
              <label class="form-label">Membership Rule *</label>
              <textarea class="form-input text-mono" rows="3" oninput="Groups._wizardState.membershipRule=this.value" placeholder="e.g. (device.deviceOSType -eq &quot;Windows&quot;)">${s.membershipRule}</textarea>
              <div class="text-xs text-muted" style="margin-top:4px;">Dynamic membership rule expression</div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (s.step === 3) {
      const isDynamic = s.type.startsWith('dynamic');
      const isM365 = s.type.includes('microsoft365') || s.type.includes('m365');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <h4 style="margin:0;">Review</h4>
          <div class="card" style="padding:16px;">
            <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px;">
              <span class="text-muted">Name:</span><span class="fw-500">${s.name}</span>
              <span class="text-muted">Type:</span><span><span class="badge ${isDynamic ? 'badge-primary' : 'badge-default'}">${s.type}</span></span>
              ${s.description ? `<span class="text-muted">Description:</span><span>${s.description}</span>` : ''}
              <span class="text-muted">Mail Nickname:</span><span class="text-mono">${s.mailNickname || s.name.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()}</span>
              ${isDynamic ? `<span class="text-muted">Membership Rule:</span><span class="text-mono text-xs">${s.membershipRule}</span>` : ''}
              <span class="text-muted">Mail Enabled:</span><span>${isM365 ? 'Yes' : 'No'}</span>
              <span class="text-muted">Security Enabled:</span><span>${!isM365 || s.type.includes('security') ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      `;
    }
  },

  _wizardBack() { this._wizardState.step--; this._renderWizardStep(); },

  _wizardNext() {
    const s = this._wizardState;
    if (s.step === 2) {
      if (!s.name.trim()) { Toast.show('Group name is required', 'warning'); return; }
      if (s.type.startsWith('dynamic') && !s.membershipRule.trim()) { Toast.show('Membership rule is required for dynamic groups', 'warning'); return; }
    }
    s.step++;
    this._renderWizardStep();
  },

  async _wizardCreate() {
    const s = this._wizardState;
    const isDynamic = s.type.startsWith('dynamic');
    const isM365 = s.type.includes('microsoft365') || s.type.includes('m365');

    const payload = {
      displayName: s.name.trim(),
      description: s.description.trim() || undefined,
      mailNickname: (s.mailNickname || s.name.replace(/[^a-zA-Z0-9]/g,'')).toLowerCase(),
      mailEnabled: isM365,
      securityEnabled: !isM365 || s.type.includes('security'),
      groupTypes: []
    };

    if (isM365) payload.groupTypes.push('Unified');
    if (isDynamic) {
      payload.groupTypes.push('DynamicMembership');
      payload.membershipRule = s.membershipRule.trim();
      payload.membershipRuleProcessingState = 'On';
    }

    try {
      Toast.show('Creating group...', 'info');
      await Graph.createGroup(s.tenantId, payload);
      document.getElementById('groupWizardModal')?.remove();
      Toast.show(`Group "${s.name}" created successfully`, 'success');
      AuditLog.log('Create Group', `Created group "${s.name}" (${s.type})`, AppState.getTenantName(s.tenantId));
      await Graph.loadGroups(s.tenantId);
      this.render();
    } catch (err) {
      Toast.show(`Failed to create group: ${err.message}`, 'error');
    }
  },

  // --- Edit Group ---
  showEditModal(tenantId, groupId) {
    const groups = AppState.get('groups')[tenantId] || [];
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    document.getElementById('groupEditModal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'groupEditModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);';

    const isDynamic = group.groupTypes?.includes('DynamicMembership');
    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:12px;width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:16px;">Edit Group</h3>
          <button onclick="document.getElementById('groupEditModal').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--ink-tertiary);">&times;</button>
        </div>
        <div style="padding:24px;display:flex;flex-direction:column;gap:14px;">
          <div>
            <label class="form-label">Display Name</label>
            <input type="text" class="form-input" id="editGroupName" value="${group.displayName || ''}">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea class="form-input" id="editGroupDesc" rows="2">${group.description || ''}</textarea>
          </div>
          ${isDynamic ? `
            <div>
              <label class="form-label">Membership Rule</label>
              <textarea class="form-input text-mono" id="editGroupRule" rows="3">${group.membershipRule || ''}</textarea>
            </div>
          ` : ''}
        </div>
        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('groupEditModal').remove()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="Groups._saveEdit('${tenantId}','${groupId}')">Save Changes</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async _saveEdit(tenantId, groupId) {
    const name = document.getElementById('editGroupName')?.value?.trim();
    const desc = document.getElementById('editGroupDesc')?.value?.trim();
    const rule = document.getElementById('editGroupRule')?.value?.trim();

    if (!name) { Toast.show('Group name is required', 'warning'); return; }

    const payload = { displayName: name, description: desc || null };
    if (rule !== undefined && rule !== null) payload.membershipRule = rule;

    try {
      Toast.show('Updating group...', 'info');
      await Graph.updateGroup(tenantId, groupId, payload);
      document.getElementById('groupEditModal')?.remove();
      Toast.show('Group updated successfully', 'success');
      AuditLog.log('Update Group', `Updated group "${name}"`, AppState.getTenantName(tenantId));
      await Graph.loadGroups(tenantId);
      this.render();
    } catch (err) {
      Toast.show(`Failed to update group: ${err.message}`, 'error');
    }
  },

  // --- Delete Group ---
  async deleteGroup(tenantId, groupId, groupName) {
    if (typeof Confirm !== 'undefined') {
      const ok = await Confirm.show({ title: 'Delete Group', message: `Delete <strong>${groupName}</strong>? This cannot be undone.`, confirmText: 'Delete', type: 'danger' });
      if (!ok) return;
    } else if (!confirm(`Delete "${groupName}"? This cannot be undone.`)) return;

    try {
      Toast.show('Deleting group...', 'info');
      await Graph.deleteGroup(tenantId, groupId);
      Toast.show(`Group "${groupName}" deleted`, 'success');
      AuditLog.log('Delete Group', `Deleted group "${groupName}"`, AppState.getTenantName(tenantId));
      await Graph.loadGroups(tenantId);
      this.render();
    } catch (err) {
      Toast.show(`Failed to delete group: ${err.message}`, 'error');
    }
  },

  // --- Members Modal ---
  async showMembers(tenantId, groupId, groupName) {
    document.getElementById('groupMembersModal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'groupMembersModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);';

    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:12px;width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:16px;">Members — ${groupName}</h3>
          <button onclick="document.getElementById('groupMembersModal').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--ink-tertiary);">&times;</button>
        </div>
        <div style="padding:24px;" id="groupMembersBody">
          <div class="text-center text-muted" style="padding:2rem;">Loading members...</div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;">
          <button class="btn btn-secondary btn-sm" onclick="Groups._showAddMember('${tenantId}','${groupId}','${groupName.replace(/'/g,"\\'")}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Member
          </button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('groupMembersModal').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    try {
      const members = await Graph.getGroupMembers(tenantId, groupId);
      const body = document.getElementById('groupMembersBody');
      if (!body) return;

      if (!members || members.length === 0) {
        body.innerHTML = '<div class="text-center text-muted" style="padding:2rem;">No members in this group.</div>';
        return;
      }

      body.innerHTML = `
        <div style="max-height:400px;overflow-y:auto;">
          ${members.map(m => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border);">
              <div>
                <div class="fw-500 text-sm">${m.displayName || 'Unknown'}</div>
                <div class="text-xs text-muted">${m.userPrincipalName || m.mail || m.id}</div>
              </div>
              <button class="btn btn-ghost btn-xs text-danger" onclick="Groups._removeMember('${tenantId}','${groupId}','${m.id}','${(m.displayName||'').replace(/'/g,"\\'")}','${groupName.replace(/'/g,"\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      const body = document.getElementById('groupMembersBody');
      if (body) body.innerHTML = `<div class="text-center text-danger" style="padding:2rem;">Failed to load members: ${err.message}</div>`;
    }
  },

  async _removeMember(tenantId, groupId, memberId, memberName, groupName) {
    if (!confirm(`Remove "${memberName}" from this group?`)) return;
    try {
      await Graph.removeUserFromGroup(tenantId, groupId, memberId);
      Toast.show(`Removed "${memberName}" from group`, 'success');
      AuditLog.log('Remove Group Member', `Removed "${memberName}" from "${groupName}"`, AppState.getTenantName(tenantId));
      this.showMembers(tenantId, groupId, groupName);
    } catch (err) {
      Toast.show(`Failed to remove member: ${err.message}`, 'error');
    }
  },

  _showAddMember(tenantId, groupId, groupName) {
    document.getElementById('addMemberOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'addMemberOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;';

    overlay.innerHTML = `
      <div style="background:var(--surface);border-radius:12px;width:400px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);">
          <h3 style="margin:0;font-size:15px;">Add Member</h3>
        </div>
        <div style="padding:24px;">
          <label class="form-label">Search for a user</label>
          <input type="text" class="form-input" id="addMemberSearch" placeholder="Start typing a name or email..." oninput="Groups._searchUsers('${tenantId}', this.value)">
          <div id="addMemberResults" style="margin-top:12px;max-height:200px;overflow-y:auto;"></div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('addMemberOverlay').remove()">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('addMemberSearch')?.focus();
    // Store context for the add action
    this._addMemberCtx = { tenantId, groupId, groupName };
  },

  _searchTimeout: null,
  _searchUsers(tenantId, term) {
    clearTimeout(this._searchTimeout);
    if (term.length < 2) {
      const r = document.getElementById('addMemberResults');
      if (r) r.innerHTML = '<div class="text-xs text-muted">Type at least 2 characters...</div>';
      return;
    }
    this._searchTimeout = setTimeout(async () => {
      const r = document.getElementById('addMemberResults');
      if (!r) return;
      r.innerHTML = '<div class="text-xs text-muted">Searching...</div>';
      try {
        const users = await Graph.call(tenantId, `/users?$filter=startswith(displayName,'${encodeURIComponent(term)}') or startswith(userPrincipalName,'${encodeURIComponent(term)}')&$top=10&$select=id,displayName,userPrincipalName`);
        const list = users?.value || [];
        if (list.length === 0) {
          r.innerHTML = '<div class="text-xs text-muted">No users found.</div>';
          return;
        }
        r.innerHTML = list.map(u => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;cursor:pointer;transition:background 0.15s;"
               onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''"
               onclick="Groups._addMember('${u.id}','${(u.displayName||'').replace(/'/g,"\\'")}')">
            <div>
              <div class="fw-500 text-sm">${u.displayName}</div>
              <div class="text-xs text-muted">${u.userPrincipalName}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        `).join('');
      } catch (err) {
        r.innerHTML = `<div class="text-xs text-danger">${err.message}</div>`;
      }
    }, 300);
  },

  async _addMember(userId, userName) {
    const ctx = this._addMemberCtx;
    if (!ctx) return;
    try {
      await Graph.addGroupMember(ctx.tenantId, ctx.groupId, userId);
      document.getElementById('addMemberOverlay')?.remove();
      Toast.show(`Added "${userName}" to group`, 'success');
      AuditLog.log('Add Group Member', `Added "${userName}" to "${ctx.groupName}"`, AppState.getTenantName(ctx.tenantId));
      this.showMembers(ctx.tenantId, ctx.groupId, ctx.groupName);
    } catch (err) {
      Toast.show(`Failed to add member: ${err.message}`, 'error');
    }
  }
};
