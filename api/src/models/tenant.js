const { v4: uuidv4 } = require('uuid');
const cosmosService = require('../services/cosmosService');

// ---------------------------------------------------------------------------
// Tenant Model
// ---------------------------------------------------------------------------

const CONTAINER_NAME = 'tenants';

const VALID_STATUSES = ['active', 'disconnected', 'error'];

/**
 * Build a default tenant document.
 */
function buildTenant(data) {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    customerId: data.customerId,
    tenantId: data.tenantId, // Azure AD tenant ID of the managed tenant
    displayName: data.displayName || '',
    domain: data.domain || '',
    gdapRelationshipId: data.gdapRelationshipId || null,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    tokenSecretName: data.tokenSecretName || null,
    status: VALID_STATUSES.includes(data.status) ? data.status : 'active',
    lastSync: data.lastSync || null,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

function isNotFound(error) {
  return error.code === 404 || error.statusCode === 404;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Create a new tenant connection.
 * @param {object} tenantData
 * @returns {object} Created tenant document.
 */
async function create(tenantData) {
  if (!tenantData.customerId) {
    throw new Error('customerId is required to create a tenant');
  }

  const container = await cosmosService.getContainer(CONTAINER_NAME);
  const tenant = buildTenant(tenantData);

  const { resource } = await cosmosService.withRetry(() =>
    container.items.create(tenant)
  );
  return resource;
}

/**
 * Get all tenants for a given customer.
 * @param {string} customerId
 * @returns {object[]} Array of tenant documents.
 */
async function getByCustomerId(customerId) {
  const container = await cosmosService.getContainer(CONTAINER_NAME);

  const { resources } = await cosmosService.withRetry(() =>
    container.items
      .query({
        query: 'SELECT * FROM c WHERE c.customerId = @customerId',
        parameters: [{ name: '@customerId', value: customerId }],
      })
      .fetchAll()
  );

  return resources;
}

/**
 * Get a specific tenant by its document id within a customer partition.
 * @param {string} customerId — partition key
 * @param {string} tenantId — document id
 * @returns {object|null}
 */
async function getById(customerId, tenantId) {
  try {
    const container = await cosmosService.getContainer(CONTAINER_NAME);
    const { resource } = await cosmosService.withRetry(() =>
      container.item(tenantId, customerId).read()
    );
    return resource || null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Partial update of a tenant record.
 * @param {string} customerId
 * @param {string} tenantId — document id
 * @param {object} updates
 * @returns {object} Updated tenant document.
 */
async function update(customerId, tenantId, updates) {
  const existing = await getById(customerId, tenantId);
  if (!existing) {
    const err = new Error(`Tenant not found: ${tenantId}`);
    err.statusCode = 404;
    throw err;
  }

  const merged = {
    ...existing,
    ...updates,
    id: existing.id,
    customerId: existing.customerId, // partition key must not change
    updatedAt: new Date().toISOString(),
  };

  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    throw new Error(`Invalid status: ${updates.status}`);
  }

  const container = await cosmosService.getContainer(CONTAINER_NAME);
  const { resource } = await cosmosService.withRetry(() =>
    container.item(tenantId, customerId).replace(merged)
  );
  return resource;
}

/**
 * Delete (hard delete) a tenant connection.
 * @param {string} customerId
 * @param {string} tenantId — document id
 */
async function deleteTenant(customerId, tenantId) {
  try {
    const container = await cosmosService.getContainer(CONTAINER_NAME);
    await cosmosService.withRetry(() =>
      container.item(tenantId, customerId).delete()
    );
  } catch (error) {
    if (isNotFound(error)) {
      const err = new Error(`Tenant not found: ${tenantId}`);
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }
}

/**
 * Update the sync status and lastSync timestamp for a tenant.
 * @param {string} customerId
 * @param {string} tenantId
 * @param {string} status — one of VALID_STATUSES
 * @returns {object} Updated tenant document.
 */
async function updateSyncStatus(customerId, tenantId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  return update(customerId, tenantId, {
    status,
    lastSync: new Date().toISOString(),
  });
}

module.exports = {
  create,
  getByCustomerId,
  getById,
  update,
  delete: deleteTenant,
  updateSyncStatus,
};
