/* ============================================================
   Auth — MSAL multi-tenant authentication + Partner Center GDAP
   ============================================================ */

const Auth = {
  // App Registration config — REPLACE with your own App Registration
  msalConfig: {
    auth: {
      clientId: '7a20ef88-2e8f-4ea1-8ed0-79df7ae259b8',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin + window.location.pathname,
      postLogoutRedirectUri: window.location.origin + window.location.pathname,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    }
  },

  // Scopes for device management
  graphScopes: [
    'User.Read',
    'DeviceManagementManagedDevices.ReadWrite.All',
    'DeviceManagementManagedDevices.PrivilegedOperations.All',
    'DeviceManagementConfiguration.ReadWrite.All',
    'DeviceManagementApps.ReadWrite.All',
    'DeviceManagementServiceConfig.ReadWrite.All',
    'DeviceManagementRBAC.ReadWrite.All',
    'Directory.Read.All',
    'Group.ReadWrite.All',
    'GroupMember.ReadWrite.All',
    'BitLockerKey.Read.All',
    'InformationProtectionPolicy.Read',
    'WindowsUpdates.ReadWrite.All',
  ],

  // Partner Center scopes for GDAP
  partnerScopes: [
    'https://api.partnercenter.microsoft.com/user_impersonation'
  ],

  msalInstance: null,
  msalReady: false,

  // Compute a fingerprint of the current scopes to detect changes
  _scopeFingerprint() {
    return this.graphScopes.slice().sort().join('|');
  },

  // Check if scopes have changed since last consent
  _needsReconsent() {
    const current = this._scopeFingerprint();
    const stored = localStorage.getItem('msp_scope_fingerprint');
    // Force consent if: no fingerprint stored yet, OR fingerprint doesn't match
    return stored !== current;
  },

  // Mark scopes as consented
  _markScopesConsented() {
    localStorage.setItem('msp_scope_fingerprint', this._scopeFingerprint());
  },

  // Get the appropriate login prompt — 'consent' if scopes changed, otherwise 'select_account'
  _getLoginPrompt() {
    return this._needsReconsent() ? 'consent' : 'select_account';
  },

  async init() {
    try {
      // MSAL v3 requires async createPublicClientApplication
      if (typeof msal.createPublicClientApplication === 'function') {
        this.msalInstance = await msal.createPublicClientApplication(this.msalConfig);
      } else {
        // Fallback for v2
        const pca = new msal.PublicClientApplication(this.msalConfig);
        if (typeof pca.initialize === 'function') {
          await pca.initialize();
        }
        this.msalInstance = pca;
      }
      this.msalReady = true;
      console.log('MSAL initialized successfully');

      // Check if scopes changed — if so, clear cached tokens and prompt for reconsent
      if (this._needsReconsent()) {
        console.log('API scopes have changed — will prompt for reconsent on next login');
        // Clear stale tokens that don't have new permissions
        AppState.set('accessTokens', {});
      }
    } catch (e) {
      console.error('MSAL init failed:', e);
      this.msalReady = false;
    }
  },

  async ensureReady() {
    if (!this.msalReady) {
      await this.init();
    }
    return this.msalReady;
  },

  // Single tenant login
  async login() {
    if (!(await this.ensureReady())) {
      Toast.show('MSAL authentication library failed to initialize. Check browser console for details.', 'error', 'Auth Error');
      return;
    }
    try {
      const loginPrompt = this._getLoginPrompt();
      if (loginPrompt === 'consent') {
        Toast.show('Permissions have been updated — you\'ll be asked to approve new access rights.', 'info', 'Permissions Updated');
      }

      const result = await this.msalInstance.loginPopup({
        scopes: this.graphScopes,
        prompt: loginPrompt
      });

      if (result?.account) {
        // Mark scopes as consented so we don't re-prompt next time
        this._markScopesConsented();

        AppState.set('isAuthenticated', true);
        AppState.set('authMode', 'single');
        AppState.set('account', {
          name: result.account.name,
          username: result.account.username,
          tenantId: result.account.tenantId
        });

        // Store token
        const tokens = { ...AppState.get('accessTokens') };
        tokens[result.account.tenantId] = result.accessToken;
        AppState.set('accessTokens', tokens);

        // Add tenant if not exists
        const tenants = [...AppState.get('tenants')];
        if (!tenants.find(t => t.id === result.account.tenantId)) {
          tenants.push({
            id: result.account.tenantId,
            displayName: result.account.username.split('@')[1] || 'My Tenant',
            domain: result.account.username.split('@')[1] || '',
            connectionType: 'direct',
            connectedAt: new Date().toISOString()
          });
          AppState.set('tenants', tenants);
        }

        this.updateUI();
        this.updateTenantSelectors();

        // Fetch org info
        await this.fetchOrgInfo(result.account.tenantId);

        Toast.show(`Connected as ${result.account.name}`, 'success', 'Tenant Connected');

        // Close any open connect modal
        document.getElementById('connectTenantModal')?.classList.add('hidden');

        // Refresh data
        Graph.loadAllData(result.account.tenantId);
      }
    } catch (error) {
      if (error.errorCode !== 'user_cancelled') {
        Toast.show(error.message || 'Authentication failed', 'error', 'Login Error');
        console.error('Login error:', error);
      }
    }
  },

  // Partner Center login for GDAP multi-tenant
  async loginPartnerCenter() {
    if (!(await this.ensureReady())) {
      Toast.show('MSAL authentication library failed to initialize. Check browser console for details.', 'error', 'Auth Error');
      return;
    }

    // Check license tier
    if (AppState.get('licenseTier') === 'free') {
      const tenants = AppState.get('tenants');
      if (tenants.length >= AppState.get('maxTenantsForFree')) {
        Toast.show(`Free tier is limited to ${AppState.get('maxTenantsForFree')} tenants. Upgrade to Pro for unlimited.`, 'warning', 'Tier Limit');
        Licensing.showModal();
        return;
      }
    }

    try {
      // Step 1: Authenticate against Partner Center
      const partnerResult = await this.msalInstance.loginPopup({
        scopes: this.partnerScopes,
        prompt: 'select_account'
      });

      if (partnerResult?.account) {
        AppState.set('isAuthenticated', true);
        AppState.set('authMode', 'partner');
        AppState.set('account', {
          name: partnerResult.account.name,
          username: partnerResult.account.username,
          tenantId: partnerResult.account.tenantId
        });

        Toast.show('Fetching customer tenants via GDAP...', 'info', 'Partner Center');

        // Step 2: Get customer list from Partner Center
        await this.fetchGDAPCustomers(partnerResult.accessToken);

        this.updateUI();
        this.updateTenantSelectors();

        document.getElementById('connectTenantModal')?.classList.add('hidden');
      }
    } catch (error) {
      if (error.errorCode !== 'user_cancelled') {
        Toast.show(error.message || 'Partner Center authentication failed', 'error', 'Login Error');
        console.error('Partner login error:', error);
      }
    }
  },

  // Fetch GDAP customer tenants from Partner Center API
  async fetchGDAPCustomers(partnerToken) {
    try {
      const response = await fetch('https://api.partnercenter.microsoft.com/v1/customers', {
        headers: {
          'Authorization': `Bearer ${partnerToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Partner API returned ${response.status}`);

      const data = await response.json();
      const customers = data.items || [];
      const tenants = [...AppState.get('tenants')];
      let added = 0;

      for (const customer of customers) {
        if (!tenants.find(t => t.id === customer.id)) {
          // Check free tier limit
          if (AppState.get('licenseTier') === 'free' && tenants.length >= AppState.get('maxTenantsForFree')) {
            Toast.show(`Free tier limit reached. ${customers.length - added} tenants not added.`, 'warning', 'Tier Limit');
            break;
          }
          tenants.push({
            id: customer.id,
            displayName: customer.companyProfile?.companyName || customer.id,
            domain: customer.companyProfile?.domain || '',
            connectionType: 'gdap',
            connectedAt: new Date().toISOString(),
            relationship: customer.relationshipToPartner
          });
          added++;
        }
      }

      AppState.set('tenants', tenants);
      Toast.show(`${added} customer tenant(s) imported via GDAP`, 'success', 'Tenants Loaded');

      // Acquire tokens for each tenant via GDAP
      for (const tenant of tenants.filter(t => t.connectionType === 'gdap')) {
        this.acquireTokenForTenant(tenant.id);
      }
    } catch (error) {
      Toast.show('Could not fetch customers. Ensure GDAP relationships are configured.', 'error', 'Partner Center Error');
      console.error('GDAP fetch error:', error);
    }
  },

  // Track whether we've already shown the reconnect banner
  _reconnectShown: false,
  _tokenFailures: 0,

  // Acquire a delegated token for a specific tenant (GDAP)
  async acquireTokenForTenant(tenantId) {
    if (!(await this.ensureReady())) return null;

    const accounts = this.msalInstance.getAllAccounts();
    if (!accounts.length) {
      console.warn('No MSAL accounts cached — session expired');
      this._showReconnectBanner('Your session has expired. Please reconnect to continue.');
      return null;
    }

    try {
      const tokenRequest = {
        scopes: this.graphScopes,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        account: accounts[0]
      };

      let result;
      try {
        result = await this.msalInstance.acquireTokenSilent(tokenRequest);
      } catch (silentErr) {
        console.warn(`Silent token failed for ${tenantId}:`, silentErr.message);
        // Only try popup if user-initiated (not during auto-reload)
        if (this._isUserInitiated) {
          try {
            result = await this.msalInstance.acquireTokenPopup(tokenRequest);
          } catch (popupErr) {
            console.warn(`Popup token failed for ${tenantId}:`, popupErr.message);
          }
        }
      }

      if (result?.accessToken) {
        const tokens = { ...AppState.get('accessTokens') };
        tokens[tenantId] = result.accessToken;
        AppState.set('accessTokens', tokens);
        this._tokenFailures = 0;
        return result.accessToken;
      }
    } catch (error) {
      console.warn(`Token acquisition failed for tenant ${tenantId}:`, error.message);
    }

    // Token acquisition failed
    this._tokenFailures++;
    if (this._tokenFailures >= 1) {
      this._showReconnectBanner('Could not refresh your session. Please reconnect to load data.');
    }
    return null;
  },

  // Get access token for a tenant (with expiry check)
  async getToken(tenantId) {
    let token = AppState.get('accessTokens')[tenantId];

    // Check if token is expired (JWT exp claim)
    if (token && this._isTokenExpired(token)) {
      console.log(`Token expired for tenant ${tenantId}, refreshing...`);
      const tokens = { ...AppState.get('accessTokens') };
      delete tokens[tenantId];
      AppState.set('accessTokens', tokens);
      token = null;
    }

    if (!token) {
      token = await this.acquireTokenForTenant(tenantId);
    }
    return token;
  },

  // Check if a JWT token is expired
  _isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Consider expired if within 5 minutes of expiry
      return payload.exp && (payload.exp * 1000) < (Date.now() + 5 * 60 * 1000);
    } catch {
      return false; // Can't parse, assume valid
    }
  },

  // Show reconnect banner at top of main content
  _showReconnectBanner(message) {
    if (this._reconnectShown) return;
    this._reconnectShown = true;

    let banner = document.getElementById('reconnectBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'reconnectBanner';
      banner.className = 'reconnect-banner';
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.parentNode.insertBefore(banner, mainContent);
      } else {
        document.querySelector('.main')?.prepend(banner);
      }
    }

    banner.innerHTML = `
      <div class="reconnect-banner-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${message}</span>
        <button class="btn btn-primary btn-sm" onclick="Auth.reconnect()">Reconnect</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('reconnectBanner').remove(); Auth._reconnectShown=false;">Dismiss</button>
      </div>
    `;
    banner.style.display = 'flex';
  },

  // Reconnect — re-authenticate and reload data
  async reconnect() {
    this._isUserInitiated = true;
    this._reconnectShown = false;
    document.getElementById('reconnectBanner')?.remove();

    const needsReconsent = this._needsReconsent();

    try {
      // Only try silent if scopes haven't changed (otherwise we need consent)
      if (!needsReconsent) {
        const accounts = this.msalInstance?.getAllAccounts() || [];
        if (accounts.length > 0) {
          const tokenRequest = {
            scopes: this.graphScopes,
            account: accounts[0],
          };
          try {
            const result = await this.msalInstance.acquireTokenSilent(tokenRequest);
            if (result?.accessToken) {
              Toast.show('Session restored. Reloading data...', 'success');
              this._reloadAllTenantData();
              this._isUserInitiated = false;
              return;
            }
          } catch {
            // Silent failed, fall through to popup
          }
        }
      }

      // Full re-login via popup (consent if scopes changed)
      const loginPrompt = needsReconsent ? 'consent' : 'select_account';
      if (needsReconsent) {
        Toast.show('Permissions updated — please approve new access rights.', 'info', 'Permissions Updated');
      }

      const result = await this.msalInstance.loginPopup({
        scopes: this.graphScopes,
        prompt: loginPrompt
      });

      if (result?.account) {
        this._markScopesConsented();

        AppState.set('isAuthenticated', true);
        AppState.set('account', {
          name: result.account.name,
          username: result.account.username,
          tenantId: result.account.tenantId
        });

        const tokens = { ...AppState.get('accessTokens') };
        tokens[result.account.tenantId] = result.accessToken;
        AppState.set('accessTokens', tokens);

        this.updateUI();
        this.updateTenantSelectors();
        Toast.show('Reconnected successfully. Loading data...', 'success');
        this._reloadAllTenantData();
      }
    } catch (error) {
      if (error.errorCode !== 'user_cancelled') {
        Toast.show('Reconnection failed: ' + (error.message || 'Unknown error'), 'error');
      }
    }
    this._isUserInitiated = false;
  },

  // Reload data for all connected tenants
  async _reloadAllTenantData() {
    const tenants = AppState.get('tenants');
    this._tokenFailures = 0;
    for (const t of tenants) {
      Graph.loadAllData(t.id).catch(err => {
        console.warn(`Failed to load data for tenant ${t.id}:`, err);
      });
    }
  },

  // Flag for user-initiated vs auto token requests
  _isUserInitiated: false,

  // Fetch organization info for a tenant
  async fetchOrgInfo(tenantId) {
    try {
      const token = await this.getToken(tenantId);
      if (!token) return;

      const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const org = data.value?.[0];
        if (org) {
          const tenants = [...AppState.get('tenants')];
          const idx = tenants.findIndex(t => t.id === tenantId);
          if (idx >= 0) {
            tenants[idx].displayName = org.displayName || tenants[idx].displayName;
            tenants[idx].verifiedDomains = org.verifiedDomains;
            AppState.set('tenants', tenants);
            this.updateTenantSelectors();
          }
        }
      }
    } catch (e) {
      console.warn('Org info fetch failed:', e);
    }
  },

  // UI updates
  updateUI() {
    const isAuth = AppState.get('isAuthenticated');
    const account = AppState.get('account');

    const connectBtn = document.getElementById('connectBtn');
    const avatar = document.getElementById('userAvatar');

    if (isAuth && account) {
      connectBtn?.classList.add('hidden');
      avatar?.classList.remove('hidden');
      const initials = (account.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      if (avatar) avatar.textContent = initials;
    } else {
      connectBtn?.classList.remove('hidden');
      avatar?.classList.add('hidden');
    }
  },

  updateTenantSelectors() {
    const tenants = AppState.get('tenants');
    const select = document.getElementById('sidebarTenantFilter');
    const active = AppState.get('activeTenant');

    if (select) {
      select.innerHTML = '<option value="all">All Tenants</option>' +
        tenants.map(t => `<option value="${t.id}" ${active === t.id ? 'selected' : ''}>${t.displayName}</option>`).join('');
    }

    document.getElementById('tenantCount').textContent = tenants.length;
  },

  showConnectModal() {
    document.getElementById('connectTenantModal')?.classList.remove('hidden');
  },

  showMenu() {
    const account = AppState.get('account');
    if (!account) return;
    // Simple confirm-based logout
    if (confirm(`Signed in as ${account.name}\n\nDo you want to sign out?`)) {
      this.logout();
    }
  },

  logout() {
    AppState.set('isAuthenticated', false);
    AppState.set('account', null);
    AppState.set('accessTokens', {});
    AppState.set('authMode', null);
    this.updateUI();
    Toast.show('Signed out successfully', 'info');
    if (this.msalInstance) {
      this.msalInstance.logoutPopup().catch(() => {});
    }
  }
};

// Initialize MSAL on load
// Initialize MSAL eagerly (async — login calls will await readiness)
Auth.init();
