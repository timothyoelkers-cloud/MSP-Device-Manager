const { requireAuth } = require('../middleware/auth');
const cosmos = require('../services/cosmosService');
const crypto = require('crypto');

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
        console.error('Audit log error:', err.message);
    }
}

async function getCustomerByOid(oid) {
    const container = await cosmos.getContainer('customers');
    const { resources } = await container.items
        .query({
            query: 'SELECT * FROM c WHERE c.azureOid = @oid',
            parameters: [{ name: '@oid', value: oid }],
        })
        .fetchAll();
    return resources[0] || null;
}

// GET /api/gdpr/consent
const getConsent = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const container = await cosmos.getContainer('consents');
        const { resources } = await container.items
            .query({
                query: 'SELECT * FROM c WHERE c.customerId = @id ORDER BY c.timestamp DESC',
                parameters: [{ name: '@id', value: customer.id }],
            })
            .fetchAll();

        return {
            status: 200,
            jsonBody: { consent: resources[0] || null },
        };
    } catch (err) {
        context.log(`Get consent error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

// POST /api/gdpr/consent
const recordConsent = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const body = await request.json();
        const { categories = ['essential'], version = '1.0' } = body;

        const container = await cosmos.getContainer('consents');
        const consent = {
            id: crypto.randomUUID(),
            customerId: customer.id,
            categories,
            version,
            timestamp: new Date().toISOString(),
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || '',
        };

        await container.items.create(consent);
        await logAudit(customer.id, 'GDPR_CONSENT', { categories, version });

        return { status: 201, jsonBody: { consent } };
    } catch (err) {
        context.log(`Record consent error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

// GET /api/gdpr/export
const exportData = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const [tenants, sessions, audits, consents] = await Promise.all([
            cosmos.getContainer('tenants').then(c =>
                c.items.query({ query: 'SELECT * FROM c WHERE c.customerId = @id', parameters: [{ name: '@id', value: customer.id }] }).fetchAll()
            ),
            cosmos.getContainer('sessions').then(c =>
                c.items.query({ query: 'SELECT * FROM c WHERE c.userId = @id', parameters: [{ name: '@id', value: customer.id }] }).fetchAll()
            ),
            cosmos.getContainer('auditLog').then(c =>
                c.items.query({ query: 'SELECT * FROM c WHERE c.customerId = @id', parameters: [{ name: '@id', value: customer.id }] }).fetchAll()
            ),
            cosmos.getContainer('consents').then(c =>
                c.items.query({ query: 'SELECT * FROM c WHERE c.customerId = @id', parameters: [{ name: '@id', value: customer.id }] }).fetchAll()
            ),
        ]);

        const bundle = {
            exportedAt: new Date().toISOString(),
            customer: { id: customer.id, email: customer.email, name: customer.name, organization: customer.organization, createdAt: customer.createdAt },
            tenants: tenants.resources,
            sessions: sessions.resources.map(s => ({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt })),
            auditLog: audits.resources,
            consents: consents.resources,
        };

        await logAudit(customer.id, 'GDPR_EXPORT', {});

        return { status: 200, jsonBody: bundle };
    } catch (err) {
        context.log(`Export data error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

// DELETE /api/gdpr/delete
const deleteData = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const body = await request.json();
        if (!body.confirm) {
            return { status: 400, jsonBody: { error: 'You must send { confirm: true } to request deletion' } };
        }

        // Mark customer for deletion (30-day grace period)
        const customersContainer = await cosmos.getContainer('customers');
        customer.deletionRequested = true;
        customer.deletionRequestedAt = new Date().toISOString();
        customer.deletionReason = body.reason || '';
        customer.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await customersContainer.item(customer.id, customer.id).replace(customer);

        // Delete all active sessions immediately
        const sessionsContainer = await cosmos.getContainer('sessions');
        const { resources: sessions } = await sessionsContainer.items
            .query({ query: 'SELECT * FROM c WHERE c.userId = @id', parameters: [{ name: '@id', value: customer.id }] })
            .fetchAll();
        for (const s of sessions) {
            try { await sessionsContainer.item(s.id, customer.id).delete(); } catch {}
        }

        await logAudit(customer.id, 'GDPR_DELETE_REQUEST', { reason: body.reason || '' });

        return {
            status: 202,
            jsonBody: {
                message: 'Deletion request received. Your data will be permanently deleted after a 30-day grace period.',
                scheduledFor: customer.deletionScheduledFor,
            },
        };
    } catch (err) {
        context.log(`Delete data error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

// GET /api/gdpr/policy (no auth required)
async function getPolicy(request, context) {
    return {
        status: 200,
        jsonBody: {
            dataCollected: ['name', 'email', 'organization', 'Azure AD object ID', 'tenant IDs', 'session metadata', 'audit logs'],
            purposes: ['Authentication', 'Tenant management', 'Device management via Microsoft Graph API', 'Security monitoring'],
            retentionPeriods: { sessions: '24 hours', auditLogs: '90 days', securityAlerts: '180 days', customerData: 'Until account deletion' },
            thirdParties: ['Microsoft Azure (infrastructure)', 'Microsoft Graph API (device management)', 'Azure Cosmos DB (data storage)', 'Azure Key Vault (secrets)'],
            rights: ['Access (Art.15)', 'Rectification (Art.16)', 'Erasure (Art.17)', 'Data Portability (Art.20)', 'Restriction (Art.18)', 'Object (Art.21)'],
            contact: 'timothy.oelkers@outlook.com',
            dpo: 'timothy.oelkers@outlook.com',
        },
    };
}

module.exports = { getConsent, recordConsent, exportData, deleteData, getPolicy };
