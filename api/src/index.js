const { app } = require('@azure/functions');

// --- Middleware ---

const { addSecurityHeaders } = require('./middleware/securityHeaders');
const { requestLogger } = require('./middleware/observability');

// Compose middleware: security headers + observability on every route
// NO rate limiting — speed and efficiency prioritised per business requirement
const secure = (handler) => addSecurityHeaders(requestLogger(handler));

// --- Auth routes (v1) ---

const { login, callback, me, logout } = require('./routes/auth');

app.http('auth-login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/auth/login',
    handler: secure(login)
});

app.http('auth-callback', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/auth/callback',
    handler: secure(callback)
});

app.http('auth-me', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/auth/me',
    handler: secure(me)
});

app.http('auth-logout', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/auth/logout',
    handler: secure(logout)
});

// --- Tenant routes (v1) ---

const { listTenants, connectTenant, disconnectTenant } = require('./routes/tenants');

app.http('tenants-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/tenants',
    handler: secure(listTenants)
});

app.http('tenants-connect', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/tenants/connect',
    handler: secure(connectTenant)
});

app.http('tenants-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'v1/tenants/{id}',
    handler: secure(disconnectTenant)
});

// --- Graph proxy routes (v1) ---

const { graphProxy } = require('./routes/graph');

app.http('graph-proxy-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/graph/{tenantId}/{*restOfPath}',
    handler: secure(graphProxy)
});

app.http('graph-proxy-post', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/graph/{tenantId}/{*restOfPath}',
    handler: secure(graphProxy)
});

// --- GDPR routes (v1) ---

const { getConsent, recordConsent, exportData, deleteData, getPolicy } = require('./routes/gdpr');

app.http('gdpr-get-consent', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/gdpr/consent',
    handler: secure(getConsent)
});

app.http('gdpr-record-consent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/gdpr/consent',
    handler: secure(recordConsent)
});

app.http('gdpr-export', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/gdpr/export',
    handler: secure(exportData)
});

app.http('gdpr-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'v1/gdpr/delete',
    handler: secure(deleteData)
});

app.http('gdpr-policy', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/gdpr/policy',
    handler: secure(getPolicy)
});

// --- Security event routes (v1) ---

const { getEvents, createAlert, listAlerts } = require('./routes/securityEvents');

app.http('security-events', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/security/events',
    handler: secure(getEvents)
});

app.http('security-create-alert', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'v1/security/alerts',
    handler: secure(createAlert)
});

app.http('security-list-alerts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'v1/security/alerts',
    handler: secure(listAlerts)
});

// --- Health route ---

const health = require('./routes/health');

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: secure(health)
});

// --- Legacy unversioned routes (backward compatibility) ---
// These mirror v1 routes for existing clients during migration

app.http('legacy-auth-login', { methods: ['POST'], authLevel: 'anonymous', route: 'auth/login', handler: secure(login) });
app.http('legacy-auth-callback', { methods: ['POST'], authLevel: 'anonymous', route: 'auth/callback', handler: secure(callback) });
app.http('legacy-auth-me', { methods: ['GET'], authLevel: 'anonymous', route: 'auth/me', handler: secure(me) });
app.http('legacy-auth-logout', { methods: ['POST'], authLevel: 'anonymous', route: 'auth/logout', handler: secure(logout) });
app.http('legacy-tenants-list', { methods: ['GET'], authLevel: 'anonymous', route: 'tenants', handler: secure(listTenants) });
app.http('legacy-tenants-connect', { methods: ['POST'], authLevel: 'anonymous', route: 'tenants/connect', handler: secure(connectTenant) });
app.http('legacy-tenants-delete', { methods: ['DELETE'], authLevel: 'anonymous', route: 'tenants/{id}', handler: secure(disconnectTenant) });
app.http('legacy-graph-get', { methods: ['GET'], authLevel: 'anonymous', route: 'graph/{tenantId}/{*restOfPath}', handler: secure(graphProxy) });
app.http('legacy-graph-post', { methods: ['POST'], authLevel: 'anonymous', route: 'graph/{tenantId}/{*restOfPath}', handler: secure(graphProxy) });
