const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// ─── JWKS client with built-in caching ──────────────────────────────────────

const client = jwksClient({
    jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    cache: true,
    cacheMaxEntries: 10,
    cacheMaxAge: 600000,  // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10
});

/**
 * Retrieves the signing key for a given JWT kid (key ID).
 */
function getSigningKey(kid) {
    return new Promise((resolve, reject) => {
        client.getSigningKey(kid, (err, key) => {
            if (err) return reject(err);
            resolve(key.getPublicKey());
        });
    });
}

// ─── Token validation ───────────────────────────────────────────────────────

/**
 * Validates a JWT Bearer token from the Authorization header.
 * Returns the decoded token payload with user info (oid, email, name, tid).
 *
 * @param {import('@azure/functions').HttpRequest} request
 * @returns {Promise<object>} Decoded JWT payload
 * @throws {Error} If token is missing, malformed, expired, or invalid
 */
async function validateToken(request) {
    const authHeader = request.headers.get('authorization') || '';

    if (!authHeader.startsWith('Bearer ')) {
        const error = new Error('Missing or malformed Authorization header');
        error.status = 401;
        throw error;
    }

    const token = authHeader.slice(7);

    if (!token) {
        const error = new Error('Bearer token is empty');
        error.status = 401;
        throw error;
    }

    // Decode header to get the kid for key lookup
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
        const error = new Error('Invalid token: unable to decode header');
        error.status = 401;
        throw error;
    }

    // Fetch the signing key from Microsoft's JWKS endpoint
    const signingKey = await getSigningKey(decoded.header.kid);

    // Verify and decode the token
    const payload = await new Promise((resolve, reject) => {
        jwt.verify(token, signingKey, {
            algorithms: ['RS256'],
            audience: process.env.AZURE_CLIENT_ID,
            issuer: (iss) => {
                // Azure AD v2 issuers follow: https://login.microsoftonline.com/{tenantId}/v2.0
                // Azure AD v1 issuers follow: https://sts.windows.net/{tenantId}/
                const v2Pattern = /^https:\/\/login\.microsoftonline\.com\/[a-f0-9-]+\/v2\.0$/;
                const v1Pattern = /^https:\/\/sts\.windows\.net\/[a-f0-9-]+\/$/;
                return v2Pattern.test(iss) || v1Pattern.test(iss);
            },
            clockTolerance: 30  // 30 seconds leeway for clock skew
        }, (err, decoded) => {
            if (err) {
                const error = new Error(`Token validation failed: ${err.message}`);
                error.status = 401;
                reject(error);
            } else {
                resolve(decoded);
            }
        });
    });

    return payload;
}

// ─── User extraction ────────────────────────────────────────────────────────

/**
 * Extracts a standardized user object from a decoded JWT payload.
 *
 * @param {object} token - Decoded JWT payload
 * @returns {{ id: string, email: string, name: string, tenantId: string }}
 */
function extractUser(token) {
    return {
        id: token.oid || token.sub,
        email: token.preferred_username || token.email || token.upn || '',
        name: token.name || '',
        tenantId: token.tid || ''
    };
}

// ─── Auth middleware HOF ────────────────────────────────────────────────────

/**
 * Higher-order function that wraps an Azure Functions handler with JWT auth.
 * Validates the Bearer token, attaches `request.user` and `request.token`,
 * and returns 401 if auth fails.
 *
 * @param {Function} handler - The Azure Functions handler to wrap
 * @returns {Function} Wrapped handler with auth validation
 *
 * @example
 *   const { requireAuth } = require('../middleware/auth');
 *   module.exports = requireAuth(async (request, context) => {
 *       const user = request.user;
 *       // handler logic...
 *   });
 */
function requireAuth(handler) {
    return async (request, context) => {
        try {
            const tokenPayload = await validateToken(request);
            request.user = extractUser(tokenPayload);
            request.token = tokenPayload;

            return await handler(request, context);
        } catch (err) {
            context.log(`Auth middleware error: ${err.message}`);

            const status = err.status || 401;
            return {
                status,
                jsonBody: {
                    error: 'Unauthorized',
                    message: status === 401
                        ? 'Invalid or expired authentication token'
                        : err.message
                }
            };
        }
    };
}

module.exports = {
    validateToken,
    requireAuth,
    extractUser
};
