const { requireAuth } = require('../middleware/auth');
const cosmos = require('../services/cosmosService');
const crypto = require('crypto');

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

// ---------------------------------------------------------------------------
// GET /api/tenants
// ---------------------------------------------------------------------------

const listTenants = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) {
            return {
                status: 404,
                jsonBody: { error: 'Not Found', message: 'Customer not found' },
            };
        }

        const tenantsContainer = await cosmos.getContainer('tenants');
        const { resources: tenants } = await tenantsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.customerId = @customerId ORDER BY c.displayName',
                parameters: [{ name: '@customerId', value: customer.id }],
            })
            .fetchAll();

        // Enrich each tenant with status and last sync info
        const enrichedTenants = tenants.map((tenant) => ({
            id: tenant.id,
            tenantId: tenant.tenantId,
            displayName: tenant.displayName,
            domain: tenant.domain,
            gdapRelationshipId: tenant.gdapRelationshipId,
            status: tenant.status || 'connected',
            lastSyncAt: tenant.lastSyncAt || null,
            deviceCount: tenant.deviceCount || 0,
            connectedAt: tenant.connectedAt,
        }));

        return {
            status: 200,
            jsonBody: { tenants: enrichedTenants },
        };
    } catch (err) {
        context.log(`List tenants error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Internal Server Error', message: err.message },
        };
    }
});

// ---------------------------------------------------------------------------
// POST /api/tenants/connect
// ---------------------------------------------------------------------------

const connectTenant = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) {
            return {
                status: 404,
                jsonBody: { error: 'Not Found', message: 'Customer not found' },
            };
        }

        const body = await request.json();
        const { tenantId, displayName, domain, gdapRelationshipId } = body;

        // Validate required fields
        if (!tenantId || !displayName || !domain) {
            return {
                status: 400,
                jsonBody: {
                    error: 'Bad Request',
                    message: 'tenantId, displayName, and domain are required',
                },
            };
        }

        const tenantsContainer = await cosmos.getContainer('tenants');

        // Check if tenant is already connected for this customer
        const { resources: existing } = await tenantsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.customerId = @customerId AND c.tenantId = @tenantId',
                parameters: [
                    { name: '@customerId', value: customer.id },
                    { name: '@tenantId', value: tenantId },
                ],
            })
            .fetchAll();

        if (existing.length > 0) {
            return {
                status: 409,
                jsonBody: {
                    error: 'Conflict',
                    message: 'This tenant is already connected to your account',
                },
            };
        }

        // Create tenant connection record
        const tenant = {
            id: crypto.randomUUID(),
            customerId: customer.id,
            tenantId,
            displayName,
            domain,
            gdapRelationshipId: gdapRelationshipId || null,
            status: 'pending_consent',
            connectedAt: new Date().toISOString(),
            lastSyncAt: null,
            deviceCount: 0,
        };

        await tenantsContainer.items.create(tenant);

        // Generate admin consent URL for GDAP
        const clientId = process.env.AZURE_CLIENT_ID;
        const redirectUri = encodeURIComponent(
            process.env.CONSENT_REDIRECT_URI || `${process.env.AUTH_REDIRECT_URI || 'http://localhost:3000'}/consent/callback`
        );
        const consentUrl =
            `https://login.microsoftonline.com/${tenantId}/adminconsent` +
            `?client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&state=${tenant.id}`;

        // Audit log
        await logAudit(customer.id, 'TENANT_CONNECT', {
            tenantId,
            displayName,
            domain,
        });

        return {
            status: 201,
            jsonBody: {
                tenant: {
                    id: tenant.id,
                    tenantId: tenant.tenantId,
                    displayName: tenant.displayName,
                    domain: tenant.domain,
                    status: tenant.status,
                    connectedAt: tenant.connectedAt,
                },
                consentUrl,
            },
        };
    } catch (err) {
        context.log(`Connect tenant error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Internal Server Error', message: err.message },
        };
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/tenants/:id
// ---------------------------------------------------------------------------

const disconnectTenant = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) {
            return {
                status: 404,
                jsonBody: { error: 'Not Found', message: 'Customer not found' },
            };
        }

        const tenantRecordId = request.params.id;
        if (!tenantRecordId) {
            return {
                status: 400,
                jsonBody: { error: 'Bad Request', message: 'Tenant ID is required' },
            };
        }

        const tenantsContainer = await cosmos.getContainer('tenants');

        // Verify the tenant belongs to this customer
        let tenantRecord;
        try {
            const { resource } = await tenantsContainer.item(tenantRecordId, customer.id).read();
            tenantRecord = resource;
        } catch (readErr) {
            if (readErr.code === 404) {
                return {
                    status: 404,
                    jsonBody: { error: 'Not Found', message: 'Tenant connection not found' },
                };
            }
            throw readErr;
        }

        if (!tenantRecord || tenantRecord.customerId !== customer.id) {
            return {
                status: 403,
                jsonBody: { error: 'Forbidden', message: 'You do not have access to this tenant' },
            };
        }

        // Delete the tenant connection record
        await tenantsContainer.item(tenantRecordId, customer.id).delete();

        // Audit log
        await logAudit(customer.id, 'TENANT_DISCONNECT', {
            tenantId: tenantRecord.tenantId,
            displayName: tenantRecord.displayName,
        });

        return { status: 204 };
    } catch (err) {
        context.log(`Disconnect tenant error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Internal Server Error', message: err.message },
        };
    }
});

module.exports = {
    listTenants,
    connectTenant,
    disconnectTenant,
};
