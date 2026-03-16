/* ============================================================
   Graph API — Centralized Microsoft Graph API calls
   ============================================================ */

const Graph = {
  baseUrl: 'https://graph.microsoft.com/v1.0',
  betaUrl: 'https://graph.microsoft.com/beta',

  // Auto-refresh configuration
  _refreshInterval: null,
  _refreshMinutes: 0,

  // Rate limit tracking — updated from Graph API response headers
  rateLimitStatus: {
    remaining: null,
    resetTime: null,
    throttled: false
  },

  // Returns the current rate limit / health status
  getHealthStatus() {
    return {
      remaining: this.rateLimitStatus.remaining,
      resetTime: this.rateLimitStatus.resetTime,
      throttled: this.rateLimitStatus.throttled,
      healthy: !this.rateLimitStatus.throttled && (this.rateLimitStatus.remaining === null || this.rateLimitStatus.remaining > 10)
    };
  },

  // Private helper: updates rateLimitStatus from response headers
  _updateRateLimitStatus(response) {
    const remaining = response.headers.get('RateLimit-Remaining') ?? response.headers.get('x-ms-ratelimit-remaining');
    const reset = response.headers.get('RateLimit-Reset') ?? response.headers.get('x-ms-ratelimit-reset');
    if (remaining !== null) {
      this.rateLimitStatus.remaining = parseInt(remaining, 10);
    }
    if (reset !== null) {
      this.rateLimitStatus.resetTime = new Date(Date.now() + parseInt(reset, 10) * 1000).toISOString();
    }
    this.rateLimitStatus.throttled = response.status === 429;
  },

  // Private helper: fetch with retry, exponential backoff, and 401 token refresh
  async _fetchWithRetry(url, fetchOptions, tenantId, maxRetries = 3) {
    let lastError = null;
    let has401Retried = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        // Update rate limit tracking from headers
        this._updateRateLimitStatus(response);

        // HTTP 429 — Too Many Requests
        if (response.status === 429) {
          if (attempt < maxRetries) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            console.warn(`[Graph] 429 throttled on ${url} — retrying in ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            continue;
          }
        }

        // HTTP 5xx — Server errors with exponential backoff
        if (response.status >= 500 && response.status <= 504) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            console.warn(`[Graph] ${response.status} server error on ${url} — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }

        // HTTP 401 — Attempt token refresh once
        if (response.status === 401 && !has401Retried) {
          has401Retried = true;
          console.warn(`[Graph] 401 on ${url} — attempting token refresh`);
          try {
            const newToken = await Auth.getToken(tenantId);
            if (newToken) {
              fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
              continue;
            }
          } catch (refreshErr) {
            console.warn('[Graph] Token refresh failed:', refreshErr.message);
          }
        }

        // Return response for all other cases (success or non-retryable errors)
        return response;
      } catch (networkErr) {
        // Network-level errors (DNS, timeout, etc.) — retry with backoff
        lastError = networkErr;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[Graph] Network error on ${url}: ${networkErr.message} — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error(`[Graph] Request to ${url} failed after ${maxRetries + 1} attempts`);
  },

  // Generic Graph API call with retry logic
  async call(tenantId, endpoint, options = {}) {
    const maxRetries = options.retries ?? 2;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._doCall(tenantId, endpoint, options);
      } catch (err) {
        lastError = err;
        // Don't retry auth errors or client errors (4xx except 429)
        if (err.isAuthError || (err.statusCode && err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 429)) {
          throw err;
        }
        // Retry with exponential backoff for 429 (throttled) and 5xx
        if (attempt < maxRetries) {
          const delay = err.statusCode === 429
            ? (err.retryAfter || (2 ** attempt * 2)) * 1000
            : 2 ** attempt * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  },

  async _doCall(tenantId, endpoint, options = {}) {
    const token = await Auth.getToken(tenantId);
    if (!token) {
      const err = new Error('No access token for tenant ' + tenantId);
      err.isAuthError = true;
      throw err;
    }

    const url = (options.beta ? this.betaUrl : this.baseUrl) + endpoint;
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    };

    // Use _fetchWithRetry for automatic retry on 429, 5xx, 401, and network errors
    const response = await this._fetchWithRetry(url, fetchOptions, tenantId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      if (response.status === 401) {
        const tokens = { ...AppState.get('accessTokens') };
        delete tokens[tenantId];
        AppState.set('accessTokens', tokens);
        Auth._showReconnectBanner('Your session token has expired. Please reconnect to continue.');
        const err = new Error('Session expired — please reconnect');
        err.isAuthError = true;
        throw err;
      }
      const err = new Error(errBody.error?.message || `Graph API error ${response.status}`);
      err.statusCode = response.status;
      if (response.status === 429) {
        err.retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      }
      throw err;
    }

    if (response.status === 204) return null;
    return response.json();
  },

  // Batch API — send up to 20 requests in a single call
  async batch(tenantId, requests, options = {}) {
    const batchSize = 20;
    const allResponses = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const chunk = requests.slice(i, i + batchSize).map((req, idx) => ({
        id: String(i + idx + 1),
        method: req.method || 'GET',
        url: req.url,
        ...(req.body ? { body: req.body, headers: { 'Content-Type': 'application/json' } } : {})
      }));

      const result = await this.call(tenantId, '/$batch', {
        method: 'POST',
        body: { requests: chunk },
        beta: options.beta,
        retries: 1
      });

      if (result?.responses) {
        allResponses.push(...result.responses);
      }
    }

    return allResponses.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  },

  // Auto-refresh management
  startAutoRefresh(minutes) {
    this.stopAutoRefresh();
    if (minutes <= 0) return;
    this._refreshMinutes = minutes;
    this._refreshInterval = setInterval(() => {
      const tenants = AppState.get('tenants');
      if (tenants.length === 0) return;
      tenants.forEach(t => this.loadAllData(t.id).catch(() => {}));
    }, minutes * 60 * 1000);
  },

  stopAutoRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
    this._refreshMinutes = 0;
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
    // Pre-check: can we even get a token for this tenant?
    const token = await Auth.getToken(tenantId);
    if (!token) {
      console.warn(`Skipping data load for ${tenantId} — no token available`);
      Auth._showReconnectBanner('Could not authenticate to load tenant data. Please reconnect.');
      return;
    }

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
      this.loadUsers(tenantId),
      this.loadCAPolicies(tenantId),
      this.loadAppProtectionPolicies(tenantId),
      this.loadEnrollmentConfigs(tenantId),
      this.loadSecurityBaselines(tenantId),
      this.loadHealthScripts(tenantId),
      this.loadSubscribedSkus(tenantId),
    ];

    const results = await Promise.allSettled(loaders);
    const failures = results.filter(r => r.status === 'rejected');
    const authFailures = failures.filter(r => r.reason?.isAuthError);

    AppState.setLoading('global', false);

    if (failures.length === 0) {
      Toast.show(`All data loaded for ${AppState.getTenantName(tenantId)}`, 'success');
    } else if (authFailures.length > 0) {
      Toast.show('Session expired — please reconnect to load data.', 'error', 'Authentication Required');
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
      console.log(`Loaded ${apps.length} apps for tenant ${tenantId}`);
    } catch (err) {
      console.error(`Failed to load apps for ${tenantId}:`, err.message);
      throw err; // Re-throw so loadAllData records this failure
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
    // First try the beta recoveryKeys endpoint with odata.filter
    try {
      const result = await this.call(tenantId, `/informationProtection/bitlocker/recoveryKeys?$filter=deviceId eq '${encodeURIComponent(deviceId)}'`, { beta: true });
      if (result?.value?.length > 0) {
        // Fetch the actual key values (requires separate call per key)
        const keys = [];
        for (const key of result.value) {
          try {
            const detail = await this.call(tenantId, `/informationProtection/bitlocker/recoveryKeys/${key.id}?$select=key`, { beta: true });
            keys.push({ id: key.id, key: detail?.key || 'Unable to retrieve', volumeType: key.volumeType, createdDateTime: key.createdDateTime });
          } catch {
            keys.push({ id: key.id, key: 'Access denied — requires BitLockerKey.Read.All', volumeType: key.volumeType, createdDateTime: key.createdDateTime });
          }
        }
        return { value: keys };
      }
      return result;
    } catch (err) {
      // Fallback: check if it's a permission issue
      if (err.statusCode === 403) {
        throw new Error('BitLocker key retrieval requires the BitLockerKey.Read.All permission. Grant this in your App Registration.');
      }
      throw err;
    }
  },

  async getDeviceCompliance(tenantId, deviceId) {
    return await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`);
  },

  // --- NEW DEVICE ACTIONS ---

  async freshStart(tenantId, deviceId, keepUserData = false) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/cleanWindowsDevice`, {
      method: 'POST', body: { keepUserData }
    });
  },

  async windowsDefenderScan(tenantId, deviceId, quickScan = true) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/windowsDefenderScan`, {
      method: 'POST', body: { quickScan }
    });
  },

  async updateDefenderSignatures(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/windowsDefenderUpdateSignatures`, { method: 'POST' });
  },

  async collectDiagnostics(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/createDeviceLogCollectionRequest`, {
      method: 'POST',
      body: { templateType: { '@odata.type': '#microsoft.graph.deviceLogCollectionRequest' } },
      beta: true
    });
  },

  async shutdownDevice(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/shutDown`, { method: 'POST' });
  },

  async recoverPasscode(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/recoverPasscode`, { method: 'POST' });
  },

  async locateDevice(tenantId, deviceId) {
    return await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/locateDevice`, { method: 'POST' });
  },

  async rotateFileVaultKey(tenantId, deviceId) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}/rotateFileVaultKey`, { method: 'POST', beta: true });
  },

  async updateDeviceNotes(tenantId, deviceId, notes) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}`, {
      method: 'PATCH', body: { notes }
    });
  },

  async patchDevice(tenantId, deviceId, updates) {
    await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}`, {
      method: 'PATCH', body: updates
    });
  },

  async getDeviceInstalledApps(tenantId, deviceId) {
    // Try detectedApps first (works for most devices)
    try {
      const apps = await this.callPaged(tenantId, `/deviceManagement/managedDevices/${deviceId}/detectedApps`);
      if (apps && apps.length > 0) return apps;
    } catch {}
    // Fallback to beta managedDevices detail with expand
    try {
      const result = await this.call(tenantId, `/deviceManagement/managedDevices/${deviceId}?$expand=detectedApps`, { beta: true });
      return result?.detectedApps || [];
    } catch {}
    return [];
  },

  async getDeviceGroupMemberships(tenantId, azureAdDeviceId) {
    if (!azureAdDeviceId) return [];
    try {
      const devices = await this.callPaged(tenantId, `/devices?$filter=deviceId eq '${encodeURIComponent(azureAdDeviceId)}'&$expand=memberOf($select=id,displayName,groupTypes)`);
      if (devices?.length > 0 && devices[0].memberOf) return devices[0].memberOf;
    } catch {}
    return [];
  },

  async getDeviceConfigStates(tenantId, deviceId) {
    return await this.callPaged(tenantId, `/deviceManagement/managedDevices/${deviceId}/deviceConfigurationStates`);
  },

  // --- POLICY CREATION ---

  async createCompliancePolicy(tenantId, policy) {
    return await this.call(tenantId, '/deviceManagement/deviceCompliancePolicies', {
      method: 'POST', body: policy
    });
  },

  async createConfigProfile(tenantId, profile) {
    return await this.call(tenantId, '/deviceManagement/deviceConfigurations', {
      method: 'POST', body: profile
    });
  },

  async assignPolicy(tenantId, policyId, policyType, groupIds) {
    const assignments = groupIds.map(gid => ({
      target: { '@odata.type': '#microsoft.graph.groupAssignmentTarget', groupId: gid }
    }));
    const endpoint = policyType === 'compliance'
      ? `/deviceManagement/deviceCompliancePolicies/${policyId}/assign`
      : `/deviceManagement/deviceConfigurations/${policyId}/assign`;
    return await this.call(tenantId, endpoint, {
      method: 'POST', body: { assignments }
    });
  },

  async deletePolicy(tenantId, policyId, policyType) {
    const endpoint = policyType === 'compliance'
      ? `/deviceManagement/deviceCompliancePolicies/${policyId}`
      : `/deviceManagement/deviceConfigurations/${policyId}`;
    return await this.call(tenantId, endpoint, { method: 'DELETE' });
  },

  // --- APP MANAGEMENT ---

  async getAppAssignments(tenantId, appId) {
    return await this.call(tenantId, `/deviceAppManagement/mobileApps/${appId}/assignments`);
  },

  async getAppDeviceStatuses(tenantId, appId) {
    return await this.callPaged(tenantId, `/deviceAppManagement/mobileApps/${appId}/deviceStatuses`, { beta: true });
  },

  async assignApp(tenantId, appId, assignments) {
    return await this.call(tenantId, `/deviceAppManagement/mobileApps/${appId}/assign`, {
      method: 'POST',
      body: { mobileAppAssignments: assignments }
    });
  },

  async removeAppAssignment(tenantId, appId, assignmentId) {
    return await this.call(tenantId, `/deviceAppManagement/mobileApps/${appId}/assignments/${assignmentId}`, {
      method: 'DELETE'
    });
  },

  // --- WINDOWS UPDATES ---

  async getWindowsUpdateStates(tenantId) {
    return await this.callPaged(tenantId, '/deviceManagement/managedDevices?$select=id,deviceName,osVersion,lastSyncDateTime,complianceState&$filter=operatingSystem eq \'Windows\'');
  },

  async getWindowsFeatureUpdates(tenantId) {
    return await this.callPaged(tenantId, '/deviceManagement/windowsFeatureUpdateProfiles', { beta: true });
  },

  async getWindowsQualityUpdates(tenantId) {
    return await this.callPaged(tenantId, '/deviceManagement/windowsQualityUpdateProfiles', { beta: true });
  },

  async getWindowsDriverUpdates(tenantId) {
    return await this.callPaged(tenantId, '/deviceManagement/windowsDriverUpdateProfiles', { beta: true });
  },

  async createUpdateRing(tenantId, ring) {
    return await this.call(tenantId, '/deviceManagement/deviceConfigurations', {
      method: 'POST',
      body: { ...ring, '@odata.type': '#microsoft.graph.windowsUpdateForBusinessConfiguration' }
    });
  },

  async deleteUpdateRing(tenantId, ringId) {
    return await this.call(tenantId, `/deviceManagement/deviceConfigurations/${ringId}`, { method: 'DELETE' });
  },

  // === NEW MODULE LOADERS ===

  // Load users
  async loadUsers(tenantId) {
    AppState.setLoading('users', true);
    try {
      const users = await this.callPaged(tenantId, '/users?$top=100&$select=id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses,jobTitle,department,createdDateTime,signInActivity');
      const cache = { ...AppState.get('users') };
      cache[tenantId] = users;
      AppState.set('users', cache);
    } finally {
      AppState.setLoading('users', false);
    }
  },

  // Get user's managed devices
  async getUserDevices(tenantId, userId) {
    return await this.callPaged(tenantId, `/users/${userId}/managedDevices?$select=id,deviceName,operatingSystem,complianceState,lastSyncDateTime`);
  },

  // Load Conditional Access policies
  async loadCAPolicies(tenantId) {
    AppState.setLoading('caPolicies', true);
    try {
      const policies = await this.callPaged(tenantId, '/identity/conditionalAccess/policies');
      const cache = { ...AppState.get('caPolicies') };
      cache[tenantId] = policies;
      AppState.set('caPolicies', cache);
    } finally {
      AppState.setLoading('caPolicies', false);
    }
  },

  // Load App Protection (MAM) policies
  async loadAppProtectionPolicies(tenantId) {
    AppState.setLoading('appProtectionPolicies', true);
    try {
      const policies = await this.callPaged(tenantId, '/deviceAppManagement/managedAppPolicies');
      const cache = { ...AppState.get('appProtectionPolicies') };
      cache[tenantId] = policies;
      AppState.set('appProtectionPolicies', cache);
    } finally {
      AppState.setLoading('appProtectionPolicies', false);
    }
  },

  // Load Enrollment configurations
  async loadEnrollmentConfigs(tenantId) {
    AppState.setLoading('enrollmentConfigs', true);
    try {
      const configs = await this.callPaged(tenantId, '/deviceManagement/deviceEnrollmentConfigurations');
      const cache = { ...AppState.get('enrollmentConfigs') };
      cache[tenantId] = configs;
      AppState.set('enrollmentConfigs', cache);
    } finally {
      AppState.setLoading('enrollmentConfigs', false);
    }
  },

  // Load Security Baselines (beta endpoint)
  async loadSecurityBaselines(tenantId) {
    AppState.setLoading('securityBaselines', true);
    try {
      const baselines = await this.callPaged(tenantId, '/deviceManagement/templates', { beta: true });
      const cache = { ...AppState.get('securityBaselines') };
      cache[tenantId] = baselines;
      AppState.set('securityBaselines', cache);
    } finally {
      AppState.setLoading('securityBaselines', false);
    }
  },

  // Load Device Health Scripts (Remediations)
  async loadHealthScripts(tenantId) {
    AppState.setLoading('healthScripts', true);
    try {
      const scripts = await this.callPaged(tenantId, '/deviceManagement/deviceHealthScripts', { beta: true });
      const cache = { ...AppState.get('healthScripts') };
      cache[tenantId] = scripts;
      AppState.set('healthScripts', cache);
    } finally {
      AppState.setLoading('healthScripts', false);
    }
  },

  // Get remediation script run history
  async getScriptRunHistory(tenantId, scriptId) {
    return await this.callPaged(tenantId, `/deviceManagement/deviceHealthScripts/${scriptId}/deviceRunStates`, { beta: true });
  },

  // === LICENSE & USER CREATION ===

  async loadSubscribedSkus(tenantId) {
    const skus = await this.callPaged(tenantId, '/subscribedSkus');
    const cache = { ...AppState.get('subscribedSkus') };
    cache[tenantId] = skus;
    AppState.set('subscribedSkus', cache);
  },

  async createUser(tenantId, userPayload) {
    return await this.call(tenantId, '/users', { method: 'POST', body: userPayload });
  },

  // === USER LIFECYCLE ===

  async updateUser(tenantId, userId, updates) {
    await this.call(tenantId, `/users/${userId}`, { method: 'PATCH', body: updates });
  },

  async deleteUser(tenantId, userId) {
    await this.call(tenantId, `/users/${userId}`, { method: 'DELETE' });
  },

  async revokeUserSessions(tenantId, userId) {
    await this.call(tenantId, `/users/${userId}/revokeSignInSessions`, { method: 'POST' });
  },

  async resetUserPassword(tenantId, userId, newPassword) {
    await this.call(tenantId, `/users/${userId}`, {
      method: 'PATCH',
      body: {
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: newPassword
        }
      }
    });
  },

  async removeAllUserLicenses(tenantId, userId) {
    // First get current licenses
    const user = await this.call(tenantId, `/users/${userId}?$select=assignedLicenses`);
    if (user?.assignedLicenses?.length > 0) {
      await this.call(tenantId, `/users/${userId}/assignLicense`, {
        method: 'POST',
        body: {
          addLicenses: [],
          removeLicenses: user.assignedLicenses.map(l => l.skuId)
        }
      });
    }
  },

  async getUserGroups(tenantId, userId) {
    return await this.callPaged(tenantId, `/users/${userId}/memberOf?$select=id,displayName,groupTypes,mailEnabled,securityEnabled`);
  },

  async removeUserFromGroup(tenantId, groupId, userId) {
    await this.call(tenantId, `/groups/${groupId}/members/${userId}/$ref`, { method: 'DELETE' });
  },

  // --- Group CRUD ---
  async createGroup(tenantId, payload) {
    return await this.call(tenantId, '/groups', { method: 'POST', body: payload });
  },

  async updateGroup(tenantId, groupId, payload) {
    await this.call(tenantId, `/groups/${groupId}`, { method: 'PATCH', body: payload });
  },

  async deleteGroup(tenantId, groupId) {
    await this.call(tenantId, `/groups/${groupId}`, { method: 'DELETE' });
  },

  async getGroupMembers(tenantId, groupId) {
    return await this.callPaged(tenantId, `/groups/${groupId}/members?$select=id,displayName,userPrincipalName,mail,userType`);
  },

  async addGroupMember(tenantId, groupId, memberId) {
    await this.call(tenantId, `/groups/${groupId}/members/$ref`, {
      method: 'POST',
      body: { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${memberId}` }
    });
  },

  // --- Autopilot Profiles ---
  async getAutopilotProfiles(tenantId) {
    return await this.callPaged(tenantId, '/deviceManagement/windowsAutopilotDeploymentProfiles?$select=id,displayName,description,language,extractHardwareHash,outOfBoxExperienceSettings,enrollmentStatusScreenSettings');
  },

  async createAutopilotProfile(tenantId, payload) {
    return await this.call(tenantId, '/deviceManagement/windowsAutopilotDeploymentProfiles', { method: 'POST', body: payload });
  },

  async deleteAutopilotProfile(tenantId, profileId) {
    await this.call(tenantId, `/deviceManagement/windowsAutopilotDeploymentProfiles/${profileId}`, { method: 'DELETE' });
  },

  async assignAutopilotProfile(tenantId, profileId, groupIds) {
    const assignments = groupIds.map(gid => ({
      target: { '@odata.type': '#microsoft.graph.groupAssignmentTarget', groupId: gid }
    }));
    await this.call(tenantId, `/deviceManagement/windowsAutopilotDeploymentProfiles/${profileId}/assignments`, {
      method: 'POST', body: { deviceManagementAutopilotPolicyAssignment: assignments }
    });
  },

  // --- Directory Audit Logs ---
  async getDirectoryAuditLogs(tenantId, top = 50) {
    return await this.call(tenantId, `/auditLogs/directoryAudits?$top=${top}&$orderby=activityDateTime desc`);
  },

  async getSignInLogs(tenantId, top = 50) {
    return await this.call(tenantId, `/auditLogs/signIns?$top=${top}&$orderby=createdDateTime desc`);
  },

  async removeUserFromAllGroups(tenantId, userId) {
    const groups = await this.getUserGroups(tenantId, userId);
    const removable = (groups || []).filter(g => g['@odata.type'] === '#microsoft.graph.group');
    for (const group of removable) {
      try {
        await this.removeUserFromGroup(tenantId, group.id, userId);
      } catch (e) {
        console.warn(`Failed to remove from group ${group.displayName}:`, e);
      }
    }
  },

  async setAutoReply(tenantId, userId, message) {
    await this.call(tenantId, `/users/${userId}/mailboxSettings`, {
      method: 'PATCH',
      body: {
        automaticRepliesSetting: {
          status: 'alwaysEnabled',
          internalReplyMessage: message,
          externalReplyMessage: message
        }
      }
    });
  },

  async setMailForwarding(tenantId, userId, forwardTo) {
    await this.call(tenantId, `/users/${userId}/mailboxSettings`, {
      method: 'PATCH',
      body: {
        automaticRepliesSetting: { status: 'alwaysEnabled' }
      }
    });
    // Mail forwarding requires Exchange cmdlet or mail flow rule
    // Using Graph forwarding address on messages
    await this.call(tenantId, `/users/${userId}`, {
      method: 'PATCH',
      body: { otherMails: [forwardTo] }
    });
  },

  async wipeUserDevices(tenantId, userId) {
    const devices = await this.getUserDevices(tenantId, userId);
    for (const device of devices) {
      try {
        await this.wipeDevice(tenantId, device.id);
      } catch (e) {
        console.warn(`Failed to wipe device ${device.deviceName}:`, e);
      }
    }
  },
};
