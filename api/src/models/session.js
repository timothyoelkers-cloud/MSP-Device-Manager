const { v4: uuidv4 } = require('uuid');
const cosmosService = require('../services/cosmosService');

// ---------------------------------------------------------------------------
// Session Model
// ---------------------------------------------------------------------------

const CONTAINER_NAME = 'sessions';

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function isNotFound(error) {
  return error.code === 404 || error.statusCode === 404;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Create a new session with a 24-hour expiry.
 * The Cosmos TTL field ensures automatic cleanup.
 * @param {object} sessionData — { userId, customerId, email, userAgent, ipAddress }
 * @returns {object} Created session document.
 */
async function create(sessionData) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const session = {
    id: sessionData.id || uuidv4(),
    userId: sessionData.userId,
    customerId: sessionData.customerId || null,
    email: sessionData.email || '',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userAgent: sessionData.userAgent || '',
    ipAddress: sessionData.ipAddress || '',
    ttl: SESSION_TTL_SECONDS, // Cosmos DB per-item TTL
  };

  const container = await cosmosService.getContainer(CONTAINER_NAME);
  const { resource } = await cosmosService.withRetry(() =>
    container.items.create(session)
  );
  return resource;
}

/**
 * Fetch a session by its token (id).
 * Returns null if the session does not exist or has logically expired.
 * Note: Cosmos TTL may have already removed expired docs, but we also check
 * expiresAt in case TTL cleanup is delayed.
 * @param {string} sessionId
 * @returns {object|null}
 */
async function getById(sessionId) {
  const container = await cosmosService.getContainer(CONTAINER_NAME);

  // Session is partitioned by userId which we don't know here, so use a
  // cross-partition query by id.
  try {
    const { resources } = await cosmosService.withRetry(() =>
      container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: sessionId }],
        })
        .fetchAll()
    );

    if (resources.length === 0) return null;

    const session = resources[0];

    // Check logical expiry
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }

    return session;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Explicitly delete a session (e.g. on logout).
 * @param {string} sessionId
 */
async function deleteSession(sessionId) {
  // We need the partition key (userId) to delete, so fetch first.
  const session = await getById(sessionId);
  if (!session) return; // Already gone — nothing to do.

  try {
    const container = await cosmosService.getContainer(CONTAINER_NAME);
    await cosmosService.withRetry(() =>
      container.item(session.id, session.userId).delete()
    );
  } catch (error) {
    if (isNotFound(error)) return; // Race condition — already deleted.
    throw error;
  }
}

/**
 * Delete all sessions for a given user (e.g. password change, forced logout).
 * @param {string} userId — partition key
 */
async function deleteAllForUser(userId) {
  const container = await cosmosService.getContainer(CONTAINER_NAME);

  const { resources } = await cosmosService.withRetry(() =>
    container.items
      .query({
        query: 'SELECT c.id FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll()
  );

  // Delete each session within the same partition
  const deletePromises = resources.map((session) =>
    cosmosService.withRetry(() =>
      container.item(session.id, userId).delete()
    ).catch((err) => {
      // Ignore 404s — TTL may have removed it already
      if (!isNotFound(err)) throw err;
    })
  );

  await Promise.all(deletePromises);
}

module.exports = {
  create,
  getById,
  delete: deleteSession,
  deleteAllForUser,
};
