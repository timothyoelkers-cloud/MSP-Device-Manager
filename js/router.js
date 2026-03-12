/* ============================================================
   Router — Hash-based SPA navigation
   ============================================================ */

const Router = {
  routes: {
    'dashboard':       () => Dashboard.render(),
    'tenants':         () => Tenants.render(),
    'devices':         () => Devices.render(),
    'compliance':      () => Compliance.render(),
    'configurations':  () => Configurations.render(),
    'security':        () => Security.render(),
    'apps':            () => Apps.render(),
    'autopilot':       () => Autopilot.render(),
    'updates':         () => Updates.render(),
    'groups':          () => Groups.render(),
    'settings':        () => Router.renderSettings(),
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    const page = hash.split('/')[0];
    this.render(page);
  },

  navigate(page) {
    window.location.hash = '#/' + page;
  },

  render(page) {
    if (!page) page = 'dashboard';
    AppState.set('currentPage', page);

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('visible');

    // Render page
    const renderFn = this.routes[page];
    if (renderFn) {
      renderFn();
    } else {
      this.render404(page);
    }
  },

  render404(page) {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">?</div>
        <h3 class="empty-state-title">Page Not Found</h3>
        <p class="empty-state-text">The page "${page}" doesn't exist. Navigate using the sidebar.</p>
        <button class="btn btn-primary" onclick="Router.navigate('dashboard')">Go to Dashboard</button>
      </div>
    `;
  },

  renderSettings() {
    const main = document.getElementById('mainContent');
    const tier = AppState.get('licenseTier');
    const tenants = AppState.get('tenants');
    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Manage your account, connections, and license.</p>
        </div>
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

      <!-- Sponsor Section -->
      <div class="sponsor-banner mt-6">
        <span class="sponsor-banner-icon">&#9829;</span>
        <div class="sponsor-banner-content">
          <div class="sponsor-banner-title">Support MSP Device Manager</div>
          <div class="sponsor-banner-text">If this tool saves you time, consider sponsoring the project to keep it maintained and free for the community.</div>
        </div>
        <a href="https://github.com/sponsors/timothyoelkers-cloud" target="_blank" class="btn btn-primary btn-sm">Sponsor on GitHub</a>
      </div>
    `;
  }
};
