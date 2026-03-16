const { app } = require('@azure/functions');

// --- Auth routes ---

const { login, callback, me, logout } = require('./routes/auth');

app.http('auth-login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/login',
    handler: login
});

app.http('auth-callback', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/callback',
    handler: callback
});

app.http('auth-me', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/me',
    handler: me
});

app.http('auth-logout', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth/logout',
    handler: logout
});

// --- Tenant routes ---

const { listTenants, connectTenant, disconnectTenant } = require('./routes/tenants');

app.http('tenants-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'tenants',
    handler: listTenants
});

app.http('tenants-connect', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'tenants/connect',
    handler: connectTenant
});

app.http('tenants-delete', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'tenants/{id}',
    handler: disconnectTenant
});

// --- Graph proxy routes ---

const { graphProxy } = require('./routes/graph');

app.http('graph-proxy-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'graph/{tenantId}/{*restOfPath}',
    handler: graphProxy
});

app.http('graph-proxy-post', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'graph/{tenantId}/{*restOfPath}',
    handler: graphProxy
});

// --- Health route ---

const health = require('./routes/health');

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: health
});
