/* ============================================================
   Graph API — Centralized Microsoft Graph API calls
   ============================================================ */

const Graph = {
  baseUrl: 'https://graph.microsoft.com/v1.0',
  betaUrl: 'https://graph.microsoft.com/beta',

  // Generic Graph API call
  async call(tenantId, endpoint, options = {}) {
    const token = await Auth.getToken(tenantId);
    if (!token) {
      throw new Error('No access token for tenant ' + tenantId);
    }

    const url = (options.beta ? this.betaUrl : this.baseUrl) + endpoint;
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Graph API error ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // Paginated fetch — follows @odata.nextLink
  async callPaged(tenantId, endpoint, options = {}) {
    let allItems = [];
    let url = endpoint;

    while (url) {
      const data = await this.call(tenantId, url, options);
      if (data?.value) {
        allItems = allItems.concat(data.value);
      }
      // Follow next page
      url = data?.['@odata.nextLink'];
      if (url) {
        url = url.replace(this.baseUrl, '').replace(this.betaUrl, '');
      }
    }

    return allItems;
  },

  // === DATA LOADING ===

  // Load all data for a tenant
  async loadAllData(tenantId) {
    AppState.setLoading('global', true);
    Toast.show(`Loading data for ${AppState.getTenantName(tenantId)}...`, 'info');

    const loaders = [
      this.loadDevices(tenantId),
      this.loadCompliancePolicies(tenantId),
      this.loadConfigProfiles(tenantId),
      this.loadSecurityPolicies(tenantId),
      this.loadApps(tenantId),
      this.loadAutopilotDevices(tenantId),
      this.loadUpdateRings(tenantId),
      this.loadGroups(tenantId),
    ];

    const results = await Promise.allSettled(loaders);
    const failures = results.filter(r => r.status === 'rejected');

    AppState.setLoading('global', false);

    if (failures.length === 0) {
      Toast.show(`All data loaded for ${AppState.getTenantName(tenantId)}`, 'success');
    } else {
      Toast.show(`Loaded with ${failures.length} error(s). Some features may be limited.`, 'warning');
    }

    // Re-render current page
    Router.render(AppState.get('currentPage'));
  },

  // Load managed devices
  async loadDevices(tenantId) {
    AppState.setLoading('devices', true);
    try {
      const devices = await this.callPaged(tenantId, '/deviceManagement/managedDevices?$top=100');
      const cache = { ...AppState.get('devices') };
      cache[tenantId] = devices;
      AppState.set('devices', cache);
    } finally {
      AppState.setLoading('devices', false);
    }
  },

  // Load compliance policies
  async loadCompliancePolicies(tenantId) {
    AppState.setLoading('compliance', true);
    try {
      const policies = await this.callPaged(tenantId, '/deviceManagement/deviceCompliancePolicies');
      const cache = { ...AppState.get('compliancePolicies') };
      cache[tenantId] = policies;
      AppState.set('compliancePolicies', cache);
    } finally {
      AppState.setLoading('compliance', false);
    }
  },

  // Load configuration profiles
  async loadConfigProfiles(tenantId) {
    AppState.setLoading('configurations', true);
    try {
      const profiles = await this.callPaged(tenantId, '/deviceManagement/deviceConfigurations');
      const cache = { ...AppState.get('configProfiles') };
      cache[tenantId] = profiles;
      AppState.set('configProfiles', cache);
    } finally {
      AppState.setLoading('configurations', false);
    }
  },

  // Load endpoint security policies
  async loadSecurityPolicies(tenantId) {
    AppState.setLoading('security', true);
    try {
      // Load antivirus, firewall, disk encryption, etc.
      const [antivirus, firewall, diskEncryption] = await Promise.allSettled([
        this.callPaged(tenantId, '/deviceManagement/intents?$filter=templateId eq \'d1174162-1dd2-4976-affc-6667049ab0ae\'', { beta: true }),
        this.callPaged(tenantId, '/deviceManagement/intents?$filter=templateId eq \'4356d05c-a4ab-4a07-9ece-739f7c792910\'', { beta: true }),
        this.callPaged(tenantId, '/deviceManagement/intents?$filter=templateId eq \'a239407c-698d-4ef8-b314-e3ae409204b8\'', { beta: true }),
      ]);

      const policies = [
        ...(antivirus.status === 'fulfilled' ? antivirus.value : []).map(p => ({ ...p, _type: 'Antivirus' })),
        ...(firewall.status === 'fulfilled' ? firewall.value : []).map(p => ({ ...p, _type: 'Firewall' })),
        ...(diskEncryption.status === 'fulfilled' ? diskEncryption.value : []).map(p => ({ ...p, _type: 'Disk Encryption' })),
      ];

      const cache = { ...AppState.get('securityPolicies') };
      cache[tenantId] = policies;
      AppState.set('securityPolicies', cache);
    } finally {
      AppState.setLoading('security', false);
    }
  },

  // Load apps
  async loadApps(tenantId) {
    AppState.setLoading('apps', true);
    try {
      const apps = await this.callPaged(tenantId, '/deviceAppManagement/mobileApps?$top=100');
      const cache = { ...AppState.get('apps') };
      cache[tenantId] = apps;
      AppState.set('apps', cache);
    } finally {
      AppState.setLoading('apps', false);
    }
  },

  // Load Autopilot devices
  async loadAutopilotDevices(tenantId) {
    AppState.setLoading('autopilot', true);
    try {
      const devices = await this.callPaged(tenantId, '/deviceManagement/windowsAutopilotDeviceIdentities');
      const cache = { ...AppState.get('autopilotDevices') };
      cache[tenantId] = devices;
      AppState.set('autopilotDevices', cache);
    } finally {
      AppState.setLoading('autopilot', false);
    }
  },

  // Load Windows Update rings
  async loadUpdateRings(tenantId) {
    AppState.setLoading('updates', true);
    try {
      const rings = await this.callPaged(tenantId, '/deviceManagement/deviceConfigurations?$filter=isof(\'microsoft.graph.windowsUpdateForBusinessConfiguration\')');
      const cache = { ...AppState.get('updateRings') };
      cache[tenantId] = rings;
      AppState.set('updateRings', cache);
    } finally {
      AppState.setLoading('updates', false);
    }
  },

  // Load groups
  async loadGroups(tenantId) {
    AppState.setLoading('groups', true);
    try {
      const groups = await this.callPaged(tenantId, '/groups?$filter=groupTypes/any(g:g eq \'DynamicMembership\') or mailEnabled eq false&$top=100&$select=id,displayName,description,membershipRule,groupTypes,createdDateTime');
      const cache = { ...AppState.get('groups') };
      cache[tenantId] = groups;
      AppState.set('groups', cache);
    } finally {
      AppState.setLoading('groups', false);
    }
  },

  // === DEVICE ACTIONS ===

  async syncDevice(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/syncDevice`, { method: 'POST' });
  },

  async restartDevice(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/rebootNow`, { method: 'POST' });
  },

  async lockDevice(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/remoteLock`, { method: 'POST' });
  },

  async retireDevice(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/retire`, { method: 'POST' });
  },

  async wipeDevice(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/wipe`, {
      method: 'POST',
      body: { keepEnrollmentData: false, keepUserData: false }
    });
  },

  async renameDevice(tenantId, deviceId, newName) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}`, {
      method: 'PATCH',
      body: { deviceName: newName }
    });
  },

  async rotateBitLockerKeys(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/rotateBitLockerKeys`, { method: 'POST', beta: true });
  },

  async getBitLockerKeys(tenantId, deviceId) {
    return await this.call(tenantId, `/informationProtection/bitlocker/recoveryKeys?$filter=deviceId eq '${deviceId}'`, { beta: true });
  },

  async getDeviceCompliance(tenantId, deviceId) {
    return await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`);
  }
};
