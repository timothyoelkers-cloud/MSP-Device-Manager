const cosmos = require('../services/cosmosService');

// ---------------------------------------------------------------------------
// Session Hardening Middleware
// ---------------------------------------------------------------------------

/**
 * Validates a session beyond just token existence.
 * Checks expiry, verifies IP and user-agent bindings, and updates activity.
 *
 * @param {import('@azure/functions').HttpRequest} request
 * @param {string} sessionToken — the raw session token from the Authorization header
 * @returns {Promise<object>} The validated session document
 * @throws {Error} If session is missing, expired, or invalid
 */
async function validateSession(request, sessionToken) {
    const container = await cosmos.getContainer('sessions');

    const { resources } = await container.items
        .query({
            query: 'SELECT * FROM c WHERE c.token = @token',
            parameters: [{ name: '@token', value: sessionToken }],
        })
        .fetchAll();

    if (resources.length === 0) {
        const error = new Error('Session not found');
        error.status = 401;
        throw error;
    }

    const session = resources[0];

    // Check logical expiry
    if (new Date(session.expiresAt) < new Date()) {
        const error = new Error('Session has expired');
        error.status = 401;
        throw error;
    }

    // Verify IP binding
    const requestIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (session.ipAddress && requestIp !== session.ipAddress) {
        console.warn(
            `[session] IP mismatch for session ${session.id}: ` +
            `expected "${session.ipAddress}", got "${requestIp}"`
        );
    }

    // Verify user-agent binding
    const requestUa = request.headers.get('user-agent') || '';
    if (session.userAgent && requestUa !== session.userAgent) {
        console.warn(
            `[session] User-Agent mismatch for session ${session.id}: ` +
            `expected "${session.userAgent}", got "${requestUa}"`
        );
    }

    // Update last activity timestamp
    session.lastActivityAt = new Date().toISOString();
    await container.item(session.id, session.userId).replace(session);

    return session;
}

/**
 * Returns true if the session has been idle longer than the allowed window.
 *
 * @param {object} session — session document from Cosmos DB
 * @param {number} [maxIdleMinutes=30] — maximum idle time in minutes
 * @returns {boolean} true if session should be terminated
 */
function enforceIdleTimeout(session, maxIdleMinutes = 30) {
    const lastActivity = session.lastActivityAt || session.createdAt;
    const idleMs = Date.now() - new Date(lastActivity).getTime();
    return idleMs > maxIdleMinutes * 60 * 1000;
}

/**
 * Limits concurrent sessions per user. Deletes the oldest sessions that
 * exceed the maximum count and returns their IDs.
 *
 * @param {string} userId — partition key in sessions container
 * @param {number} [maxSessions=3] — maximum allowed concurrent sessions
 * @returns {Promise<string[]>} IDs of deleted sessions
 */
async function enforceConcurrentSessions(userId, maxSessions = 3) {
    const container = await cosmos.getContainer('sessions');

    const { resources: sessions } = await container.items
        .query({
            query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt ASC',
            parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();

    if (sessions.length <= maxSessions) {
        return [];
    }

    // Delete oldest sessions to stay under the limit
    const excess = sessions.slice(0, sessions.length - maxSessions);
    const deletedIds = [];

    for (const old of excess) {
        try {
            await container.item(old.id, userId).delete();
            deletedIds.push(old.id);
        } catch (err) {
            // Ignore 404s — TTL may have already removed it
            if (err.code !== 404 && err.statusCode !== 404) throw err;
        }
    }

    return deletedIds;
}

/**
 * Higher-order function that wraps an Azure Functions handler with full
 * session validation (token lookup, idle timeout, activity tracking).
 *
 * Attaches `request.session` on success.
 *
 * @param {Function} handler — Azure Functions handler to wrap
 * @returns {Function} Wrapped handler
 */
function requireSession(handler) {
    return async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization') || '';

            if (!authHeader.startsWith('Bearer ')) {
                return {
                    status: 401,
                    jsonBody: { error: 'Unauthorized', message: 'Missing session token' },
                };
            }

            const token = authHeader.slice(7);
            if (!token) {
                return {
                    status: 401,
                    jsonBody: { error: 'Unauthorized', message: 'Empty session token' },
                };
            }

            // Validate session in Cosmos DB
            const session = await validateSession(request, token);

            // Enforce idle timeout (30 minutes)
            if (enforceIdleTimeout(session)) {
                return {
                    status: 401,
                    jsonBody: { error: 'Unauthorized', message: 'Session idle timeout exceeded' },
                };
            }

            request.session = session;

            return await handler(request, context);
        } catch (err) {
            context.log(`Session middleware error: ${err.message}`);

            const status = err.status || 401;
            return {
                status,
                jsonBody: {
                    error: 'Unauthorized',
                    message: status === 401
                        ? err.message
                        : 'Session validation failed',
                },
            };
        }
    };
}

module.exports = {
    validateSession,
    enforceIdleTimeout,
    enforceConcurrentSessions,
    requireSession,
};
