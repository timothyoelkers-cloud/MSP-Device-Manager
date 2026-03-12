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
    'DeviceManagementConfiguration.ReadWrite.All',
    'DeviceManagementApps.ReadWrite.All',
    'DeviceManagementServiceConfig.ReadWrite.All',
    'DeviceManagementRBAC.ReadWrite.All',
    'Directory.Read.All',
    'Group.ReadWrite.All',
    'GroupMember.ReadWrite.All',
  ],

  // Partner Center scopes for GDAP
  partnerScopes: [
    'https://api.partnercenter.microsoft.com/user_impersonation'
  ],

  msalInstance: null,

  init() {
    try {
      this.msalInstance = new msal.PublicClientApplication(this.msalConfig);
    } catch (e) {
      console.warn('MSAL init skipped — configure clientId in auth.js');
    }
  },

  // Single tenant login
  async login() {
    if (!this.msalInstance) {
      Toast.show('Please configure your Azure App Registration clientId in js/auth.js', 'warning', 'Configuration Required');
      return;
    }
    try {
      const result = await this.msalInstance.loginPopup({
        scopes: this.graphScopes,
        prompt: 'select_account'
      });

      if (result?.account) {
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
    if (!this.msalInstance) {
      Toast.show('Please configure your Azure App Registration clientId in js/auth.js', 'warning', 'Configuration Required');
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

  // Acquire a delegated token for a specific tenant (GDAP)
  async acquireTokenForTenant(tenantId) {
    if (!this.msalInstance) return null;
    try {
      const tokenRequest = {
        scopes: this.graphScopes,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        account: this.msalInstance.getAllAccounts()[0]
      };

      let result;
      try {
        result = await this.msalInstance.acquireTokenSilent(tokenRequest);
      } catch {
        result = await this.msalInstance.acquireTokenPopup(tokenRequest);
      }

      if (result?.accessToken) {
        const tokens = { ...AppState.get('accessTokens') };
        tokens[tenantId] = result.accessToken;
        AppState.set('accessTokens', tokens);
        return result.accessToken;
      }
    } catch (error) {
      console.warn(`Token acquisition failed for tenant ${tenantId}:`, error.message);
    }
    return null;
  },

  // Get access token for a tenant
  async getToken(tenantId) {
    let token = AppState.get('accessTokens')[tenantId];
    if (!token) {
      token = await this.acquireTokenForTenant(tenantId);
    }
    return token;
  },

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
Auth.init();
