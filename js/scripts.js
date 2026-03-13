/* ============================================================
   Remediation Scripts — Proactive remediations & health scripts
   ============================================================ */

const Scripts = {
  viewTab: 'scripts', // scripts | history

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const scripts = AppState.getForContext('healthScripts');
    const isAll = AppState.get('activeTenant') === 'all';

    if (AppState.isLoading('healthScripts') && scripts.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Remediation Scripts</h1><p class="page-subtitle">Loading scripts...</p>
        </div></div>${Skeleton.table(8, 5)}`;
      return;
    }

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Remediation Scripts</h1>
          <p class="page-subtitle">${scripts.length} script${scripts.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Scripts.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
        </div>
      </div>

      <div class="tabs mb-4">
        <button class="tab ${this.viewTab === 'scripts' ? 'active' : ''}" onclick="Scripts.viewTab='scripts'; Scripts.render();">Scripts (${scripts.length})</button>
        <button class="tab ${this.viewTab === 'history' ? 'active' : ''}" onclick="Scripts.viewTab='history'; Scripts.render();">Run History</button>
      </div>

      <div id="scriptsContent">
        ${this.viewTab === 'scripts' ? this._renderScripts(scripts, isAll) : this._renderHistory(scripts, isAll)}
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel" id="scriptDetailPanel">
        <div class="detail-panel-header">
          <h3 class="detail-panel-title" id="scriptDetailTitle">Script Details</h3>
          <button class="detail-panel-close" onclick="Scripts.closeDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="scriptDetailBody"></div>
      </div>
    `;
  },

  _renderScripts(scripts, isAll) {
    if (scripts.length === 0) {
      return `<div class="card"><div class="empty-state" style="padding:3rem;">
        <h3 class="empty-state-title">No Remediation Scripts</h3>
        <p class="empty-state-text">No device health scripts found. These are configured in Intune > Devices > Remediations.</p>
        <button class="btn btn-primary btn-sm" onclick="Scripts.reload()">Reload</button>
      </div></div>`;
    }

    return `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Script Name</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>Publisher</th>
            <th>Version</th>
            <th>Enforce Signature</th>
            <th>Run as Account</th>
            <th>Created</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${scripts.map(s => `
              <tr style="cursor:pointer;" onclick="Scripts.showDetail('${s._tenantId}','${s.id}')">
                <td class="fw-500">${s.displayName || 'Unnamed'}</td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(s._tenantId)}</span></td>` : ''}
                <td class="text-sm">${s.publisher || '-'}</td>
                <td class="text-sm">${s.version || '-'}</td>
                <td>${s.enforceSignatureCheck ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-default">No</span>'}</td>
                <td class="text-sm">${s.runAsAccount === 'system' ? 'System' : 'User'}</td>
                <td class="text-sm text-muted">${s.createdDateTime ? new Date(s.createdDateTime).toLocaleDateString() : '-'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Scripts.showDetail('${s._tenantId}','${s.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  },

  _renderHistory(scripts, isAll) {
    return `<div class="card"><div class="empty-state" style="padding:3rem;">
      <h3 class="empty-state-title">Run History</h3>
      <p class="empty-state-text">Select a script to view its device run history and status results.</p>
      <div class="grid grid-auto gap-3" style="margin-top:16px;">
        ${scripts.map(s => `
          <button class="btn btn-secondary btn-sm" onclick="Scripts.loadRunHistory('${s._tenantId}','${s.id}','${(s.displayName || '').replace(/'/g, '')}')">
            ${s.displayName || 'Unnamed'}
          </button>
        `).join('') || '<p class="text-muted text-sm">No scripts available</p>'}
      </div>
    </div></div>`;
  },

  showDetail(tenantId, scriptId) {
    const scripts = AppState.getForContext('healthScripts');
    const script = scripts.find(s => s.id === scriptId && s._tenantId === tenantId);
    if (!script) return;

    document.getElementById('scriptDetailTitle').textContent = script.displayName || 'Script Details';
    document.getElementById('scriptDetailBody').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Overview</div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${script.displayName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${script.description || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Publisher</span><span class="detail-value">${script.publisher || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value">${script.version || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Run as</span><span class="detail-value">${script.runAsAccount === 'system' ? 'System' : 'User'}</span></div>
        <div class="detail-row"><span class="detail-label">Enforce Signature</span><span class="detail-value">${script.enforceSignatureCheck ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="detail-label">Run 32-bit</span><span class="detail-value">${script.runAs32Bit ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${script.createdDateTime ? new Date(script.createdDateTime).toLocaleString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Modified</span><span class="detail-value">${script.lastModifiedDateTime ? new Date(script.lastModifiedDateTime).toLocaleString() : '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Detection Script</div>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:300px;">${script.detectionScriptContent ? atob(script.detectionScriptContent) : 'Not available'}</pre>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Remediation Script</div>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:300px;">${script.remediationScriptContent ? atob(script.remediationScriptContent) : 'Not available'}</pre>
      </div>
    `;
    document.getElementById('scriptDetailPanel').classList.add('open');
  },

  closeDetail() {
    document.getElementById('scriptDetailPanel')?.classList.remove('open');
  },

  async loadRunHistory(tenantId, scriptId, name) {
    const container = document.getElementById('scriptsContent');
    container.innerHTML = `<div class="card"><div style="padding:24px;">
      <div class="flex items-center justify-between mb-3">
        <h3 class="fw-500">Run History: ${name}</h3>
        <button class="btn btn-ghost btn-sm" onclick="Scripts.render()">Back</button>
      </div>
      <div class="text-muted text-sm">Loading run history...</div>
    </div></div>`;

    try {
      const runs = await Graph.getScriptRunHistory(tenantId, scriptId);
      const container2 = document.getElementById('scriptsContent');
      if (!container2) return;

      if (!runs || runs.length === 0) {
        container2.innerHTML = `<div class="card"><div style="padding:24px;">
          <div class="flex items-center justify-between mb-3">
            <h3 class="fw-500">Run History: ${name}</h3>
            <button class="btn btn-ghost btn-sm" onclick="Scripts.render()">Back</button>
          </div>
          <p class="text-muted text-sm">No run history available for this script.</p>
        </div></div>`;
        return;
      }

      container2.innerHTML = `<div class="card"><div style="padding:24px;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="fw-500">Run History: ${name}</h3>
          <button class="btn btn-ghost btn-sm" onclick="Scripts.render()">Back</button>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>Device</th><th>Detection Status</th><th>Remediation Status</th><th>Last Run</th></tr></thead>
            <tbody>
              ${runs.map(r => `
                <tr>
                  <td class="fw-500">${r.managedDevice?.deviceName || r.id || '-'}</td>
                  <td><span class="badge ${r.detectionState === 'success' ? 'badge-success' : 'badge-warning'}">${r.detectionState || '-'}</span></td>
                  <td><span class="badge ${r.remediationState === 'success' ? 'badge-success' : r.remediationState === 'skipped' ? 'badge-default' : 'badge-warning'}">${r.remediationState || '-'}</span></td>
                  <td class="text-sm text-muted">${r.lastStateUpdateDateTime ? new Date(r.lastStateUpdateDateTime).toLocaleString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div></div>`;
    } catch (err) {
      const container3 = document.getElementById('scriptsContent');
      if (container3) container3.innerHTML = `<div class="card"><div style="padding:24px;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="fw-500">Run History: ${name}</h3>
          <button class="btn btn-ghost btn-sm" onclick="Scripts.render()">Back</button>
        </div>
        <p class="text-sm" style="color:var(--danger);">Failed to load run history.</p>
      </div></div>`;
    }
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      await Graph.loadHealthScripts(t.id).catch(() => {});
    }
    Auth._isUserInitiated = false;
    this.render();
  }
};
