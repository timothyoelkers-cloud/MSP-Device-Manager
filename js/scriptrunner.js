/* ============================================================
   ScriptRunner — Multi-tenant script deployment & execution
   ============================================================ */

const ScriptRunner = {
  _storageKey: 'msp_script_runs',

  _builtinScripts: [
    {
      id: 'clear_teams_cache',
      name: 'Clear Teams Cache',
      desc: 'Remove Microsoft Teams cache files to fix common issues',
      platform: 'Windows',
      script: `Remove-Item -Path "$env:APPDATA\\Microsoft\\Teams\\*" -Recurse -Force -ErrorAction SilentlyContinue\nWrite-Output "Teams cache cleared"`
    },
    {
      id: 'check_disk_space',
      name: 'Check Disk Space',
      desc: 'Report available disk space on system drive',
      platform: 'Windows',
      script: `$disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}}, @{N='TotalGB';E={[math]::Round($_.Size/1GB,2)}}\nWrite-Output "Free: $($disk.FreeGB) GB / $($disk.TotalGB) GB"`
    },
    {
      id: 'force_gpo_update',
      name: 'Force Group Policy Update',
      desc: 'Run gpupdate /force to refresh policies',
      platform: 'Windows',
      script: `gpupdate /force\nWrite-Output "Group Policy updated"`
    },
    {
      id: 'restart_print_spooler',
      name: 'Restart Print Spooler',
      desc: 'Restart the Windows Print Spooler service',
      platform: 'Windows',
      script: `Restart-Service -Name Spooler -Force\nWrite-Output "Print Spooler restarted"`
    },
    {
      id: 'check_windows_update',
      name: 'Check Windows Updates',
      desc: 'Trigger a Windows Update scan',
      platform: 'Windows',
      script: `(New-Object -ComObject Microsoft.Update.AutoUpdate).DetectNow()\nWrite-Output "Windows Update scan initiated"`
    },
    {
      id: 'flush_dns',
      name: 'Flush DNS Cache',
      desc: 'Clear the local DNS resolver cache',
      platform: 'Windows',
      script: `ipconfig /flushdns\nWrite-Output "DNS cache flushed"`
    }
  ],

  render() {
    const main = document.getElementById('mainContent');
    const history = this._getHistory();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Script Runner</h1>
          <p class="page-subtitle">Deploy remediation scripts across tenants</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="ScriptRunner._showCustom()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Custom Script
          </button>
        </div>
      </div>

      <!-- Built-in Scripts -->
      <div class="card mb-6">
        <div class="card-header"><div class="card-header-title">Quick Scripts</div></div>
        <div class="card-body" style="padding:0;">
          <div class="grid grid-3 gap-0" style="padding:16px;">
            ${this._builtinScripts.map(s => `
              <div style="padding:12px;border:1px solid var(--border-light);border-radius:var(--radius);cursor:pointer;transition:background 0.15s;"
                onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''"
                onclick="ScriptRunner._runBuiltin('${s.id}')">
                <div class="fw-500 text-sm">${s.name}</div>
                <div class="text-xs text-muted mt-1">${s.desc}</div>
                <span class="badge badge-default mt-2" style="font-size:10px;">${s.platform}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Run History -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">Execution History</div>
          ${history.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="ScriptRunner._clearHistory()">Clear</button>` : ''}
        </div>
        <div class="card-body">
          ${history.length === 0 ? '<div class="text-sm text-muted" style="padding:16px 0;">No scripts executed yet.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Script</th><th>Tenant(s)</th><th>Status</th><th>Run At</th><th></th></tr></thead>
                <tbody>
                  ${history.slice().reverse().slice(0, 30).map(h => `
                    <tr>
                      <td class="fw-500">${h.name}</td>
                      <td>${(h.tenants || []).map(t => `<span class="chip" style="font-size:10px;">${t}</span>`).join(' ')}</td>
                      <td>
                        ${h.status === 'success' ? '<span class="badge badge-success">Success</span>' :
                          h.status === 'partial' ? '<span class="badge badge-warning">Partial</span>' :
                          h.status === 'failed' ? '<span class="badge badge-danger">Failed</span>' :
                          '<span class="badge badge-info">Submitted</span>'}
                      </td>
                      <td class="text-sm text-muted">${new Date(h.runAt).toLocaleString()}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="ScriptRunner._viewDetails('${h.id}')">Details</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  _runBuiltin(scriptId) {
    const script = this._builtinScripts.find(s => s.id === scriptId);
    if (!script) return;
    this._showRunModal(script.name, script.script);
  },

  _showCustom() {
    document.getElementById('scriptRunnerModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'scriptRunnerModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:600px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Custom Script</h3>
          <button class="modal-close" onclick="document.getElementById('scriptRunnerModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-4">
            <label class="form-label">Script Name</label>
            <input type="text" class="form-input" id="srScriptName" placeholder="My Custom Script">
          </div>
          <div class="form-group">
            <label class="form-label">PowerShell Script</label>
            <textarea class="form-textarea" id="srScriptBody" rows="10"
              style="font-family:var(--font-mono);font-size:var(--text-xs);"
              placeholder="Write-Output 'Hello from remediation script'"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('scriptRunnerModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="ScriptRunner._submitCustom()">Continue</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _submitCustom() {
    const name = document.getElementById('srScriptName')?.value || 'Custom Script';
    const body = document.getElementById('srScriptBody')?.value || '';
    if (!body.trim()) { Toast.show('Enter a script body', 'warning'); return; }
    document.getElementById('scriptRunnerModal')?.remove();
    this._showRunModal(name, body);
  },

  _showRunModal(name, scriptBody) {
    const tenants = AppState.get('tenants');
    document.getElementById('scriptRunModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'scriptRunModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Run: ${name}</h3>
          <button class="modal-close" onclick="document.getElementById('scriptRunModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-4">Select which tenant(s) to deploy this script to:</p>
          <div style="max-height:300px;overflow-y:auto;">
            <label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-light);cursor:pointer;">
              <input type="checkbox" id="srSelectAll" onchange="document.querySelectorAll('.sr-tenant-cb').forEach(cb => cb.checked = this.checked)">
              <span class="fw-500 text-sm">Select All</span>
            </label>
            ${tenants.map(t => `
              <label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-light);cursor:pointer;">
                <input type="checkbox" class="sr-tenant-cb" value="${t.id}" data-name="${t.displayName}">
                <span class="text-sm">${t.displayName}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('scriptRunModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="ScriptRunner._executeRun('${name.replace(/'/g, "\\'")}')">Deploy Script</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Store script body for execution
    this._pendingScript = scriptBody;
  },

  async _executeRun(name) {
    const checkboxes = document.querySelectorAll('.sr-tenant-cb:checked');
    if (checkboxes.length === 0) { Toast.show('Select at least one tenant', 'warning'); return; }

    const selectedTenants = Array.from(checkboxes).map(cb => ({ id: cb.value, name: cb.dataset.name }));
    document.getElementById('scriptRunModal')?.remove();

    const runId = 'sr_' + Date.now();
    const results = [];

    Toast.show(`Deploying "${name}" to ${selectedTenants.length} tenant(s)...`, 'info');

    for (const tenant of selectedTenants) {
      try {
        // Create a device health script via Graph API
        await Graph.call(tenant.id, '/deviceManagement/deviceHealthScripts', {
          method: 'POST',
          body: {
            displayName: `[ScriptRunner] ${name}`,
            description: `Deployed via MSP Device Manager Script Runner`,
            publisher: 'MSP Device Manager',
            runAsAccount: 'system',
            enforceSignatureCheck: false,
            runAs32Bit: false,
            detectionScriptContent: btoa(this._pendingScript),
            remediationScriptContent: btoa(this._pendingScript)
          },
          beta: true
        });
        results.push({ tenant: tenant.name, status: 'success' });
      } catch (e) {
        results.push({ tenant: tenant.name, status: 'failed', error: e.message });
      }
    }

    const failed = results.filter(r => r.status === 'failed').length;
    const status = failed === 0 ? 'success' : failed === results.length ? 'failed' : 'partial';

    // Save to history
    const history = this._getHistory();
    history.push({
      id: runId,
      name,
      tenants: selectedTenants.map(t => t.name),
      results,
      status,
      runAt: new Date().toISOString(),
      script: this._pendingScript
    });
    if (history.length > 100) history.shift();
    localStorage.setItem(this._storageKey, JSON.stringify(history));

    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('script_deployed', `Deployed "${name}" to ${selectedTenants.length} tenant(s)`, {
        tenants: selectedTenants.map(t => t.name), status
      });
    }

    Toast.show(
      failed === 0 ? `Script deployed to ${selectedTenants.length} tenant(s)` : `Deployed with ${failed} failure(s)`,
      failed === 0 ? 'success' : 'warning'
    );

    this.render();
  },

  _viewDetails(id) {
    const run = this._getHistory().find(h => h.id === id);
    if (!run) return;

    document.getElementById('srDetailsModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'srDetailsModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">${run.name}</h3>
          <button class="modal-close" onclick="document.getElementById('srDetailsModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="text-sm text-muted mb-3">Executed: ${new Date(run.runAt).toLocaleString()}</div>
          ${(run.results || []).map(r => `
            <div class="detail-row">
              <span class="detail-label">${r.tenant}</span>
              <span class="detail-value">
                ${r.status === 'success' ? '<span class="badge badge-success">Success</span>' : `<span class="badge badge-danger">Failed</span>`}
              </span>
            </div>
            ${r.error ? `<div class="text-xs text-danger" style="padding:0 0 4px 12px;">${r.error}</div>` : ''}
          `).join('')}
          ${run.script ? `
            <div class="detail-section mt-4">
              <div class="detail-section-title">Script</div>
              <pre style="background:var(--gray-50);padding:12px;border-radius:var(--radius);font-size:11px;overflow-x:auto;max-height:200px;">${run.script}</pre>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _getHistory() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  },

  _clearHistory() {
    if (!confirm('Clear all script execution history?')) return;
    localStorage.removeItem(this._storageKey);
    Toast.show('History cleared', 'success');
    this.render();
  }
};
