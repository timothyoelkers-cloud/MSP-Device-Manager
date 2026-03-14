/* ============================================================
   Router — Hash-based SPA navigation with breadcrumbs
   ============================================================ */

const Router = {
  // Breadcrumb labels for pages
  breadcrumbs: {
    'dashboard': ['Dashboard'],
    'tenants': ['Tenants'],
    'devices': ['Device Management', 'All Devices'],
    'compliance': ['Device Management', 'Compliance'],
    'configurations': ['Device Management', 'Configuration Profiles'],
    'security': ['Device Management', 'Endpoint Security'],
    'apps': ['Deployment', 'Applications'],
    'autopilot': ['Deployment', 'Autopilot'],
    'updates': ['Deployment', 'Windows Updates'],
    'groups': ['Deployment', 'Groups'],
    'users': ['Identity & Access', 'Users'],
    'conditionalaccess': ['Identity & Access', 'Conditional Access'],
    'appprotection': ['Identity & Access', 'App Protection'],
    'baselines': ['Security & Compliance', 'Security Baselines'],
    'enrollment': ['Security & Compliance', 'Enrollment'],
    'scripts': ['Security & Compliance', 'Remediations'],
    'templates': ['Multi-Tenant', 'Policy Templates'],
    'comparison': ['Multi-Tenant', 'Tenant Compare'],
    'alerts': ['Multi-Tenant', 'Alerts'],
    'reports': ['Multi-Tenant', 'Reports'],
    'auditlog': ['Multi-Tenant', 'Audit Log'],
    'settings': ['Settings'],
    'webhooks': ['Settings', 'Webhooks'],
    'rbac': ['Settings', 'Access Control'],
    'branding': ['Settings', 'Custom Branding'],
  },

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
    'users':           () => Users.render(),
    'reports':         () => Reports.render(),
    'alerts':          () => Alerts.render(),
    'templates':       () => Templates.render(),
    'scripts':         () => Scripts.render(),
    'conditionalaccess': () => ConditionalAccess.render(),
    'appprotection':   () => AppProtection.render(),
    'enrollment':      () => Enrollment.render(),
    'baselines':       () => Baselines.render(),
    'auditlog':        () => AuditLog.render(),
    'comparison':      () => Comparison.render(),
    'webhooks':        () => Webhooks.render(),
    'rbac':            () => RBAC.render(),
    'branding':        () => Branding.render(),
    'settings':        () => Router.renderSettings(),
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
    // Start notification polling
    if (typeof Notifications !== 'undefined') Notifications.init();
    // Show onboarding tour for first-time users
    if (typeof Onboarding !== 'undefined' && Onboarding.shouldShow()) {
      setTimeout(() => Onboarding.start(), 800);
    }
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

    // RBAC page access check
    if (typeof RBAC !== 'undefined' && !RBAC.canAccessPage(page) && page !== 'dashboard') {
      const main = document.getElementById('mainContent');
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128274;</div>
          <h3 class="empty-state-title">Access Restricted</h3>
          <p class="empty-state-text">Your current role does not have access to this page.</p>
          <button class="btn btn-primary" onclick="Router.navigate('dashboard')">Go to Dashboard</button>
        </div>`;
      return;
    }

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
      this._insertBreadcrumb(page);
    } else {
      this.render404(page);
    }
  },

  _insertBreadcrumb(page) {
    if (page === 'dashboard') return;
    const crumbs = this.breadcrumbs[page];
    if (!crumbs || crumbs.length < 2) return;

    const main = document.getElementById('mainContent');
    const firstChild = main.firstElementChild;
    if (!firstChild || main.querySelector('.page-breadcrumb')) return;

    const breadcrumbHtml = `
      <nav class="page-breadcrumb">
        <a onclick="Router.navigate('dashboard')" style="cursor:pointer;">Dashboard</a>
        <span class="sep">&#9656;</span>
        ${crumbs.slice(0, -1).map(c => `<span>${c}</span><span class="sep">&#9656;</span>`).join('')}
        <span style="color:var(--ink);font-weight:500;">${crumbs[crumbs.length - 1]}</span>
      </nav>`;
    firstChild.insertAdjacentHTML('beforebegin', breadcrumbHtml);
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

      <!-- Settings Quick Links -->
      <div class="grid grid-3 gap-4 mt-6">
        <div class="card card-interactive" onclick="Router.navigate('webhooks')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <div class="fw-500 text-sm">Webhooks & Notifications</div>
            <div class="text-xs text-muted">Configure alert delivery</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="Router.navigate('rbac')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div class="fw-500 text-sm">Access Control</div>
            <div class="text-xs text-muted">Manage roles & permissions</div>
          </div>
        </div>
        <div class="card card-interactive" onclick="Router.navigate('branding')">
          <div class="card-body-compact" style="text-align:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin:0 auto 8px;display:block;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            <div class="fw-500 text-sm">Custom Branding</div>
            <div class="text-xs text-muted">White-label the app</div>
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
