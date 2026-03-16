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
    'offboarding': ['Identity & Access', 'Offboarding'],
    'licenses': ['Multi-Tenant', 'Licenses'],
    'scorecard': ['Multi-Tenant', 'Security Scorecard'],
    'activityfeed': ['Multi-Tenant', 'Activity Feed'],
    'clientreports': ['Multi-Tenant', 'Client Reports'],
    'scriptrunner': ['Tools', 'Script Runner'],
    'exportcenter': ['Tools', 'Data Export'],
    'devicecompare': ['Device Management', 'Device Compare'],
    'remediation': ['Device Management', 'Compliance Remediation'],
    'mfareport': ['Security & Compliance', 'MFA Report'],
    'assettracking': ['Device Management', 'Asset Tracking'],
    'notifprefs': ['Settings', 'Notification Preferences'],
    'healthchecks': ['Multi-Tenant', 'Health Checks'],
    'devicetags': ['Device Management', 'Device Tags'],
    'policydrift': ['Multi-Tenant', 'Policy Drift'],
    'tenantgroups': ['Settings', 'Tenant Groups'],
    'settings': ['Settings'],
    'webhooks': ['Settings', 'Webhooks'],
    'rbac': ['Settings', 'Access Control'],
    'branding': ['Settings', 'Custom Branding'],
    'syncdashboard': ['Device Management', 'Sync Dashboard'],
    'licenseoptimizer': ['Multi-Tenant', 'License Optimizer'],
    'incidentresponse': ['Security & Compliance', 'Incident Response'],
    'notificationrules': ['Multi-Tenant', 'Notification Rules'],
    'savedviews': ['Tools', 'Saved Views'],
    'healthsummary': ['Multi-Tenant', 'Health Summary'],
    'slatracking': ['Multi-Tenant', 'SLA Tracking'],
    'changelog': ['Multi-Tenant', 'Change Log'],
    'technotes': ['Tools', 'Technician Notes'],
    'executivedash': ['Multi-Tenant', 'Executive Dashboard'],
    'trendcharts': ['Multi-Tenant', 'Trend Charts'],
    'psalinks': ['Settings', 'PSA Integrations'],
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
    'offboarding':     () => Offboarding.render(),
    'licenses':        () => Licenses.render(),
    'scorecard':       () => Scorecard.render(),
    'activityfeed':    () => ActivityFeed.render(),
    'clientreports':   () => ClientReports.render(),
    'scriptrunner':    () => ScriptRunner.render(),
    'exportcenter':    () => ExportCenter.render(),
    'devicecompare':   () => DeviceCompare.render(),
    'remediation':     () => Remediation.render(),
    'mfareport':       () => MFAReport.render(),
    'assettracking':   () => AssetTracking.render(),
    'notifprefs':      () => NotifPrefs.render(),
    'healthchecks':    () => HealthChecks.render(),
    'devicetags':      () => DeviceTags.render(),
    'policydrift':     () => PolicyDrift.render(),
    'tenantgroups':    () => TenantGroups.render(),
    'settings':        () => Settings.render(),
    'syncdashboard':   () => SyncDashboard.render(),
    'licenseoptimizer': () => LicenseOptimizer.render(),
    'incidentresponse': () => IncidentResponse.render(),
    'notificationrules': () => NotificationRules.render(),
    'savedviews':      () => SavedViews.render(),
    'healthsummary':   () => HealthSummary.render(),
    'slatracking':     () => SLATracking.render(),
    'changelog':       () => ChangeLog.render(),
    'technotes':       () => TechNotes.render(),
    'executivedash':   () => ExecutiveDash.render(),
    'trendcharts':     () => TrendCharts.render(),
    'psalinks':        () => PSALinks.render(),
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
    // Initialize dark mode
    if (typeof DarkMode !== 'undefined') DarkMode.init();
    // Initialize keyboard shortcuts help
    if (typeof ShortcutsHelp !== 'undefined') ShortcutsHelp.init();
    // Initialize quick actions toolbar
    if (typeof QuickActions !== 'undefined') QuickActions.init();
    // Initialize trend chart auto-snapshots
    if (typeof TrendCharts !== 'undefined') TrendCharts.init();
    // Initialize error handler
    if (typeof ErrorHandler !== 'undefined') ErrorHandler.init();
    // Initialize help tooltips
    if (typeof HelpTooltips !== 'undefined') HelpTooltips.init();
    // Initialize PWA
    if (typeof PWA !== 'undefined') PWA.init();
    // Show What's New for returning users
    if (typeof WhatsNew !== 'undefined' && WhatsNew.shouldShow()) {
      setTimeout(() => WhatsNew.show(), 1000);
    }
    // Show setup wizard for first-time users
    if (typeof SetupWizard !== 'undefined' && SetupWizard.shouldShow()) {
      setTimeout(() => SetupWizard.show(), 500);
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

    // Update favorites sidebar
    if (typeof Favorites !== 'undefined') Favorites.renderSidebar();

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
    const safePage = typeof Sanitizer !== 'undefined' ? Sanitizer.text(page) : page.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">?</div>
        <h3 class="empty-state-title">Page Not Found</h3>
        <p class="empty-state-text">The page "${safePage}" doesn't exist. Navigate using the sidebar.</p>
        <button class="btn btn-primary" onclick="Router.navigate('dashboard')">Go to Dashboard</button>
      </div>
    `;
  },

  // Legacy — now delegated to Settings module
  renderSettings() {
    if (typeof Settings !== 'undefined') return Settings.render();
  }
};
