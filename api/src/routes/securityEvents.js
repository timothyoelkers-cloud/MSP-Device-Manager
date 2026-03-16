const { requireAuth } = require('../middleware/auth');
const cosmos = require('../services/cosmosService');
const crypto = require('crypto');

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

const SECURITY_EVENT_TYPES = [
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'SESSION_SUSPICIOUS',
    'GDPR_DELETE_REQUEST', 'GDPR_EXPORT', 'TENANT_CONNECT', 'TENANT_DISCONNECT',
];

// GET /api/security/events
const getEvents = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
        const typeFilter = url.searchParams.get('type') || '';

        const container = await cosmos.getContainer('auditLog');

        let query = 'SELECT * FROM c WHERE c.customerId = @id';
        const params = [{ name: '@id', value: customer.id }];

        if (typeFilter && SECURITY_EVENT_TYPES.includes(typeFilter)) {
            query += ' AND c.action = @type';
            params.push({ name: '@type', value: typeFilter });
        }

        query += ' ORDER BY c.timestamp DESC OFFSET @offset LIMIT @limit';
        params.push({ name: '@offset', value: (page - 1) * pageSize });
        params.push({ name: '@limit', value: pageSize });

        const { resources } = await container.items
            .query({ query, parameters: params })
            .fetchAll();

        return { status: 200, jsonBody: { events: resources, page, pageSize } };
    } catch (err) {
        context.log(`Security events error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

// POST /api/security/alerts
const createAlert = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const body = await request.json();
        const { type, severity = 'medium', description = '', metadata = {} } = body;

        if (!type) return { status: 400, jsonBody: { error: 'Alert type is required' } };

        const container = await cosmos.getContainer('securityAlerts');
        const alert = {
            id: crypto.randomUUID(),
            customerId: customer.id,
            type,
            severity,
            description,
            metadata,
            status: 'open',
            createdAt: new Date().toISOString(),
        };

        await container.items.create(alert);
        return { status: 201, jsonBody: { alert } };
    } catch (err) {
        context.log(`Create alert error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

// GET /api/security/alerts
const listAlerts = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) return { status: 404, jsonBody: { error: 'Customer not found' } };

        const url = new URL(request.url);
        const severity = url.searchParams.get('severity') || '';
        const status = url.searchParams.get('status') || '';
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));

        const container = await cosmos.getContainer('securityAlerts');

        let query = 'SELECT * FROM c WHERE c.customerId = @id';
        const params = [{ name: '@id', value: customer.id }];

        if (severity) {
            query += ' AND c.severity = @severity';
            params.push({ name: '@severity', value: severity });
        }
        if (status) {
            query += ' AND c.status = @status';
            params.push({ name: '@status', value: status });
        }

        query += ' ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
        params.push({ name: '@offset', value: (page - 1) * pageSize });
        params.push({ name: '@limit', value: pageSize });

        const { resources } = await container.items
            .query({ query, parameters: params })
            .fetchAll();

        return { status: 200, jsonBody: { alerts: resources, page, pageSize } };
    } catch (err) {
        context.log(`List alerts error: ${err.message}`);
        return { status: 500, jsonBody: { error: err.message } };
    }
});

module.exports = { getEvents, createAlert, listAlerts };
