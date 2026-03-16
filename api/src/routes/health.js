const cosmos = require('../services/cosmosService');
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------

async function healthCheck(request, context) {
    const checks = {
        cosmos: { status: 'unknown' },
        keyVault: { status: 'unknown' },
        timestamp: new Date().toISOString(),
    };

    let overallHealthy = true;

    // Check Cosmos DB connectivity
    try {
        const database = await cosmos.getDatabase();
        // Perform a lightweight read to verify connectivity
        await database.read();
        checks.cosmos = { status: 'healthy' };
    } catch (err) {
        overallHealthy = false;
        checks.cosmos = {
            status: 'unhealthy',
            error: err.message,
        };
        context.log(`Health check — Cosmos DB unhealthy: ${err.message}`);
    }

    // Check Key Vault connectivity
    try {
        const vaultUrl = process.env.KEY_VAULT_URL;
        if (!vaultUrl) {
            checks.keyVault = { status: 'degraded', error: 'KEY_VAULT_URL not configured' };
            overallHealthy = false;
        } else {
            const credential = new DefaultAzureCredential();
            const secretClient = new SecretClient(vaultUrl, credential);
            // List secrets with a page size of 1 as a lightweight connectivity check
            const iterator = secretClient.listPropertiesOfSecrets();
            await iterator.next();
            checks.keyVault = { status: 'healthy' };
        }
    } catch (err) {
        overallHealthy = false;
        checks.keyVault = {
            status: 'unhealthy',
            error: err.message,
        };
        context.log(`Health check — Key Vault unhealthy: ${err.message}`);
    }

    // Determine overall status
    const allUnhealthy = checks.cosmos.status === 'unhealthy' && checks.keyVault.status === 'unhealthy';
    let overallStatus;

    if (overallHealthy) {
        overallStatus = 'healthy';
    } else if (allUnhealthy) {
        overallStatus = 'unhealthy';
    } else {
        overallStatus = 'degraded';
    }

    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    return {
        status: httpStatus,
        jsonBody: {
            status: overallStatus,
            checks,
        },
    };
}

module.exports = healthCheck;
