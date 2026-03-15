/* ============================================================
   Settings — Proper settings module replacing Router.renderSettings
   ============================================================ */

const Settings = {
  render() {
    const main = document.getElementById('mainContent');
    const tier = AppState.get('licenseTier');
    const tenants = AppState.get('tenants');
    const sessionEnabled = typeof SessionTimeout !== 'undefined' && SessionTimeout.isEnabled();
    const sessionMins = typeof SessionTimeout !== 'undefined' ? SessionTimeout.getMinutes() : 30;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Manage your account, connections, security, and license.</p>
        </div>
        ${typeof Favorites !== 'undefined' ? `<div class="page-header-actions">${Favorites.starButton('settings')}</div>` : ''}
      </div>

      <div class="grid grid-2 gap-6">
        <!-- Connection Settings -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-header-title">Tenant Connections</div>
              <div class="card-header-subtitle">${tenants.length} tenant(s) connected</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Auth.showConnectModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Tenant
            </button>
          </div>
          <div class="card-body">
            ${tenants.length === 0 ? `
              <div class="empty-state" style="padding: 2rem 1rem;">
                <p class="text-sm text-muted">No tenants connected. Click "Add Tenant" or connect via Partner Center.</p>
              </div>
            ` : tenants.map(t => `
              <div class="flex items-center justify-between py-2" style="border-bottom: 1px solid var(--border-light);">
                <div>
                  <div class="fw-500">${t.displayName}</div>
                  <div class="text-xs text-muted text-mono">${t.id}</div>
                  ${typeof TenantGroups !== 'undefined' ? TenantGroups.badge(t.id) : ''}
                </div>
                <span class="badge badge-success">Connected</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- License Settings -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-header-title">License</div>
              <div class="card-header-subtitle">Current plan: <strong>${tier === 'pro' ? 'Pro' : 'Free'}</strong></div>
            </div>
          </div>
          <div class="card-body">
            <div class="tier-banner ${tier}">
              <div class="tier-banner-text">
                ${tier === 'pro' ? `
                  <strong>Pro License Active</strong> — Unlimited tenants, all features unlocked.
                ` : `
                  <strong>Free Tier</strong> — Limited to ${AppState.get('maxTenantsForFree')} tenants. <a href="#" onclick="Licensing.showModal(); return false;">Upgrade to Pro</a> for unlimited access.
                `}
              </div>
            </div>
            ${tier === 'free' ? `
              <button class="btn btn-primary w-full mt-4" onclick="Licensing.showModal()">Enter License Key</button>
            ` : `
              <div class="flex items-center gap-2 mt-4">
                <span class="badge badge-success">License Active</span>
                <span class="text-xs text-mono text-muted">${AppState.get('licenseKey') || ''}</span>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="card-header-title">Security</div>
        </div>
        <div class="card-body">
          <div class="grid grid-2 gap-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <div>
                  <div class="fw-500 text-sm">Session Auto-Lock</div>
                  <div class="text-xs text-muted">Automatically lock after inactivity</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${sessionEnabled ? 'checked' : ''} onchange="SessionTimeout.setEnabled(this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="flex items-center gap-2 mt-3">
                <label class="text-sm text-muted" style="white-space:nowrap;">Timeout:</label>
                <select class="form-input" style="max-width:160px;" onchange="SessionTimeout.setTimeout(parseInt(this.value))">
                  ${[5, 10, 15, 30, 60, 120].map(m => `<option value="${m}" ${sessionMins === m ? 'selected' : ''}>${m < 60 ? m + ' minutes' : (m/60) + ' hour(s)'}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <div class="fw-500 text-sm mb-1">Access Gate</div>
              <div class="text-xs text-muted mb-2">Password-protected entry point. Change the hash in index.html for production use.</div>
              <button class="btn btn-secondary btn-sm" onclick="SessionTimeout._lock()">Lock Now</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Quick Links -->
      <div class="grid grid-4 gap-4 mt-6">
        <div class="card card-interactive" onclick="Router.navigate('webhooks')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <div class="fw-500 text-sm">Webhooks</div>
            <div class="text-xs text-muted">Configure alert delivery</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="Router.navigate('notifprefs')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <div class="fw-500 text-sm">Notifications</div>
            <div class="text-xs text-muted">Alert preferences</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="Router.navigate('rbac')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div class="fw-500 text-sm">Access Control</div>
            <div class="text-xs text-muted">Roles & permissions</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="Router.navigate('branding')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            <div class="fw-500 text-sm">Branding</div>
            <div class="text-xs text-muted">White-label the app</div>
          </div>
        </div>
      </div>

      <div class="grid grid-4 gap-4 mt-4">
        <div class="card card-interactive" onclick="Router.navigate('tenantgroups')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            <div class="fw-500 text-sm">Tenant Groups</div>
            <div class="text-xs text-muted">Organize tenants</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="DashboardWidgets.showCustomizer()">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <div class="fw-500 text-sm">Dashboard Layout</div>
            <div class="text-xs text-muted">Customize widgets</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="Shortcuts.showHelp()">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
            <div class="fw-500 text-sm">Shortcuts</div>
            <div class="text-xs text-muted">Keyboard shortcuts</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="window.open('https://github.com/sponsors/timothyoelkers-cloud','_blank')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--danger)" stroke="none" style="margin:0 auto 8px;display:block;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <div class="fw-500 text-sm">Sponsor</div>
            <div class="text-xs text-muted">Support the project</div>
          </div>
        </div>
      </div>
    `;
  }
};
