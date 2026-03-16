/* ============================================================
   AuthAdapter — Compatibility layer
   Monkey-patches Graph._doCall so every existing module
   (Devices, Users, Compliance, etc.) transparently routes
   through the backend ApiClient instead of making direct
   Microsoft Graph fetch calls from the browser.

   Load ORDER:  state.js → auth.js → graph.js → apiClient.js → authAdapter.js

   Graceful degradation:
   - If ApiClient is not loaded or not authenticated the
     original Graph._doCall is left untouched and the app
     falls back to direct Graph API calls via MSAL tokens.
   ============================================================ */

const AuthAdapter = {
  /** Reference to the original, un-patched _doCall */
  _originalDoCall: null,

  /** Whether the patch is currently active */
  _patched: false,

  /**
   * Apply the monkey-patch.
   * Safe to call multiple times — will not double-patch.
   */
  apply() {
    if (this._patched) return;
    if (typeof Graph === 'undefined') {
      console.warn('[AuthAdapter] Graph object not found — skipping patch');
      return;
    }
    if (typeof ApiClient === 'undefined') {
      console.warn('[AuthAdapter] ApiClient not loaded — skipping patch');
      return;
    }

    // Keep a reference to the original implementation
    this._originalDoCall = Graph._doCall.bind(Graph);

    // Replace _doCall with a version that routes through ApiClient
    Graph._doCall = async function (tenantId, endpoint, options) {
      options = options || {};

      // If ApiClient has no session, fall back to original direct calls
      if (!ApiClient.isAuthenticated()) {
        if (AuthAdapter._originalDoCall) {
          return AuthAdapter._originalDoCall(tenantId, endpoint, options);
        }
        throw new Error('Not authenticated — no ApiClient session or MSAL token');
      }

      // Map Graph.call options to ApiClient.graph parameters
      var method = options.method || 'GET';
      var body = options.body || null;
      var proxyOpts = { beta: !!options.beta };

      try {
        var result = await ApiClient.graph(tenantId, endpoint, method, body, proxyOpts);

        // For non-GET calls that return 204, ApiClient returns null — match Graph behaviour
        return result;
      } catch (err) {
        // Translate ApiClient errors to the shape that Graph.call() callers expect

        if (err.statusCode === 401) {
          err.isAuthError = true;
        }
        if (err.statusCode === 429) {
          err.retryAfter = err.retryAfter || 5;
        }

        // If the backend proxy is unreachable (network error without statusCode),
        // fall back to direct Graph call so the app can still work.
        if (!err.statusCode && AuthAdapter._originalDoCall) {
          console.warn('[AuthAdapter] Backend proxy unreachable — falling back to direct Graph call');
          return AuthAdapter._originalDoCall(tenantId, endpoint, options);
        }

        throw err;
      }
    };

    // Also patch callPaged to use ApiClient.graphPaged when available
    this._originalCallPaged = Graph.callPaged.bind(Graph);

    Graph.callPaged = async function (tenantId, endpoint, options) {
      options = options || {};

      if (!ApiClient.isAuthenticated()) {
        if (AuthAdapter._originalCallPaged) {
          return AuthAdapter._originalCallPaged(tenantId, endpoint, options);
        }
        throw new Error('Not authenticated');
      }

      var proxyOpts = { beta: !!options.beta };

      try {
        return await ApiClient.graphPaged(tenantId, endpoint, proxyOpts);
      } catch (err) {
        // Network-level failure — fall back to direct calls
        if (!err.statusCode && AuthAdapter._originalCallPaged) {
          console.warn('[AuthAdapter] Backend proxy unreachable for paged call — falling back');
          return AuthAdapter._originalCallPaged(tenantId, endpoint, options);
        }
        throw err;
      }
    };

    this._patched = true;
    console.log('[AuthAdapter] Graph calls patched to route through backend proxy');
  },

  /**
   * Remove the patch and restore original Graph._doCall / callPaged.
   */
  remove() {
    if (!this._patched) return;
    if (typeof Graph === 'undefined') return;

    if (this._originalDoCall) {
      Graph._doCall = this._originalDoCall;
      this._originalDoCall = null;
    }
    if (this._originalCallPaged) {
      Graph.callPaged = this._originalCallPaged;
      this._originalCallPaged = null;
    }

    this._patched = false;
    console.log('[AuthAdapter] Graph calls restored to direct mode');
  },

  /**
   * Convenience: check whether the backend is reachable and apply
   * the patch only if it is.  Useful on app startup.
   */
  async init() {
    if (typeof ApiClient === 'undefined') return;

    // If there is no session token yet, still apply the patch —
    // it will fall back per-call until the user logs in.
    this.apply();

    // If we have a token, verify it is still valid with a lightweight call
    if (ApiClient.isAuthenticated()) {
      try {
        await ApiClient.getMe();
        console.log('[AuthAdapter] Backend session verified');
      } catch (err) {
        if (err.statusCode === 401) {
          console.warn('[AuthAdapter] Backend session expired — falling back to direct Graph');
          // Token was cleared by ApiClient._request's 401 handler already.
          // The patch stays in place; individual calls will fall back via
          // the !ApiClient.isAuthenticated() guard.
        }
        // Network errors are non-fatal — the patch's per-call fallback handles it
      }
    }
  }
};

// Auto-initialise when the script loads (non-blocking)
if (typeof ApiClient !== 'undefined') {
  AuthAdapter.init().catch(function (e) {
    console.warn('[AuthAdapter] init error:', e);
  });
}
