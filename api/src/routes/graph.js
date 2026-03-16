const { requireAuth } = require('../middleware/auth');
const { validateTenantId, validateGraphPath } = require('../middleware/validation');
const cosmos = require('../services/cosmosService');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRAPH_BASE_URL = 'https://graph.microsoft.com';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Status codes that are worth retrying
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Acquires a delegated access token for a specific tenant using
 * the GDAP / partner relationship (client credentials flow scoped to tenant).
 */
async function getTokenForTenant(tenantId) {
    const msalClient = new ConfidentialClientApplication({
        auth: {
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            authority: `https://login.microsoftonline.com/${tenantId}`,
        },
    });

    const result = await msalClient.acquireTokenByClientCredential({
        scopes: [`${GRAPH_BASE_URL}/.default`],
    });

    if (!result || !result.accessToken) {
        throw new Error(`Failed to acquire token for tenant ${tenantId}`);
    }

    return result.accessToken;
}

/**
 * Rewrites Graph @odata.nextLink URLs to go through the proxy.
 * Replaces https://graph.microsoft.com/v1.0/... with /api/graph/{tenantId}/v1.0/...
 */
function rewriteNextLinks(body, tenantId, baseProxyUrl) {
    if (!body || typeof body !== 'object') return body;

    const rewritten = { ...body };

    if (typeof rewritten['@odata.nextLink'] === 'string') {
        const graphPath = rewritten['@odata.nextLink'].replace(GRAPH_BASE_URL, '');
        rewritten['@odata.nextLink'] = `${baseProxyUrl}/api/graph/${tenantId}${graphPath}`;
    }

    return rewritten;
}

/**
 * Executes a fetch to Graph API with retry logic for transient errors.
 */
async function fetchGraphWithRetry(url, options, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const response = await fetch(url, options);

        if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === retries) {
            return response;
        }

        // Respect Retry-After header if present
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);

        console.warn(
            `Graph API ${response.status} on attempt ${attempt + 1}/${retries + 1}. ` +
            `Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
    }
}

// ---------------------------------------------------------------------------
// GET/POST /api/graph/:tenantId/*
// ---------------------------------------------------------------------------

const graphProxy = requireAuth(async (request, context) => {
    try {
        const customer = await getCustomerByOid(request.user.id);
        if (!customer) {
            return {
                status: 404,
                jsonBody: { error: 'Not Found', message: 'Customer not found' },
            };
        }

        const tenantId = request.params.tenantId;
        const restOfPath = request.params.restOfPath || '';

        if (!tenantId) {
            return {
                status: 400,
                jsonBody: { error: 'Bad Request', message: 'tenantId is required' },
            };
        }

        // Validate tenantId format (GUID)
        if (!validateTenantId(tenantId)) {
            return {
                status: 400,
                jsonBody: { error: 'Bad Request', message: 'Invalid tenantId format — expected a GUID' },
            };
        }

        // Validate Graph API path against allowlist
        if (!validateGraphPath(`/${restOfPath}`)) {
            return {
                status: 403,
                jsonBody: { error: 'Forbidden', message: 'This Graph API path is not allowed through the proxy' },
            };
        }

        // Validate that this customer has access to the requested tenant
        const tenantsContainer = await cosmos.getContainer('tenants');
        const { resources: tenantRecords } = await tenantsContainer.items
            .query({
                query: 'SELECT * FROM c WHERE c.customerId = @customerId AND c.tenantId = @tenantId',
                parameters: [
                    { name: '@customerId', value: customer.id },
                    { name: '@tenantId', value: tenantId },
                ],
            })
            .fetchAll();

        if (tenantRecords.length === 0) {
            return {
                status: 403,
                jsonBody: {
                    error: 'Forbidden',
                    message: 'You do not have access to this tenant',
                },
            };
        }

        // Acquire token for the target tenant
        let accessToken;
        try {
            accessToken = await getTokenForTenant(tenantId);
        } catch (tokenErr) {
            context.log(`Token acquisition error for tenant ${tenantId}: ${tokenErr.message}`);
            return {
                status: 502,
                jsonBody: {
                    error: 'Bad Gateway',
                    message: 'Failed to acquire access token for the target tenant. The GDAP relationship may have expired.',
                },
            };
        }

        // Build the Graph API URL
        const graphUrl = new URL(`/${restOfPath}`, GRAPH_BASE_URL);

        // Forward query parameters
        const requestUrl = new URL(request.url);
        for (const [key, value] of requestUrl.searchParams.entries()) {
            graphUrl.searchParams.set(key, value);
        }

        // Build fetch options
        const fetchOptions = {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'ConsistencyLevel': 'eventual',
            },
        };

        // Forward body for POST/PATCH/PUT requests
        if (['POST', 'PATCH', 'PUT'].includes(request.method.toUpperCase())) {
            try {
                const bodyText = await request.text();
                if (bodyText) {
                    fetchOptions.body = bodyText;
                }
            } catch {
                // No body to forward
            }
        }

        // Execute the Graph API call with retry
        const graphResponse = await fetchGraphWithRetry(graphUrl.toString(), fetchOptions);

        // Log the Graph call to audit
        await logAudit(customer.id, 'GRAPH_API_CALL', {
            tenantId,
            method: request.method,
            path: `/${restOfPath}`,
            status: graphResponse.status,
        });

        // Handle no-content responses
        if (graphResponse.status === 204) {
            return { status: 204 };
        }

        // Parse and return the Graph response
        let responseBody;
        const contentType = graphResponse.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            responseBody = await graphResponse.json();

            // Rewrite pagination links to go through the proxy
            const proto = request.headers.get('x-forwarded-proto') || 'https';
            const host = request.headers.get('host') || 'localhost';
            const baseProxyUrl = `${proto}://${host}`;
            responseBody = rewriteNextLinks(responseBody, tenantId, baseProxyUrl);
        } else {
            // Non-JSON response — return as-is
            const bodyBuffer = await graphResponse.arrayBuffer();
            return {
                status: graphResponse.status,
                headers: {
                    'Content-Type': contentType,
                },
                body: Buffer.from(bodyBuffer),
            };
        }

        return {
            status: graphResponse.status,
            jsonBody: responseBody,
        };
    } catch (err) {
        context.log(`Graph proxy error: ${err.message}`);
        return {
            status: 500,
            jsonBody: { error: 'Internal Server Error', message: err.message },
        };
    }
});

module.exports = {
    graphProxy,
};
