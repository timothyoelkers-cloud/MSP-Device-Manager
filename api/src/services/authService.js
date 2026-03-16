const msal = require('@azure/msal-node');
const { GRAPH_SCOPES, TOKEN_EXPIRY_BUFFER } = require('../../config/constants');
const keyVaultService = require('./keyVaultService');

// ─── MSAL Configuration ─────────────────────────────────────────────────────

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: 'https://login.microsoftonline.com/common'
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message) => {
                if (level === msal.LogLevel.Error) {
                    console.error('[MSAL]', message);
                }
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Error
        }
    }
};

/**
 * Lazily initialised MSAL ConfidentialClientApplication.
 * Created on first use so env vars are available at runtime (not module load).
 */
let _msalClient = null;

function getMsalClient() {
    if (!_msalClient) {
        _msalClient = new msal.ConfidentialClientApplication({
            auth: {
                clientId: process.env.AZURE_CLIENT_ID,
                clientSecret: process.env.AZURE_CLIENT_SECRET,
                authority: msalConfig.auth.authority
            },
            system: msalConfig.system
        });
    }
    return _msalClient;
}

// ─── Login scopes (OIDC + offline) ──────────────────────────────────────────

const LOGIN_SCOPES = ['openid', 'profile', 'email', 'offline_access'];

// ─── Auth URL generation ────────────────────────────────────────────────────

/**
 * Generates an Azure AD authorization URL for multi-tenant OIDC login.
 *
 * @param {string} [state] - Optional opaque state value for CSRF protection
 * @returns {Promise<string>} The authorization URL to redirect the user to
 */
async function getAuthUrl(state) {
    const client = getMsalClient();

    const authCodeUrlParams = {
        scopes: LOGIN_SCOPES,
        redirectUri: process.env.REDIRECT_URI || `${process.env.FRONTEND_URL}/api/auth/callback`,
        responseMode: 'query',
        prompt: 'select_account'
    };

    if (state) {
        authCodeUrlParams.state = state;
    }

    return await client.getAuthCodeUrl(authCodeUrlParams);
}

// ─── Auth code exchange ─────────────────────────────────────────────────────

/**
 * Exchanges an authorization code for tokens (id_token, access_token, refresh_token).
 * Stores the refresh token securely in Key Vault.
 *
 * @param {string} code - The authorization code from the callback
 * @returns {Promise<{ user: object, tokens: object }>} User profile and tokens
 */
async function handleCallback(code) {
    const client = getMsalClient();

    const tokenRequest = {
        code,
        scopes: LOGIN_SCOPES,
        redirectUri: process.env.REDIRECT_URI || `${process.env.FRONTEND_URL}/api/auth/callback`
    };

    const response = await client.acquireTokenByCode(tokenRequest);

    const user = {
        id: response.account.homeAccountId,
        oid: response.idTokenClaims.oid,
        email: response.account.username,
        name: response.idTokenClaims.name || response.account.name || '',
        tenantId: response.idTokenClaims.tid
    };

    const tokens = {
        accessToken: response.accessToken,
        idToken: response.idToken,
        expiresOn: response.expiresOn
    };

    // Store refresh token securely in Key Vault if available
    if (response.refreshToken) {
        const secretName = `rt-${user.oid}`;
        await keyVaultService.setSecret(secretName, response.refreshToken);
    }

    return { user, tokens };
}

// ─── Token refresh ──────────────────────────────────────────────────────────

/**
 * Refreshes an expired access token using the provided refresh token.
 *
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresOn: Date }>}
 */
async function refreshToken(refreshToken) {
    const client = getMsalClient();

    const refreshRequest = {
        refreshToken,
        scopes: LOGIN_SCOPES
    };

    const response = await client.acquireTokenByRefreshToken(refreshRequest);

    return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || refreshToken,
        expiresOn: response.expiresOn
    };
}

// ─── Tenant-scoped token acquisition ────────────────────────────────────────

/**
 * Retrieves a valid access token for a specific GDAP-managed tenant.
 * Looks up the stored refresh token from Key Vault, refreshes if needed,
 * and returns an access token scoped to the target tenant's Graph API.
 *
 * @param {string} customerId - The MSP customer's object ID (oid)
 * @param {string} tenantId - The target GDAP tenant ID
 * @returns {Promise<string>} Access token for Graph API calls against the tenant
 */
async function getTokenForTenant(customerId, tenantId) {
    // Retrieve the stored refresh token from Key Vault
    const secretName = `rt-${customerId}`;
    const storedRefreshToken = await keyVaultService.getSecret(secretName);

    if (!storedRefreshToken) {
        const error = new Error('No stored refresh token found. User must re-authenticate.');
        error.status = 401;
        throw error;
    }

    // Build a tenant-specific MSAL client
    const tenantClient = new msal.ConfidentialClientApplication({
        auth: {
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            authority: `https://login.microsoftonline.com/${tenantId}`
        },
        system: msalConfig.system
    });

    // Use the refresh token to get a tenant-scoped access token with Graph scopes
    const graphScopes = GRAPH_SCOPES.map(
        scope => `https://graph.microsoft.com/${scope}`
    );

    const response = await tenantClient.acquireTokenByRefreshToken({
        refreshToken: storedRefreshToken,
        scopes: graphScopes
    });

    // Update the stored refresh token if a new one was issued
    if (response.refreshToken && response.refreshToken !== storedRefreshToken) {
        await keyVaultService.setSecret(secretName, response.refreshToken);
    }

    return response.accessToken;
}

// ─── Token revocation ───────────────────────────────────────────────────────

/**
 * Revokes all stored tokens for a customer by removing from Key Vault.
 *
 * @param {string} customerId - The customer's object ID (oid)
 */
async function revokeTokens(customerId) {
    const secretName = `rt-${customerId}`;

    try {
        await keyVaultService.deleteSecret(secretName);
    } catch (err) {
        // If the secret doesn't exist, that's fine — nothing to revoke
        if (err.statusCode !== 404 && err.code !== 'SecretNotFound') {
            throw err;
        }
    }
}

module.exports = {
    getAuthUrl,
    handleCallback,
    refreshToken,
    getTokenForTenant,
    revokeTokens
};
