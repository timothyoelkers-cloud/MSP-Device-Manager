/* ============================================================
   ApiClient — Backend proxy API client
   Routes all API calls through the Azure Functions backend
   instead of direct Microsoft Graph calls from the browser.
   ============================================================ */

const ApiClient = {
  // Base URL detection: localhost dev server vs production (same-origin)
  baseUrl: (function () {
    const loc = window.location;
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
      return 'http://localhost:7071';
    }
    // Production: Azure Static Web Apps serves /api/ from same origin
    return loc.origin;
  })(),

  // Session token — loaded from sessionStorage on init
  sessionToken: sessionStorage.getItem('msp_api_session') || null,

  // ── Helpers ──────────────────────────────────────────────

  /** Persist (or clear) the session token */
  _setToken(token) {
    this.sessionToken = token;
    if (token) {
      sessionStorage.setItem('msp_api_session', token);
    } else {
      sessionStorage.removeItem('msp_api_session');
    }
  },

  /** Build headers for every request */
  _headers(extra) {
    const h = { 'Content-Type': 'application/json' };
    if (this.sessionToken) {
      h['Authorization'] = 'Bearer ' + this.sessionToken;
    }
    return Object.assign(h, extra || {});
  },

  /**
   * Central fetch wrapper.
   * Handles JSON parsing, error classification, and global error toasts.
   */
  async _request(method, path, body, params) {
    let url = this.baseUrl + path;

    // Append query-string parameters for GET requests
    if (params && typeof params === 'object') {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(function (kv) {
        if (kv[1] !== undefined && kv[1] !== null) {
          qs.append(kv[0], kv[1]);
        }
      });
      const qsStr = qs.toString();
      if (qsStr) url += (url.includes('?') ? '&' : '?') + qsStr;
    }

    const fetchOpts = {
      method: method,
      headers: this._headers(),
    };
    if (body !== undefined && body !== null) {
      fetchOpts.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, fetchOpts);
    } catch (networkErr) {
      // Network-level failure (DNS, offline, CORS, etc.)
      if (typeof Toast !== 'undefined') {
        Toast.show('Unable to reach the server. Check your connection.', 'error', 'Connection Lost');
      }
      throw networkErr;
    }

    // ── Global error handling ──

    if (response.status === 401) {
      this._setToken(null);
      if (typeof Toast !== 'undefined') {
        Toast.show('Session expired. Redirecting to login...', 'warning', 'Signed Out');
      }
      // Give the toast a moment to render, then redirect
      setTimeout(function () {
        window.location.hash = '#/login';
      }, 1200);
      const err = new Error('Unauthorized — session expired');
      err.statusCode = 401;
      throw err;
    }

    if (response.status === 403) {
      if (typeof Toast !== 'undefined') {
        Toast.show('You do not have permission to perform this action.', 'error', 'Access Denied');
      }
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '30';
      if (typeof Toast !== 'undefined') {
        Toast.show('Too many requests. Please wait ' + retryAfter + ' seconds.', 'warning', 'Rate Limited');
      }
      const err = new Error('Rate limited — retry after ' + retryAfter + 's');
      err.statusCode = 429;
      err.retryAfter = parseInt(retryAfter, 10);
      throw err;
    }

    // Any other non-OK status
    if (!response.ok) {
      let errBody = {};
      try { errBody = await response.json(); } catch (_) { /* ignore */ }
      const msg = errBody.error || errBody.message || ('API error ' + response.status);
      const err = new Error(msg);
      err.statusCode = response.status;
      err.body = errBody;
      throw err;
    }

    // 204 No Content — nothing to parse
    if (response.status === 204) return null;

    return response.json();
  },

  // ── Core HTTP methods ────────────────────────────────────

  /** GET with optional query params object */
  get(path, params) {
    return this._request('GET', path, null, params);
  },

  /** POST with JSON body */
  post(path, body) {
    return this._request('POST', path, body);
  },

  /** PUT with JSON body */
  put(path, body) {
    return this._request('PUT', path, body);
  },

  /** DELETE */
  del(path) {
    return this._request('DELETE', path);
  },

  // ── Auth flow ────────────────────────────────────────────

  /**
   * Initiate login — asks backend for the Azure AD auth URL,
   * then redirects the browser.
   */
  async login() {
    const data = await this.get('/api/auth/login');
    if (data && data.authUrl) {
      window.location.href = data.authUrl;
    } else {
      throw new Error('No authUrl returned from /api/auth/login');
    }
  },

  /**
   * Exchange the authorization code from Azure AD callback
   * for a backend session token + user profile.
   */
  async handleCallback(code) {
    const data = await this.post('/api/auth/callback', { code: code });
    if (data && data.token) {
      this._setToken(data.token);
    }
    return data; // { token, user: { name, email, tenantId, ... } }
  },

  /** Get the currently authenticated user's profile */
  async getMe() {
    return this.get('/api/auth/me');
  },

  /** Log out — clear backend session and local token */
  async logout() {
    try {
      await this.post('/api/auth/logout');
    } catch (_) {
      // Best-effort — clear local state regardless
    }
    this._setToken(null);
    if (typeof AppState !== 'undefined') {
      AppState.set('isAuthenticated', false);
      AppState.set('account', null);
    }
    window.location.hash = '#/login';
  },

  /**
   * Returns true when we have a session token that has not
   * visibly expired.  (Full validation happens server-side.)
   */
  isAuthenticated() {
    if (!this.sessionToken) return false;
    // Attempt lightweight JWT exp check (token may not be a JWT — that's OK)
    try {
      var parts = this.sessionToken.split('.');
      if (parts.length === 3) {
        var payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          this._setToken(null);
          return false;
        }
      }
    } catch (_) {
      // Not a JWT or can't parse — assume valid, let server decide
    }
    return true;
  },

  // ── Tenant methods ───────────────────────────────────────

  /** List tenants the current user has access to */
  getTenants() {
    return this.get('/api/tenants');
  },

  /** Connect (onboard) a new customer tenant */
  connectTenant(tenantData) {
    return this.post('/api/tenants/connect', tenantData);
  },

  /** Disconnect (remove) a customer tenant */
  disconnectTenant(tenantId) {
    return this.del('/api/tenants/' + encodeURIComponent(tenantId));
  },

  // ── Graph proxy ──────────────────────────────────────────

  /**
   * Proxy a Microsoft Graph call through the backend.
   *
   * @param {string} tenantId  — target tenant
   * @param {string} endpoint  — Graph endpoint path, e.g. "/deviceManagement/managedDevices"
   * @param {string} [method]  — HTTP method (default GET)
   * @param {object} [body]    — request body for POST/PATCH/PUT
   * @param {object} [options] — extra flags: { beta: bool, paged: bool }
   * @returns {Promise<*>}     — parsed JSON from Graph (via backend)
   */
  async graph(tenantId, endpoint, method, body, options) {
    method = (method || 'GET').toUpperCase();
    options = options || {};

    // Build the proxy path:  /api/graph/{tenantId}/{graphEndpoint}
    // Strip leading slash from endpoint to avoid double-slash
    var cleanEndpoint = endpoint.replace(/^\/+/, '');
    var proxyPath = '/api/graph/' + encodeURIComponent(tenantId) + '/' + cleanEndpoint;

    // Pass beta flag as a query param so the backend knows which Graph version
    var params = {};
    if (options.beta) params.beta = '1';
    if (options.paged) params.paged = '1';

    if (method === 'GET') {
      return this._request('GET', proxyPath, null, params);
    }
    return this._request(method, proxyPath, body, params);
  },

  /**
   * Paginated Graph proxy — fetches all pages and returns
   * a flat array of items.  The backend signals pagination
   * via a `nextLink` field in the response.
   */
  async graphPaged(tenantId, endpoint, options) {
    options = options || {};
    var allItems = [];
    var currentEndpoint = endpoint;

    while (currentEndpoint) {
      var data = await this.graph(tenantId, currentEndpoint, 'GET', null, Object.assign({}, options, { paged: true }));
      if (data && data.value) {
        allItems = allItems.concat(data.value);
      }
      // The backend should relay @odata.nextLink as nextLink (or the raw field)
      var nextLink = data && (data.nextLink || data['@odata.nextLink']);
      if (nextLink) {
        // nextLink from Graph is a full URL — strip the Graph base to get the endpoint
        currentEndpoint = nextLink
          .replace('https://graph.microsoft.com/v1.0', '')
          .replace('https://graph.microsoft.com/beta', '');
      } else {
        currentEndpoint = null;
      }
    }

    return allItems;
  },

  // ── Auth callback handler (page-load) ────────────────────

  /**
   * Call on every page load.  If the URL contains an auth code
   * query parameter (from Azure AD redirect), exchange it for
   * a session, then clean up the URL.
   *
   * @returns {Promise<object|null>} user profile or null
   */
  async checkForCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if (!code) return null;

    try {
      var result = await this.handleCallback(code);

      // Clean the code out of the URL so it's not reused
      var cleanUrl = window.location.origin + window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, document.title, cleanUrl);

      // Hydrate global state if AppState is available
      if (typeof AppState !== 'undefined' && result && result.user) {
        AppState.set('isAuthenticated', true);
        AppState.set('account', result.user);
      }

      return result;
    } catch (err) {
      console.error('[ApiClient] Auth callback failed:', err);
      if (typeof Toast !== 'undefined') {
        Toast.show('Login failed: ' + (err.message || 'Unknown error'), 'error', 'Auth Error');
      }
      // Clean URL anyway
      var cleanUrl2 = window.location.origin + window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, document.title, cleanUrl2);
      return null;
    }
  }
};
