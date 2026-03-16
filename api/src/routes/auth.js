const { requireAuth } = require('../middleware/auth');
const cosmos = require('../services/cosmosService');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// MSAL Configuration
// ---------------------------------------------------------------------------

function getMsalClient() {
    return new ConfidentialClientApplication({
        auth: {
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            authority: 'https://login.microsoftonline.com/common',
        },
    });
}

const REDIRECT_URI = process.env.AUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const SCOPES = ['openid', 'profile', 'email', 'offline_access'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logAudit(customerId, action, details = {}) {
    try {
        const container = await cosmos.getContainer('auditLog');
        await container.items.create({
            id: crypto.randomUUID(),
            customerId,
            action,
            details,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        // Audit logging should not break the request
        console.error('Audit log error:', err.message);
    }
}

// ---------------------------------------------------------------------------
// GET /api/auth/login
// ---------------------------------------------------------------------------

async function login(request, context) {
    try {
        const msalClient = getMsalClient();

        const authUrl = await msalClient.getAuthCodeUrl({
            scopes: SCOPES,
            redirectUri: REDIRECT_URI,
            prompt: 'select_account',
        });

        return {
            status: 200,
            jsonBody: { authUrl },
        };
    } catch (err) {
        context.log(`Login error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Failed to generate auth URL', message: err.message },
        };
    }
}

// ---------------------------------------------------------------------------
// POST /api/auth/callback
// ---------------------------------------------------------------------------

async function callback(request, context) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return {
                status: 400,
                jsonBody: { error: 'Bad Request', message: 'Authorization code is required' },
            };
        }

        // Exchange authorization code for tokens
        const msalClient = getMsalClient();
        const tokenResponse = await msalClient.acquireTokenByCode({
            code,
            scopes: SCOPES,
            redirectUri: REDIRECT_URI,
        });

        if (!tokenResponse || !tokenResponse.account) {
            return {
                status: 401,
                jsonBody: { error: 'Unauthorized', message: 'Failed to acquire token' },
            };
        }

        const account = tokenResponse.account;
        const email = account.username || '';
        const name = account.name || '';
        const azureOid = account.homeAccountId?.split('.')[0] || account.localAccountId || '';
        const tenantId = account.tenantId || '';

        // Find or create customer in Cosmos DB
        const customersContainer = await cosmos.getContainer('customers');

        let customer;
        const { resources: existingCustomers } = await customersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.azureOid = @oid',
                parameters: [{ name: '@oid', value: azureOid }],
            })
            .fetchAll();

        if (existingCustomers.length > 0) {
            customer = existingCustomers[0];
            // Update last login
            customer.lastLoginAt = new Date().toISOString();
            customer.name = name || customer.name;
            customer.email = email || customer.email;
            await customersContainer.item(customer.id, customer.id).replace(customer);
        } else {
            customer = {
                id: crypto.randomUUID(),
                azureOid,
                tenantId,
                email,
                name,
                organization: account.environment || '',
                tier: 'free',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
            };
            await customersContainer.items.create(customer);
        }

        // Create session
        const sessionsContainer = await cosmos.getContainer('sessions');
        const sessionToken = crypto.randomBytes(48).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

        const session = {
            id: crypto.randomUUID(),
            userId: customer.id,
            token: sessionToken,
            expiresAt,
            createdAt: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || '',
        };
        await sessionsContainer.items.create(session);

        // Audit log
        await logAudit(customer.id, 'LOGIN', {
            email: customer.email,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return {
            status: 200,
            jsonBody: {
                session: {
                    token: sessionToken,
                    expiresAt,
                },
                user: {
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    organization: customer.organization,
                },
            },
        };
    } catch (err) {
        context.log(`Callback error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Authentication failed', message: err.message },
        };
    }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

const me = requireAuth(async (request, context) => {
    try {
        const user = request.user;

        // Look up the full customer record
        const customersContainer = await cosmos.getContainer('customers');
        const { resources: customers } = await customersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.azureOid = @oid',
                parameters: [{ name: '@oid', value: user.id }],
            })
            .fetchAll();

        if (customers.length === 0) {
            return {
                status: 404,
                jsonBody: { error: 'Not Found', message: 'Customer profile not found' },
            };
        }

        const customer = customers[0];

        // Count connected tenants
        const tenantsContainer = await cosmos.getContainer('tenants');
        const { resources: tenantCountResult } = await tenantsContainer.items
            .query({
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.customerId = @customerId',
                parameters: [{ name: '@customerId', value: customer.id }],
            })
            .fetchAll();

        const connectedTenantCount = tenantCountResult[0] || 0;

        return {
            status: 200,
            jsonBody: {
                user: {
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    organization: customer.organization,
                    tier: customer.tier,
                    createdAt: customer.createdAt,
                    lastLoginAt: customer.lastLoginAt,
                    connectedTenantCount,
                },
            },
        };
    } catch (err) {
        context.log(`Me endpoint error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Internal Server Error', message: err.message },
        };
    }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

const logout = requireAuth(async (request, context) => {
    try {
        const user = request.user;

        // Find and delete the session by token
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.slice(7);

        const sessionsContainer = await cosmos.getContainer('sessions');

        // Look up customer to get their ID for session lookup
        const customersContainer = await cosmos.getContainer('customers');
        const { resources: customers } = await customersContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.azureOid = @oid',
                parameters: [{ name: '@oid', value: user.id }],
            })
            .fetchAll();

        if (customers.length > 0) {
            const customer = customers[0];

            // Delete active sessions for this user
            const { resources: sessions } = await sessionsContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: customer.id }],
                })
                .fetchAll();

            for (const session of sessions) {
                await sessionsContainer.item(session.id, session.userId).delete();
            }

            // Audit log
            await logAudit(customer.id, 'LOGOUT', {
                email: customer.email,
            });
        }

        return { status: 204 };
    } catch (err) {
        context.log(`Logout error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Logout failed', message: err.message },
        };
    }
});

module.exports = {
    login,
    callback,
    me,
    logout,
};
