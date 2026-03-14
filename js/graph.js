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
      const err = new Error('No access token for tenant ' + tenantId);
      err.isAuthError = true;
      throw err;
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
      const errBody = await response.json().catch(() => ({}));
      // 401 = token expired/invalid, trigger reconnect
      if (response.status === 401) {
        // Clear the stale token
        const tokens = { ...AppState.get('accessTokens') };
        delete tokens[tenantId];
        AppState.set('accessTokens', tokens);
        Auth._showReconnectBanner('Your session token has expired. Please reconnect to continue.');
        const err = new Error('Session expired — please reconnect');
        err.isAuthError = true;
        throw err;
      }
      throw new Error(errBody.error?.message || `Graph API error ${response.status}`);
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
    return await this.call(tenantId, `/informationProtection/bitlocker/recoveryKeys?$filter=deviceId eq '${deviceId}'`, { beta: true });
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
    return await this.callPaged(tenantId, `/deviceManagement/managedDevices/${deviceId}/detectedApps`);
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
