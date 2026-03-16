const { app } = require('@azure/functions');

// --- Middleware ---

const { addSecurityHeaders } = require('./middleware/securityHeaders');
const { rateLimit, authLimiter, graphLimiter } = require('./middleware/rateLimit');

// Helper: compose middleware wrappers (right-to-left)
const wrap = (...fns) => (handler) => fns.reduceRight((h, fn) => fn(h), handler);

// Standard pipeline: security headers on every response
const secure = (handler) => addSecurityHeaders(handler);

// Auth pipeline: security headers + auth rate limiting
const secureAuth = (handler) => wrap(addSecurityHeaders, rateLimit(authLimiter))(handler);

// Graph pipeline: security headers + graph rate limiting
const secureGraph = (handler) => wrap(addSecurityHeaders, rateLimit(graphLimiter))(handler);

// --- Auth routes ---

const { login, callback, me, logout } = require('./routes/auth');

app.http('auth-login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: secureAuth(login)
});

app.http('auth-callback', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/callback',
    handler: secureAuth(callback)
});

app.http('auth-me', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/me',
    handler: secure(me)
});

app.http('auth-logout', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/logout',
    handler: secure(logout)
});

// --- Tenant routes ---

const { listTenants, connectTenant, disconnectTenant } = require('./routes/tenants');

app.http('tenants-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'tenants',
    handler: secure(listTenants)
});

app.http('tenants-connect', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'tenants/connect',
    handler: secure(connectTenant)
});

app.http('tenants-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'tenants/{id}',
    handler: secure(disconnectTenant)
});

// --- Graph proxy routes ---

const { graphProxy } = require('./routes/graph');

app.http('graph-proxy-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'graph/{tenantId}/{*restOfPath}',
    handler: secureGraph(graphProxy)
});

app.http('graph-proxy-post', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'graph/{tenantId}/{*restOfPath}',
    handler: secureGraph(graphProxy)
});

// --- GDPR routes ---

const { getConsent, recordConsent, exportData, deleteData, getPolicy } = require('./routes/gdpr');

app.http('gdpr-get-consent', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'gdpr/consent',
    handler: secure(getConsent)
});

app.http('gdpr-record-consent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'gdpr/consent',
    handler: secure(recordConsent)
});

app.http('gdpr-export', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'gdpr/export',
    handler: secure(exportData)
});

app.http('gdpr-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'gdpr/delete',
    handler: secure(deleteData)
});

app.http('gdpr-policy', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'gdpr/policy',
    handler: secure(getPolicy)
});

// --- Security event routes ---

const { getEvents, createAlert, listAlerts } = require('./routes/securityEvents');

app.http('security-events', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'security/events',
    handler: secure(getEvents)
});

app.http('security-create-alert', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'security/alerts',
    handler: secure(createAlert)
});

app.http('security-list-alerts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'security/alerts',
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
