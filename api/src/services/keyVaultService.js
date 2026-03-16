const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

// ─── In-memory cache ────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Simple in-memory secret cache.
 * Each entry: { value: string, cachedAt: number }
 */
const cache = new Map();

/**
 * Returns a cached value if it exists and hasn't expired, otherwise null.
 */
function getCached(name) {
    const entry = cache.get(name);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        cache.delete(name);
        return null;
    }

    return entry.value;
}

/**
 * Stores a value in the cache.
 */
function setCache(name, value) {
    cache.set(name, { value, cachedAt: Date.now() });
}

/**
 * Removes a value from the cache.
 */
function invalidateCache(name) {
    cache.delete(name);
}

// ─── Key Vault client (lazy init) ───────────────────────────────────────────

let _client = null;

function getClient() {
    if (!_client) {
        const vaultUrl = process.env.KEY_VAULT_URL;
        if (!vaultUrl) {
            throw new Error('KEY_VAULT_URL environment variable is not set');
        }
        const credential = new DefaultAzureCredential();
        _client = new SecretClient(vaultUrl, credential);
    }
    return _client;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Retrieves a secret by name from Azure Key Vault.
 * Returns the cached value if available and not expired.
 *
 * @param {string} name - The secret name
 * @returns {Promise<string|null>} The secret value, or null if not found
 */
async function getSecret(name) {
    // Check cache first
    const cached = getCached(name);
    if (cached !== null) {
        return cached;
    }

    try {
        const client = getClient();
        const secret = await client.getSecret(name);
        const value = secret.value;

        // Cache the result
        if (value) {
            setCache(name, value);
        }

        return value || null;
    } catch (err) {
        // Return null for 404s (secret not found)
        if (err.statusCode === 404 || err.code === 'SecretNotFound') {
            return null;
        }
        throw err;
    }
}

/**
 * Stores a secret in Azure Key Vault.
 * Also updates the in-memory cache.
 *
 * @param {string} name - The secret name
 * @param {string} value - The secret value
 * @returns {Promise<void>}
 */
async function setSecret(name, value) {
    const client = getClient();
    await client.setSecret(name, value);

    // Update cache
    setCache(name, value);
}

/**
 * Soft-deletes a secret from Azure Key Vault.
 * Also invalidates the in-memory cache entry.
 *
 * @param {string} name - The secret name
 * @returns {Promise<void>}
 */
async function deleteSecret(name) {
    const client = getClient();

    const poller = await client.beginDeleteSecret(name);
    await poller.pollUntilDone();

    // Invalidate cache
    invalidateCache(name);
}

module.exports = {
    getSecret,
    setSecret,
    deleteSecret
};
