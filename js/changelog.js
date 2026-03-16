/* ============================================================
   Change Log / Diff Viewer — Policy snapshot timeline & comparison
   ============================================================ */

const ChangeLog = {
  STORAGE_KEY: 'policy_snapshots',
  AUTO_SNAPSHOT_KEY: 'changelog_auto_snapshot',
  MAX_SNAPSHOTS: 50,
  _autoInterval: null,
  _compareMode: false,
  _selectedForCompare: [],
  _expandedSnapshot: null,

  // ── Persistence ──────────────────────────────────────────────

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  _save(snapshots) {
    // Cap at MAX_SNAPSHOTS, keep most recent
    if (snapshots.length > this.MAX_SNAPSHOTS) {
      snapshots = snapshots.slice(0, this.MAX_SNAPSHOTS);
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshots));
    } catch (e) {
      Toast.show('Failed to save snapshots — localStorage may be full', 'error');
    }
  },

  // ── Snapshot Capture ─────────────────────────────────────────

  takeSnapshot(tenantId) {
    const tenantName = AppState.getTenantName(tenantId);
    const snapshot = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      tenantId,
      tenantName,
      policies: {
        compliance: this._cloneArray(AppState.get('compliancePolicies')?.[tenantId]),
        config: this._cloneArray(AppState.get('configProfiles')?.[tenantId]),
        ca: this._cloneArray(AppState.get('caPolicies')?.[tenantId]),
        appProtection: this._cloneArray(AppState.get('appProtectionPolicies')?.[tenantId])
      }
    };

    const snapshots = this._load();
    snapshots.unshift(snapshot);
    this._save(snapshots);

    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('policy_snapshot', `Captured policy snapshot for ${tenantName}`);
    }

    return snapshot;
  },

  takeAllSnapshots() {
    const tenants = AppState.get('tenants') || [];
    if (tenants.length === 0) {
      Toast.show('No tenants available to snapshot', 'warning');
      return [];
    }
    const results = [];
    tenants.forEach(t => {
      results.push(this.takeSnapshot(t.id));
    });
    Toast.show(`Captured snapshots for ${results.length} tenant(s)`, 'success');
    return results;
  },

  _cloneArray(arr) {
    if (!arr || !Array.isArray(arr)) return [];
    try {
      return JSON.parse(JSON.stringify(arr));
    } catch (e) {
      return [];
    }
  },

  // ── Snapshot Comparison ──────────────────────────────────────

  compareSnapshots(snapshotId1, snapshotId2) {
    const snapshots = this._load();
    const s1 = snapshots.find(s => s.id === snapshotId1);
    const s2 = snapshots.find(s => s.id === snapshotId2);
    if (!s1 || !s2) return null;

    // Ensure s1 is older, s2 is newer
    const older = new Date(s1.timestamp) <= new Date(s2.timestamp) ? s1 : s2;
    const newer = new Date(s1.timestamp) <= new Date(s2.timestamp) ? s2 : s1;

    const diff = {
      older: { id: older.id, timestamp: older.timestamp, tenantName: older.tenantName },
      newer: { id: newer.id, timestamp: newer.timestamp, tenantName: newer.tenantName },
      changes: {}
    };

    const policyTypes = [
      { key: 'compliance', label: 'Compliance Policies' },
      { key: 'config', label: 'Configuration Profiles' },
      { key: 'ca', label: 'Conditional Access Policies' },
      { key: 'appProtection', label: 'App Protection Policies' }
    ];

    policyTypes.forEach(({ key, label }) => {
      const oldPolicies = older.policies[key] || [];
      const newPolicies = newer.policies[key] || [];
      const changes = this._diffPolicyArrays(oldPolicies, newPolicies);
      if (changes.added.length || changes.removed.length || changes.modified.length) {
        diff.changes[key] = { label, ...changes };
      }
    });

    return diff;
  },

  _diffPolicyArrays(oldArr, newArr) {
    const result = { added: [], removed: [], modified: [] };
    const oldMap = new Map();
    const newMap = new Map();

    oldArr.forEach(p => oldMap.set(p.id || p.displayName || JSON.stringify(p), p));
    newArr.forEach(p => newMap.set(p.id || p.displayName || JSON.stringify(p), p));

    // Added
    newMap.forEach((policy, key) => {
      if (!oldMap.has(key)) {
        result.added.push({
          name: policy.displayName || policy.name || key,
          policy
        });
      }
    });

    // Removed
    oldMap.forEach((policy, key) => {
      if (!newMap.has(key)) {
        result.removed.push({
          name: policy.displayName || policy.name || key,
          policy
        });
      }
    });

    // Modified
    oldMap.forEach((oldPolicy, key) => {
      if (newMap.has(key)) {
        const newPolicy = newMap.get(key);
        const propChanges = this._diffObjects(oldPolicy, newPolicy);
        if (propChanges.length > 0) {
          result.modified.push({
            name: oldPolicy.displayName || oldPolicy.name || key,
            changes: propChanges
          });
        }
      }
    });

    return result;
  },

  _diffObjects(obj1, obj2, prefix = '') {
    const changes = [];
    const skipKeys = new Set(['_tenantId']);
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    allKeys.forEach(key => {
      if (skipKeys.has(key)) return;
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const v1 = obj1?.[key];
      const v2 = obj2?.[key];

      if (v1 === v2) return;

      if (typeof v1 === 'object' && typeof v2 === 'object' && v1 !== null && v2 !== null && !Array.isArray(v1) && !Array.isArray(v2)) {
        changes.push(...this._diffObjects(v1, v2, fullKey));
      } else {
        const s1 = JSON.stringify(v1);
        const s2 = JSON.stringify(v2);
        if (s1 !== s2) {
          changes.push({ property: fullKey, oldValue: v1, newValue: v2 });
        }
      }
    });

    return changes;
  },

  // ── Auto-Snapshot ────────────────────────────────────────────

  enableAutoSnapshot(intervalHours) {
    this.disableAutoSnapshot();
    const setting = { enabled: true, intervalHours, lastRun: null };
    localStorage.setItem(this.AUTO_SNAPSHOT_KEY, JSON.stringify(setting));
    this._startAutoSnapshot(intervalHours);
    Toast.show(`Auto-snapshot enabled every ${intervalHours} hour(s)`, 'success');
  },

  disableAutoSnapshot() {
    if (this._autoInterval) {
      clearInterval(this._autoInterval);
      this._autoInterval = null;
    }
    localStorage.setItem(this.AUTO_SNAPSHOT_KEY, JSON.stringify({ enabled: false }));
  },

  _startAutoSnapshot(intervalHours) {
    this._autoInterval = setInterval(() => {
      this.takeAllSnapshots();
      const setting = JSON.parse(localStorage.getItem(this.AUTO_SNAPSHOT_KEY) || '{}');
      setting.lastRun = new Date().toISOString();
      localStorage.setItem(this.AUTO_SNAPSHOT_KEY, JSON.stringify(setting));
    }, intervalHours * 3600000);
  },

  restoreAutoSnapshot() {
    try {
      const setting = JSON.parse(localStorage.getItem(this.AUTO_SNAPSHOT_KEY) || '{}');
      if (setting.enabled && setting.intervalHours) {
        this._startAutoSnapshot(setting.intervalHours);
      }
    } catch (e) { /* ignore */ }
  },

  // ── Render ───────────────────────────────────────────────────

  render() {
    const main = document.getElementById('mainContent');
    const snapshots = this._load();
    const autoSetting = this._getAutoSetting();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Change Log</h1>
          <p class="page-subtitle">Policy snapshot timeline and diff viewer</p>
        </div>
        <div class="page-header-actions">
          ${this._compareMode ? `
            <span class="badge badge-info" style="margin-right:8px;">${this._selectedForCompare.length}/2 selected</span>
            <button class="btn btn-ghost" onclick="ChangeLog.toggleCompareMode()">Cancel</button>
            <button class="btn btn-primary" ${this._selectedForCompare.length !== 2 ? 'disabled' : ''} onclick="ChangeLog.showComparison()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/><path d="M21 21l-7-7"/><path d="M3 21l7-7"/></svg>
              Compare Selected
            </button>
          ` : `
            <button class="btn btn-ghost" onclick="ChangeLog.toggleCompareMode()" ${snapshots.length < 2 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/></svg>
              Compare
            </button>
            <button class="btn btn-primary" onclick="ChangeLog.handleTakeSnapshot()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Take Snapshot
            </button>
          `}
        </div>
      </div>

      <!-- Auto-snapshot setting -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div>
              <div style="font-weight:600;font-size:0.875rem;">Auto-Snapshot</div>
              <div style="font-size:0.75rem;color:var(--text-secondary);">
                ${autoSetting.enabled
                  ? `Active — every ${autoSetting.intervalHours}h${autoSetting.lastRun ? ' (last: ' + this._formatTimestamp(autoSetting.lastRun) + ')' : ''}`
                  : 'Disabled'}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <select class="form-select" id="changelogAutoInterval" style="width:auto;min-width:100px;">
              <option value="1" ${autoSetting.intervalHours === 1 ? 'selected' : ''}>Every 1h</option>
              <option value="4" ${autoSetting.intervalHours === 4 ? 'selected' : ''}>Every 4h</option>
              <option value="12" ${autoSetting.intervalHours === 12 ? 'selected' : ''}>Every 12h</option>
              <option value="24" ${autoSetting.intervalHours === 24 ? 'selected' : ''}>Every 24h</option>
            </select>
            ${autoSetting.enabled
              ? `<button class="btn btn-ghost btn-sm" onclick="ChangeLog.disableAutoSnapshot();ChangeLog.render();">Disable</button>`
              : `<button class="btn btn-sm btn-primary" onclick="ChangeLog.enableAutoSnapshot(parseInt(document.getElementById('changelogAutoInterval').value));ChangeLog.render();">Enable</button>`
            }
          </div>
        </div>
      </div>

      <!-- Comparison result container -->
      <div id="changelogCompareResult"></div>

      <!-- Timeline -->
      <div id="changelogTimeline">
        ${snapshots.length === 0
          ? this._renderEmptyState()
          : this._renderTimeline(snapshots)
        }
      </div>
    `;
  },

  _getAutoSetting() {
    try {
      return JSON.parse(localStorage.getItem(this.AUTO_SNAPSHOT_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  _renderEmptyState() {
    return `
      <div class="card" style="text-align:center;padding:60px 20px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5" style="margin:0 auto 16px;">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <h3 style="margin:0 0 8px;color:var(--text-secondary);">No Snapshots Yet</h3>
        <p style="color:var(--text-tertiary);margin:0 0 20px;">Take a snapshot to start tracking policy changes across your tenants.</p>
        <button class="btn btn-primary" onclick="ChangeLog.handleTakeSnapshot()">Take First Snapshot</button>
      </div>
    `;
  },

  _renderTimeline(snapshots) {
    let html = '<div class="changelog-timeline">';

    snapshots.forEach((snap, idx) => {
      const isExpanded = this._expandedSnapshot === snap.id;
      const isSelected = this._selectedForCompare.includes(snap.id);
      const policyCounts = this._countPolicies(snap);
      const totalPolicies = policyCounts.compliance + policyCounts.config + policyCounts.ca + policyCounts.appProtection;

      // Compute summary badge vs previous snapshot
      let summaryBadge = '';
      if (idx < snapshots.length - 1) {
        const diff = this.compareSnapshots(snap.id, snapshots[idx + 1].id);
        if (diff) {
          const totalChanges = Object.values(diff.changes).reduce((sum, c) => sum + c.added.length + c.removed.length + c.modified.length, 0);
          if (totalChanges > 0) {
            summaryBadge = `<span class="badge badge-warning" style="margin-left:8px;">${totalChanges} change${totalChanges !== 1 ? 's' : ''}</span>`;
          } else {
            summaryBadge = '<span class="badge badge-success" style="margin-left:8px;">No changes</span>';
          }
        }
      } else {
        summaryBadge = '<span class="badge" style="margin-left:8px;background:var(--bg-tertiary);color:var(--text-secondary);">Baseline</span>';
      }

      html += `
        <div class="changelog-timeline-item ${isSelected ? 'changelog-selected' : ''}" data-snapshot-id="${snap.id}">
          <div class="changelog-timeline-node"></div>
          <div class="changelog-timeline-card card" style="flex:1;margin:0;cursor:pointer;" onclick="ChangeLog.handleTimelineClick('${snap.id}')">
            <div class="card-body" style="padding:14px 18px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <span style="font-weight:600;font-size:0.875rem;">${this._escapeHtml(snap.tenantName)}</span>
                  ${summaryBadge}
                  <span style="font-size:0.75rem;color:var(--text-tertiary);">${totalPolicies} policies captured</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:0.75rem;color:var(--text-tertiary);">${this._formatTimestamp(snap.timestamp)}</span>
                  ${this._compareMode ? `
                    <input type="checkbox" ${isSelected ? 'checked' : ''} ${!isSelected && this._selectedForCompare.length >= 2 ? 'disabled' : ''} onclick="event.stopPropagation();ChangeLog.toggleCompareSelect('${snap.id}');" style="width:16px;height:16px;cursor:pointer;">
                  ` : `
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();ChangeLog.deleteSnapshot('${snap.id}');" title="Delete snapshot">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  `}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" style="transition:transform 0.2s;${isExpanded ? 'transform:rotate(180deg);' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              ${isExpanded ? this._renderSnapshotDetail(snap) : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    html += this._renderTimelineStyles();
    return html;
  },

  _renderSnapshotDetail(snap) {
    const types = [
      { key: 'compliance', label: 'Compliance Policies', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
      { key: 'config', label: 'Configuration Profiles', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
      { key: 'ca', label: 'Conditional Access', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' },
      { key: 'appProtection', label: 'App Protection', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' }
    ];

    let html = '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;">';
    types.forEach(({ key, label, icon }) => {
      const policies = snap.policies[key] || [];
      html += `
        <div style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">
            ${icon} ${label}
            <span class="badge" style="background:var(--bg-tertiary);color:var(--text-secondary);font-size:0.7rem;">${policies.length}</span>
          </div>
          ${policies.length === 0
            ? '<div style="font-size:0.75rem;color:var(--text-tertiary);padding-left:20px;">No policies captured</div>'
            : `<div style="padding-left:20px;display:flex;flex-direction:column;gap:2px;">
                ${policies.slice(0, 10).map(p => `<div style="font-size:0.75rem;color:var(--text-primary);">${this._escapeHtml(p.displayName || p.name || 'Unnamed policy')}</div>`).join('')}
                ${policies.length > 10 ? `<div style="font-size:0.75rem;color:var(--text-tertiary);">+ ${policies.length - 10} more</div>` : ''}
              </div>`
          }
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  // ── Comparison Display ───────────────────────────────────────

  showComparison() {
    if (this._selectedForCompare.length !== 2) return;
    const diff = this.compareSnapshots(this._selectedForCompare[0], this._selectedForCompare[1]);
    if (!diff) {
      Toast.show('Failed to compare snapshots', 'error');
      return;
    }

    const container = document.getElementById('changelogCompareResult');
    if (!container) return;

    const hasChanges = Object.keys(diff.changes).length > 0;

    let html = `
      <div class="card" style="margin-bottom:20px;border:1px solid var(--primary);border-radius:12px;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <div class="card-header-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/></svg>
            Comparison Result
          </div>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('changelogCompareResult').innerHTML='';ChangeLog._compareMode=false;ChangeLog._selectedForCompare=[];ChangeLog.render();">Close</button>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:20px;margin-bottom:16px;font-size:0.8rem;">
            <div style="flex:1;padding:10px 14px;background:var(--bg-secondary);border-radius:8px;">
              <div style="color:var(--text-tertiary);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;">Older Snapshot</div>
              <div style="font-weight:600;margin-top:2px;">${this._escapeHtml(diff.older.tenantName)}</div>
              <div style="color:var(--text-tertiary);font-size:0.75rem;">${this._formatTimestamp(diff.older.timestamp)}</div>
            </div>
            <div style="display:flex;align-items:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
            <div style="flex:1;padding:10px 14px;background:var(--bg-secondary);border-radius:8px;">
              <div style="color:var(--text-tertiary);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;">Newer Snapshot</div>
              <div style="font-weight:600;margin-top:2px;">${this._escapeHtml(diff.newer.tenantName)}</div>
              <div style="color:var(--text-tertiary);font-size:0.75rem;">${this._formatTimestamp(diff.newer.timestamp)}</div>
            </div>
          </div>
    `;

    if (!hasChanges) {
      html += `
        <div style="text-align:center;padding:30px 0;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" style="margin:0 auto 10px;display:block;"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div style="font-weight:600;color:var(--text-primary);">No Changes Detected</div>
          <div style="font-size:0.8rem;color:var(--text-tertiary);">The policies are identical between these two snapshots.</div>
        </div>
      `;
    } else {
      Object.entries(diff.changes).forEach(([typeKey, data]) => {
        html += `
          <div style="margin-bottom:16px;">
            <div style="font-weight:600;font-size:0.85rem;margin-bottom:8px;color:var(--text-primary);">${this._escapeHtml(data.label)}</div>
        `;

        // Added
        data.added.forEach(entry => {
          html += `
            <div class="changelog-diff-entry changelog-diff-added">
              <span class="changelog-diff-prefix">+</span>
              <span class="changelog-diff-name">${this._escapeHtml(entry.name)}</span>
              <span class="badge" style="background:#dcfce7;color:#166534;font-size:0.7rem;">Added</span>
            </div>
          `;
        });

        // Removed
        data.removed.forEach(entry => {
          html += `
            <div class="changelog-diff-entry changelog-diff-removed">
              <span class="changelog-diff-prefix">-</span>
              <span class="changelog-diff-name">${this._escapeHtml(entry.name)}</span>
              <span class="badge" style="background:#fee2e2;color:#991b1b;font-size:0.7rem;">Removed</span>
            </div>
          `;
        });

        // Modified
        data.modified.forEach(entry => {
          html += `
            <div class="changelog-diff-entry changelog-diff-modified">
              <span class="changelog-diff-prefix">~</span>
              <span class="changelog-diff-name">${this._escapeHtml(entry.name)}</span>
              <span class="badge" style="background:#fef3c7;color:#92400e;font-size:0.7rem;">Modified</span>
              <div class="changelog-diff-details">
                ${entry.changes.map(c => `
                  <div class="changelog-diff-prop">
                    <span class="changelog-diff-prop-name">${this._escapeHtml(c.property)}</span>
                    <span class="changelog-diff-old">${this._escapeHtml(this._formatValue(c.oldValue))}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <span class="changelog-diff-new">${this._escapeHtml(this._formatValue(c.newValue))}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        });

        html += '</div>';
      });
    }

    html += '</div></div>';
    container.innerHTML = html;

    // Scroll to comparison
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // ── Event Handlers ───────────────────────────────────────────

  handleTakeSnapshot() {
    const activeTenant = AppState.get('activeTenant');
    if (activeTenant === 'all') {
      this.takeAllSnapshots();
    } else {
      this.takeSnapshot(activeTenant);
      Toast.show('Snapshot captured', 'success');
    }
    this.render();
  },

  handleTimelineClick(snapshotId) {
    if (this._compareMode) {
      this.toggleCompareSelect(snapshotId);
    } else {
      this._expandedSnapshot = this._expandedSnapshot === snapshotId ? null : snapshotId;
      this.render();
    }
  },

  toggleCompareMode() {
    this._compareMode = !this._compareMode;
    this._selectedForCompare = [];
    document.getElementById('changelogCompareResult').innerHTML = '';
    this.render();
  },

  toggleCompareSelect(snapshotId) {
    const idx = this._selectedForCompare.indexOf(snapshotId);
    if (idx >= 0) {
      this._selectedForCompare.splice(idx, 1);
    } else if (this._selectedForCompare.length < 2) {
      this._selectedForCompare.push(snapshotId);
    }
    this.render();
  },

  deleteSnapshot(snapshotId) {
    const snapshots = this._load().filter(s => s.id !== snapshotId);
    this._save(snapshots);
    if (this._expandedSnapshot === snapshotId) this._expandedSnapshot = null;
    Toast.show('Snapshot deleted', 'info');
    this.render();
  },

  // ── Helpers ──────────────────────────────────────────────────

  _countPolicies(snap) {
    return {
      compliance: (snap.policies.compliance || []).length,
      config: (snap.policies.config || []).length,
      ca: (snap.policies.ca || []).length,
      appProtection: (snap.policies.appProtection || []).length
    };
  },

  _formatTimestamp(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  },

  _formatValue(val) {
    if (val === null || val === undefined) return '(none)';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch (e) { return String(val); }
    }
    return String(val);
  },

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  // ── Inline Styles (injected once) ───────────────────────────

  _renderTimelineStyles() {
    return `
      <style id="changelogStyles">
        .changelog-timeline {
          position: relative;
          padding-left: 32px;
        }
        .changelog-timeline::before {
          content: '';
          position: absolute;
          left: 11px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--border);
          border-radius: 1px;
        }
        .changelog-timeline-item {
          position: relative;
          display: flex;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .changelog-timeline-node {
          position: absolute;
          left: -32px;
          top: 18px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--bg-primary);
          border: 2px solid var(--primary);
          z-index: 1;
          margin-left: 6px;
        }
        .changelog-timeline-item:first-child .changelog-timeline-node {
          background: var(--primary);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
        }
        .changelog-selected .changelog-timeline-card {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
        }
        .changelog-selected .changelog-timeline-node {
          background: var(--primary);
        }
        .changelog-diff-entry {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 12px;
          margin-bottom: 4px;
          border-radius: 6px;
          font-size: 0.8rem;
        }
        .changelog-diff-added {
          background: #f0fdf4;
        }
        .changelog-diff-removed {
          background: #fef2f2;
        }
        .changelog-diff-modified {
          background: #fffbeb;
        }
        .changelog-diff-prefix {
          font-family: monospace;
          font-weight: 700;
          font-size: 0.9rem;
          line-height: 1.4;
          min-width: 14px;
        }
        .changelog-diff-added .changelog-diff-prefix { color: #16a34a; }
        .changelog-diff-removed .changelog-diff-prefix { color: #dc2626; }
        .changelog-diff-modified .changelog-diff-prefix { color: #d97706; }
        .changelog-diff-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .changelog-diff-details {
          width: 100%;
          padding-left: 22px;
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .changelog-diff-prop {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .changelog-diff-prop-name {
          font-family: monospace;
          font-size: 0.7rem;
          color: var(--text-tertiary);
          min-width: 80px;
        }
        .changelog-diff-old {
          color: #dc2626;
          text-decoration: line-through;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .changelog-diff-new {
          color: #16a34a;
          font-weight: 500;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
    `;
  }
};

// Restore auto-snapshot on load
ChangeLog.restoreAutoSnapshot();
