const { v4: uuidv4 } = require('uuid');
const cosmosService = require('../services/cosmosService');

// ---------------------------------------------------------------------------
// Audit Entry Model
// ---------------------------------------------------------------------------

const CONTAINER_NAME = 'auditLog';

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Log a new audit entry.
 * @param {object} entry — { customerId, userId, userEmail, action, resource,
 *                            resourceId, tenantId, details, ipAddress }
 * @returns {object} Created audit document.
 */
async function create(entry) {
  if (!entry.customerId) {
    throw new Error('customerId is required for audit entries');
  }

  const now = new Date().toISOString();

  const doc = {
    id: uuidv4(),
    customerId: entry.customerId,
    userId: entry.userId || null,
    userEmail: entry.userEmail || '',
    action: entry.action || '',
    resource: entry.resource || '',
    resourceId: entry.resourceId || null,
    tenantId: entry.tenantId || null,
    details: entry.details || {},
    ipAddress: entry.ipAddress || '',
    timestamp: entry.timestamp || now,
    // 90-day TTL is set at container level; no per-item override needed
  };

  const container = await cosmosService.getContainer(CONTAINER_NAME);
  const { resource } = await cosmosService.withRetry(() =>
    container.items.create(doc)
  );
  return resource;
}

/**
 * Query audit entries for a customer with optional filters and pagination.
 *
 * @param {string} customerId — partition key
 * @param {object} [filters]
 * @param {string} [filters.action]       — exact match on action
 * @param {string} [filters.userId]       — exact match on userId
 * @param {string} [filters.tenantId]     — exact match on tenantId
 * @param {string} [filters.startDate]    — ISO date string (inclusive)
 * @param {string} [filters.endDate]      — ISO date string (inclusive)
 * @param {number} [filters.limit]        — max results (default 50)
 * @param {string} [filters.continuationToken] — for pagination
 * @returns {{ entries: object[], continuationToken: string|undefined }}
 */
async function query(customerId, filters = {}) {
  const conditions = ['c.customerId = @customerId'];
  const parameters = [{ name: '@customerId', value: customerId }];

  if (filters.action) {
    conditions.push('c.action = @action');
    parameters.push({ name: '@action', value: filters.action });
  }

  if (filters.userId) {
    conditions.push('c.userId = @userId');
    parameters.push({ name: '@userId', value: filters.userId });
  }

  if (filters.tenantId) {
    conditions.push('c.tenantId = @tenantId');
    parameters.push({ name: '@tenantId', value: filters.tenantId });
  }

  if (filters.startDate) {
    conditions.push('c.timestamp >= @startDate');
    parameters.push({ name: '@startDate', value: filters.startDate });
  }

  if (filters.endDate) {
    conditions.push('c.timestamp <= @endDate');
    parameters.push({ name: '@endDate', value: filters.endDate });
  }

  const queryText =
    `SELECT * FROM c WHERE ${conditions.join(' AND ')} ` +
    `ORDER BY c.timestamp DESC`;

  const limit = filters.limit || 50;

  const container = await cosmosService.getContainer(CONTAINER_NAME);

  const queryOptions = {
    maxItemCount: limit,
    partitionKey: customerId,
  };

  if (filters.continuationToken) {
    queryOptions.continuationToken = filters.continuationToken;
  }

  const iterator = container.items.query(
    { query: queryText, parameters },
    queryOptions
  );

  const { resources, continuationToken } = await cosmosService.withRetry(() =>
    iterator.fetchNext()
  );

  return {
    entries: resources || [],
    continuationToken: continuationToken || undefined,
  };
}

/**
 * Get the most recent audit entries for a customer.
 * @param {string} customerId
 * @param {number} [limit=20]
 * @returns {object[]}
 */
async function getRecent(customerId, limit = 20) {
  const container = await cosmosService.getContainer(CONTAINER_NAME);

  const { resources } = await cosmosService.withRetry(() =>
    container.items
      .query(
        {
          query:
            'SELECT * FROM c WHERE c.customerId = @customerId ' +
            'ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
          parameters: [
            { name: '@customerId', value: customerId },
            { name: '@limit', value: limit },
          ],
        },
        { partitionKey: customerId }
      )
      .fetchAll()
  );

  return resources;
}

module.exports = {
  create,
  query,
  getRecent,
};
