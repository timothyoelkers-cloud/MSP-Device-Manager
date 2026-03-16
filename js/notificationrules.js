/* ============================================================
   Notification Rules Engine — Threshold-based alerting system
   ============================================================ */

const NotificationRules = {
  _tab: 'rules',
  _editingRule: null,
  _selectedSeverity: 'warning',
  _alertPage: 1,
  _alertPageSize: 20,

  /* ---- Persistence ---- */

  _loadRules() {
    try {
      return JSON.parse(localStorage.getItem('notification_rules')) || [];
    } catch (e) { return []; }
  },

  _saveRules(rules) {
    try { localStorage.setItem('notification_rules', JSON.stringify(rules)); } catch (e) {}
  },

  _loadAlerts() {
    try {
      return JSON.parse(localStorage.getItem('notification_alerts')) || [];
    } catch (e) { return []; }
  },

  _saveAlerts(alerts) {
    try { localStorage.setItem('notification_alerts', JSON.stringify(alerts)); } catch (e) {}
  },

  /* ---- Metric / Operator definitions ---- */

  metrics: {
    compliance_rate:     { label: 'Compliance Rate (%)',   unit: '%' },
    encryption_rate:     { label: 'Encryption Rate (%)',   unit: '%' },
    stale_devices_count: { label: 'Stale Devices Count',   unit: ''  },
    noncompliant_count:  { label: 'Non-Compliant Devices', unit: ''  },
    unlicensed_users:    { label: 'Unlicensed Users',      unit: ''  },
    disabled_accounts:   { label: 'Disabled Accounts',     unit: ''  },
    total_devices:       { label: 'Total Devices',         unit: ''  },
    ca_policy_count:     { label: 'CA Policy Count',       unit: ''  }
  },

  operators: {
    less_than:    { label: 'Less than',    symbol: '<'  },
    greater_than: { label: 'Greater than', symbol: '>'  },
    equals:       { label: 'Equals',       symbol: '='  },
    not_equals:   { label: 'Not equals',   symbol: '!=' }
  },

  severityColors: {
    info:     { bg: 'var(--primary-light, #dbeafe)', text: 'var(--primary, #2563eb)', border: 'var(--primary, #2563eb)' },
    warning:  { bg: '#fef3c7',                       text: '#92400e',                 border: 'var(--warning, #f59e0b)' },
    critical: { bg: '#fee2e2',                       text: '#991b1b',                 border: 'var(--danger, #ef4444)'  }
  },

  /* ---- Data extraction ---- */

  _getMetricValue(metric, tenantId) {
    const devices    = (AppState.get('devices')        || {})[tenantId] || [];
    const users      = (AppState.get('users')          || {})[tenantId] || [];
    const caPolicies = (AppState.get('caPolicies')     || {})[tenantId] || [];
    const total      = devices.length;

    switch (metric) {
      case 'compliance_rate': {
        if (total === 0) return 100;
        const compliant = devices.filter(d => d.complianceState === 'compliant').length;
        return Math.round((compliant / total) * 100);
      }
      case 'encryption_rate': {
        if (total === 0) return 100;
        const encrypted = devices.filter(d => d.isEncrypted === true).length;
        return Math.round((encrypted / total) * 100);
      }
      case 'stale_devices_count': {
        const cutoff = 30; // days
        const now = Date.now();
        return devices.filter(d => {
          if (!d.lastSyncDateTime) return true;
          return (now - new Date(d.lastSyncDateTime).getTime()) / 86400000 > cutoff;
        }).length;
      }
      case 'noncompliant_count':
        return devices.filter(d => d.complianceState === 'noncompliant').length;
      case 'unlicensed_users':
        return users.filter(u => !u.assignedLicenses || u.assignedLicenses.length === 0).length;
      case 'disabled_accounts':
        return users.filter(u => u.accountEnabled === false).length;
      case 'total_devices':
        return total;
      case 'ca_policy_count':
        return caPolicies.length;
      default:
        return 0;
    }
  },

  _checkCondition(value, operator, threshold) {
    const t = parseFloat(threshold);
    switch (operator) {
      case 'less_than':    return value < t;
      case 'greater_than': return value > t;
      case 'equals':       return value === t;
      case 'not_equals':   return value !== t;
      default: return false;
    }
  },

  /* ---- Evaluation ---- */

  evaluate(tenantId) {
    const rules = this._loadRules().filter(r => r.enabled);
    if (rules.length === 0) return;

    const alerts = this._loadAlerts();
    const tenantName = AppState.getTenantName(tenantId);
    let newAlertCount = 0;

    rules.forEach(rule => {
      const value = this._getMetricValue(rule.condition.metric, tenantId);
      const triggered = this._checkCondition(value, rule.condition.operator, rule.condition.threshold);

      if (triggered) {
        // Avoid duplicate alerts for the same rule + tenant within 1 hour
        const oneHourAgo = Date.now() - 3600000;
        const duplicate = alerts.find(a =>
          a.ruleId === rule.id &&
          a.tenantId === tenantId &&
          new Date(a.triggeredAt).getTime() > oneHourAgo
        );
        if (duplicate) return;

        alerts.unshift({
          id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          ruleId: rule.id,
          ruleName: rule.name,
          tenantId: tenantId,
          tenantName: tenantName,
          metric: rule.condition.metric,
          value: value,
          threshold: rule.condition.threshold,
          severity: rule.severity,
          triggeredAt: new Date().toISOString(),
          acknowledged: false
        });
        newAlertCount++;
      }
    });

    if (newAlertCount > 0) {
      // Cap alert history at 500 entries
      this._saveAlerts(alerts.slice(0, 500));

      if (typeof AuditLog !== 'undefined' && AuditLog.log) {
        AuditLog.log('notification_alerts', newAlertCount + ' new alert(s) triggered for ' + tenantName);
      }
    }
  },

  evaluateAll() {
    const tenants = AppState.get('tenants') || [];
    tenants.forEach(t => this.evaluate(t.id));
  },

  /* ---- Badge helpers ---- */

  getUnacknowledgedCount() {
    return this._loadAlerts().filter(a => !a.acknowledged).length;
  },

  renderBadge() {
    const count = this.getUnacknowledgedCount();
    if (count === 0) return '';
    return '<span style="'
      + 'display:inline-flex;align-items:center;justify-content:center;'
      + 'min-width:18px;height:18px;padding:0 5px;'
      + 'font-size:11px;font-weight:600;line-height:1;'
      + 'color:#fff;background:var(--danger, #ef4444);'
      + 'border-radius:9px;margin-left:6px;'
      + '">' + (count > 99 ? '99+' : count) + '</span>';
  },

  /* ---- CRUD ---- */

  _createRule(data) {
    const rules = this._loadRules();
    const rule = {
      id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: data.name,
      enabled: true,
      condition: {
        metric: data.metric,
        operator: data.operator,
        threshold: parseFloat(data.threshold)
      },
      severity: data.severity,
      createdAt: new Date().toISOString()
    };
    rules.push(rule);
    this._saveRules(rules);
    Toast.show('Rule created successfully', 'success');
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('rule_created', 'Created notification rule: ' + rule.name);
    }
    return rule;
  },

  _updateRule(id, data) {
    const rules = this._loadRules();
    const idx = rules.findIndex(r => r.id === id);
    if (idx === -1) return;
    rules[idx] = {
      ...rules[idx],
      name: data.name,
      condition: {
        metric: data.metric,
        operator: data.operator,
        threshold: parseFloat(data.threshold)
      },
      severity: data.severity
    };
    this._saveRules(rules);
    Toast.show('Rule updated successfully', 'success');
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('rule_updated', 'Updated notification rule: ' + data.name);
    }
  },

  _deleteRule(id) {
    const rules = this._loadRules();
    const rule = rules.find(r => r.id === id);
    this._saveRules(rules.filter(r => r.id !== id));
    Toast.show('Rule deleted', 'info');
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('rule_deleted', 'Deleted notification rule: ' + (rule ? rule.name : id));
    }
  },

  _toggleRule(id) {
    const rules = this._loadRules();
    const rule = rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this._saveRules(rules);
    }
    this.render();
  },

  _acknowledgeAlert(id) {
    const alerts = this._loadAlerts();
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = !alert.acknowledged;
      this._saveAlerts(alerts);
    }
    this.render();
  },

  _acknowledgeAll() {
    const alerts = this._loadAlerts();
    alerts.forEach(a => { a.acknowledged = true; });
    this._saveAlerts(alerts);
    Toast.show('All alerts acknowledged', 'success');
    this.render();
  },

  _clearAlertHistory() {
    if (!confirm('Clear all alert history? This cannot be undone.')) return;
    this._saveAlerts([]);
    Toast.show('Alert history cleared', 'info');
    this.render();
  },

  /* ---- Render ---- */

  render() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    const rules = this._loadRules();
    const alerts = this._loadAlerts();
    const unackCount = alerts.filter(a => !a.acknowledged).length;

    main.innerHTML = ''
      + '<div class="page-header">'
      + '  <div class="page-header-left">'
      + '    <h1 class="page-title">Notification Rules</h1>'
      + '    <p class="page-subtitle">Configure threshold-based alerts for tenant metrics</p>'
      + '  </div>'
      + '  <div class="page-header-actions">'
      + '    <button class="btn btn-primary" onclick="NotificationRules._showRuleModal()">'
      + '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + '      Create Rule'
      + '    </button>'
      + '  </div>'
      + '</div>'

      // Tabs
      + '<div class="card" style="margin-bottom:0;border-bottom-left-radius:0;border-bottom-right-radius:0;">'
      + '  <div style="display:flex;gap:0;border-bottom:1px solid var(--border, #e5e7eb);">'
      + '    <button class="btn btn-ghost" style="border-radius:0;border-bottom:2px solid ' + (this._tab === 'rules' ? 'var(--primary, #2563eb)' : 'transparent') + ';color:' + (this._tab === 'rules' ? 'var(--primary, #2563eb)' : 'inherit') + ';font-weight:' + (this._tab === 'rules' ? '600' : '400') + ';"'
      + '      onclick="NotificationRules._tab=\'rules\'; NotificationRules.render();">'
      + '      Rules (' + rules.length + ')'
      + '    </button>'
      + '    <button class="btn btn-ghost" style="border-radius:0;border-bottom:2px solid ' + (this._tab === 'alerts' ? 'var(--primary, #2563eb)' : 'transparent') + ';color:' + (this._tab === 'alerts' ? 'var(--primary, #2563eb)' : 'inherit') + ';font-weight:' + (this._tab === 'alerts' ? '600' : '400') + ';"'
      + '      onclick="NotificationRules._tab=\'alerts\'; NotificationRules._alertPage=1; NotificationRules.render();">'
      + '      Alert History (' + alerts.length + ')'
      + (unackCount > 0 ? ' <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;font-size:11px;font-weight:600;color:#fff;background:var(--danger, #ef4444);border-radius:9px;margin-left:4px;">' + unackCount + '</span>' : '')
      + '    </button>'
      + '  </div>'
      + '</div>'

      // Tab body
      + '<div class="card" style="border-top-left-radius:0;border-top-right-radius:0;border-top:none;">'
      + '  <div class="card-body">'
      + (this._tab === 'rules' ? this._renderRulesTab(rules) : this._renderAlertsTab(alerts))
      + '  </div>'
      + '</div>'

      // Rule Modal
      + this._renderRuleModal();

    // If editing, populate modal fields after DOM is ready
    if (this._editingRule) {
      this._populateModal(this._editingRule);
    }
  },

  /* ---- Tab renderers ---- */

  _renderRulesTab(rules) {
    if (rules.length === 0) {
      return ''
        + '<div style="text-align:center;padding:48px 16px;color:var(--gray-500, #6b7280);">'
        + '  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 12px;opacity:0.4;display:block;">'
        + '    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>'
        + '  </svg>'
        + '  <p style="font-weight:600;margin-bottom:4px;">No notification rules yet</p>'
        + '  <p style="font-size:13px;">Create a rule to get alerted when tenant metrics cross a threshold.</p>'
        + '</div>';
    }

    var html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var metricLabel = this.metrics[rule.condition.metric] ? this.metrics[rule.condition.metric].label : rule.condition.metric;
      var opSymbol = this.operators[rule.condition.operator] ? this.operators[rule.condition.operator].symbol : rule.condition.operator;
      var sevColors = this.severityColors[rule.severity] || this.severityColors.info;

      html += ''
        + '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--border, #e5e7eb);border-radius:8px;background:' + (rule.enabled ? 'var(--gray-50, #f9fafb)' : '#fafafa') + ';opacity:' + (rule.enabled ? '1' : '0.6') + ';">'
        // Toggle switch
        + '  <label style="position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;cursor:pointer;">'
        + '    <input type="checkbox" ' + (rule.enabled ? 'checked' : '') + ' onchange="NotificationRules._toggleRule(\'' + rule.id + '\')"'
        + '      style="opacity:0;width:0;height:0;position:absolute;">'
        + '    <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (rule.enabled ? 'var(--primary, #2563eb)' : 'var(--gray-200, #e5e7eb)') + ';border-radius:10px;transition:background 0.2s;"></span>'
        + '    <span style="position:absolute;top:2px;left:' + (rule.enabled ? '18px' : '2px') + ';width:16px;height:16px;background:#fff;border-radius:50%;transition:left 0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span>'
        + '  </label>'
        // Info
        + '  <div style="flex:1;min-width:0;">'
        + '    <div style="font-weight:600;font-size:14px;margin-bottom:2px;">' + this._escHtml(rule.name) + '</div>'
        + '    <div style="font-size:12px;color:var(--gray-500, #6b7280);">'
        +        metricLabel + ' ' + opSymbol + ' ' + rule.condition.threshold
        + '    </div>'
        + '  </div>'
        // Severity badge
        + '  <span class="badge" style="background:' + sevColors.bg + ';color:' + sevColors.text + ';border:1px solid ' + sevColors.border + ';text-transform:capitalize;font-size:11px;">'
        +      rule.severity
        + '  </span>'
        // Actions
        + '  <button class="btn btn-ghost btn-sm" onclick="NotificationRules._editRule(\'' + rule.id + '\')" title="Edit">'
        + '    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        + '  </button>'
        + '  <button class="btn btn-ghost btn-sm" onclick="NotificationRules._deleteRule(\'' + rule.id + '\'); NotificationRules.render();" title="Delete" style="color:var(--danger, #ef4444);">'
        + '    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'
        + '  </button>'
        + '</div>';
    }
    html += '</div>';
    return html;
  },

  _renderAlertsTab(alerts) {
    if (alerts.length === 0) {
      return ''
        + '<div style="text-align:center;padding:48px 16px;color:var(--gray-500, #6b7280);">'
        + '  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 12px;opacity:0.4;display:block;">'
        + '    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        + '  </svg>'
        + '  <p style="font-weight:600;margin-bottom:4px;">No alerts triggered</p>'
        + '  <p style="font-size:13px;">Alerts will appear here when rule thresholds are breached.</p>'
        + '</div>';
    }

    var totalPages = Math.ceil(alerts.length / this._alertPageSize);
    var start = (this._alertPage - 1) * this._alertPageSize;
    var paged = alerts.slice(start, start + this._alertPageSize);
    var unackCount = alerts.filter(function(a) { return !a.acknowledged; }).length;

    var html = ''
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
      + '  <span style="font-size:13px;color:var(--gray-500, #6b7280);">' + unackCount + ' unacknowledged</span>'
      + '  <div style="display:flex;gap:6px;">'
      + '    <button class="btn btn-ghost btn-sm" onclick="NotificationRules._acknowledgeAll()">Acknowledge All</button>'
      + '    <button class="btn btn-ghost btn-sm" style="color:var(--danger, #ef4444);" onclick="NotificationRules._clearAlertHistory()">Clear History</button>'
      + '  </div>'
      + '</div>'

      + '<div class="table-wrapper">'
      + '  <table class="table" style="width:100%;">'
      + '    <thead>'
      + '      <tr>'
      + '        <th style="width:160px;">Time</th>'
      + '        <th>Rule</th>'
      + '        <th>Tenant</th>'
      + '        <th>Metric</th>'
      + '        <th style="text-align:right;">Value</th>'
      + '        <th style="text-align:right;">Threshold</th>'
      + '        <th>Severity</th>'
      + '        <th style="width:80px;text-align:center;">Ack</th>'
      + '      </tr>'
      + '    </thead>'
      + '    <tbody>';

    for (var i = 0; i < paged.length; i++) {
      var a = paged[i];
      var sevColors = this.severityColors[a.severity] || this.severityColors.info;
      var metricLabel = this.metrics[a.metric] ? this.metrics[a.metric].label : a.metric;
      var ts = new Date(a.triggeredAt);
      var timeStr = ts.toLocaleDateString() + ' ' + ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      html += ''
        + '<tr style="' + (a.acknowledged ? 'opacity:0.55;' : '') + '">'
        + '  <td style="font-size:12px;white-space:nowrap;">' + timeStr + '</td>'
        + '  <td style="font-weight:500;">' + this._escHtml(a.ruleName) + '</td>'
        + '  <td style="font-size:13px;">' + this._escHtml(a.tenantName) + '</td>'
        + '  <td style="font-size:13px;">' + metricLabel + '</td>'
        + '  <td style="text-align:right;font-weight:600;">' + a.value + '</td>'
        + '  <td style="text-align:right;">' + a.threshold + '</td>'
        + '  <td>'
        + '    <span class="badge" style="background:' + sevColors.bg + ';color:' + sevColors.text + ';border:1px solid ' + sevColors.border + ';text-transform:capitalize;font-size:11px;">' + a.severity + '</span>'
        + '  </td>'
        + '  <td style="text-align:center;">'
        + '    <input type="checkbox" ' + (a.acknowledged ? 'checked' : '') + ' onchange="NotificationRules._acknowledgeAlert(\'' + a.id + '\')"'
        + '      title="' + (a.acknowledged ? 'Unacknowledge' : 'Acknowledge') + '" style="cursor:pointer;width:16px;height:16px;">'
        + '  </td>'
        + '</tr>';
    }

    html += ''
      + '    </tbody>'
      + '  </table>'
      + '</div>';

    // Pagination
    if (totalPages > 1) {
      html += ''
        + '<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:12px;">'
        + '  <button class="btn btn-ghost btn-sm" ' + (this._alertPage <= 1 ? 'disabled' : '') + ' onclick="NotificationRules._alertPage--; NotificationRules.render();">&#8249; Prev</button>'
        + '  <span style="font-size:13px;color:var(--gray-500, #6b7280);">Page ' + this._alertPage + ' of ' + totalPages + '</span>'
        + '  <button class="btn btn-ghost btn-sm" ' + (this._alertPage >= totalPages ? 'disabled' : '') + ' onclick="NotificationRules._alertPage++; NotificationRules.render();">Next &#8250;</button>'
        + '</div>';
    }

    return html;
  },

  /* ---- Modal ---- */

  _renderRuleModal() {
    var metricOptions = '';
    var keys = Object.keys(this.metrics);
    for (var i = 0; i < keys.length; i++) {
      metricOptions += '<option value="' + keys[i] + '">' + this.metrics[keys[i]].label + '</option>';
    }

    var opOptions = '';
    var opKeys = Object.keys(this.operators);
    for (var j = 0; j < opKeys.length; j++) {
      opOptions += '<option value="' + opKeys[j] + '">' + this.operators[opKeys[j]].label + ' (' + this.operators[opKeys[j]].symbol + ')</option>';
    }

    var sevButtons = '';
    var sevs = ['info', 'warning', 'critical'];
    for (var k = 0; k < sevs.length; k++) {
      var s = sevs[k];
      var c = this.severityColors[s];
      sevButtons += '<button type="button" class="btn btn-sm rule-severity-btn" data-severity="' + s + '"'
        + ' style="background:' + c.bg + ';color:' + c.text + ';border:2px solid transparent;font-weight:500;text-transform:capitalize;"'
        + ' onclick="NotificationRules._selectSeverity(\'' + s + '\')">'
        + s
        + '</button>';
    }

    return ''
      + '<div id="ruleModal" class="modal-overlay hidden" onclick="if(event.target===this)NotificationRules._closeRuleModal()">'
      + '  <div class="modal" style="max-width:520px;width:90%;">'
      + '    <div class="modal-header">'
      + '      <h3 id="ruleModalTitle">Create Rule</h3>'
      + '      <button class="btn btn-ghost btn-sm" onclick="NotificationRules._closeRuleModal()">&times;</button>'
      + '    </div>'
      + '    <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;">'
      + '      <div>'
      + '        <label class="form-label">Rule Name</label>'
      + '        <input type="text" id="ruleNameInput" class="form-input" placeholder="e.g. Low compliance alert">'
      + '      </div>'
      + '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
      + '        <div>'
      + '          <label class="form-label">Metric</label>'
      + '          <select id="ruleMetricSelect" class="form-select">' + metricOptions + '</select>'
      + '        </div>'
      + '        <div>'
      + '          <label class="form-label">Operator</label>'
      + '          <select id="ruleOperatorSelect" class="form-select">' + opOptions + '</select>'
      + '        </div>'
      + '      </div>'
      + '      <div>'
      + '        <label class="form-label">Threshold</label>'
      + '        <input type="number" id="ruleThresholdInput" class="form-input" placeholder="e.g. 80" step="any">'
      + '      </div>'
      + '      <div>'
      + '        <label class="form-label">Severity</label>'
      + '        <div id="ruleSeveritySelect" style="display:flex;gap:8px;">'
      +            sevButtons
      + '        </div>'
      + '      </div>'
      + '    </div>'
      + '    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid var(--border, #e5e7eb);">'
      + '      <button class="btn btn-ghost" onclick="NotificationRules._closeRuleModal()">Cancel</button>'
      + '      <button class="btn btn-primary" onclick="NotificationRules._saveRule()">Save Rule</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';
  },

  _showRuleModal(ruleId) {
    this._editingRule = ruleId || null;
    var modal = document.getElementById('ruleModal');
    if (!modal) {
      // Modal not in DOM yet — render first, then open
      this.render();
      modal = document.getElementById('ruleModal');
    }

    var titleEl = document.getElementById('ruleModalTitle');
    if (titleEl) titleEl.textContent = ruleId ? 'Edit Rule' : 'Create Rule';

    // Reset form
    var nameInput = document.getElementById('ruleNameInput');
    var metricSelect = document.getElementById('ruleMetricSelect');
    var operatorSelect = document.getElementById('ruleOperatorSelect');
    var thresholdInput = document.getElementById('ruleThresholdInput');
    if (nameInput) nameInput.value = '';
    if (metricSelect) metricSelect.value = 'compliance_rate';
    if (operatorSelect) operatorSelect.value = 'less_than';
    if (thresholdInput) thresholdInput.value = '';

    // Default severity
    this._selectSeverity('warning');

    if (ruleId) {
      this._populateModal(ruleId);
    }

    if (modal) modal.classList.remove('hidden');
    if (nameInput) nameInput.focus();
  },

  _populateModal(ruleId) {
    var rules = this._loadRules();
    var rule = rules.find(function(r) { return r.id === ruleId; });
    if (!rule) return;

    var nameInput = document.getElementById('ruleNameInput');
    var metricSelect = document.getElementById('ruleMetricSelect');
    var operatorSelect = document.getElementById('ruleOperatorSelect');
    var thresholdInput = document.getElementById('ruleThresholdInput');

    if (nameInput) nameInput.value = rule.name;
    if (metricSelect) metricSelect.value = rule.condition.metric;
    if (operatorSelect) operatorSelect.value = rule.condition.operator;
    if (thresholdInput) thresholdInput.value = rule.condition.threshold;

    this._selectSeverity(rule.severity);
  },

  _closeRuleModal() {
    this._editingRule = null;
    var modal = document.getElementById('ruleModal');
    if (modal) modal.classList.add('hidden');
  },

  _selectSeverity(severity) {
    this._selectedSeverity = severity;
    var btns = document.querySelectorAll('.rule-severity-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var s = btn.getAttribute('data-severity');
      var c = this.severityColors[s];
      if (s === severity) {
        btn.style.borderColor = c.border;
        btn.style.boxShadow = '0 0 0 1px ' + c.border;
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
      }
    }
  },

  _editRule(ruleId) {
    this._showRuleModal(ruleId);
  },

  _saveRule() {
    var name = (document.getElementById('ruleNameInput') ? document.getElementById('ruleNameInput').value : '').trim();
    var metric = document.getElementById('ruleMetricSelect') ? document.getElementById('ruleMetricSelect').value : '';
    var operator = document.getElementById('ruleOperatorSelect') ? document.getElementById('ruleOperatorSelect').value : '';
    var threshold = document.getElementById('ruleThresholdInput') ? document.getElementById('ruleThresholdInput').value : '';
    var severity = this._selectedSeverity || 'warning';

    if (!name) { Toast.show('Please enter a rule name', 'warning'); return; }
    if (!threshold && threshold !== '0') { Toast.show('Please enter a threshold value', 'warning'); return; }
    if (isNaN(parseFloat(threshold))) { Toast.show('Threshold must be a number', 'warning'); return; }

    var data = { name: name, metric: metric, operator: operator, threshold: threshold, severity: severity };

    if (this._editingRule) {
      this._updateRule(this._editingRule, data);
    } else {
      this._createRule(data);
    }

    this._closeRuleModal();
    this.render();
  },

  /* ---- Utilities ---- */

  _escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
};
