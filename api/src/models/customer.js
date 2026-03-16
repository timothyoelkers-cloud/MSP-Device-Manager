const { v4: uuidv4 } = require('uuid');
const cosmosService = require('../services/cosmosService');

// ---------------------------------------------------------------------------
// Customer Model
// ---------------------------------------------------------------------------

const CONTAINER_NAME = 'customers';

const VALID_PLANS = ['free', 'pro', 'enterprise'];

/**
 * Build a default customer object, merging in any provided data.
 */
function buildCustomer(data) {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    email: data.email,
    displayName: data.displayName || '',
    organizationName: data.organizationName || '',
    azureAdTenantId: data.azureAdTenantId || null,
    plan: VALID_PLANS.includes(data.plan) ? data.plan : 'free',
    createdAt: data.createdAt || now,
    updatedAt: now,
    settings: {
      theme: 'light',
      language: 'en',
      notifications: true,
      ...(data.settings || {}),
    },
    isActive: data.isActive !== undefined ? data.isActive : true,
  };
}

/**
 * Classify Cosmos errors — returns true for 404 / not-found.
 */
function isNotFound(error) {
  return error.code === 404 || error.statusCode === 404;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Create a new customer record.
 * @param {object} customerData
 * @returns {object} The created customer document.
 */
async function create(customerData) {
  const container = await cosmosService.getContainer(CONTAINER_NAME);
  const customer = buildCustomer(customerData);

  const { resource } = await cosmosService.withRetry(() =>
    container.items.create(customer)
  );
  return resource;
}

/**
 * Fetch a customer by ID.
 * @param {string} id
 * @returns {object|null} Customer document or null.
 */
async function getById(id) {
  try {
    const container = await cosmosService.getContainer(CONTAINER_NAME);
    const { resource } = await cosmosService.withRetry(() =>
      container.item(id, id).read()
    );
    return resource || null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Query for a customer by email (cross-partition).
 * @param {string} email
 * @returns {object|null} Customer document or null.
 */
async function getByEmail(email) {
  const container = await cosmosService.getContainer(CONTAINER_NAME);

  const { resources } = await cosmosService.withRetry(() =>
    container.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email AND c.isActive = true',
        parameters: [{ name: '@email', value: email }],
      })
      .fetchAll()
  );

  return resources.length > 0 ? resources[0] : null;
}

/**
 * Partial update — merges provided fields and bumps updatedAt.
 * @param {string} id
 * @param {object} updates
 * @returns {object} Updated customer document.
 */
async function update(id, updates) {
  const existing = await getById(id);
  if (!existing) {
    const err = new Error(`Customer not found: ${id}`);
    err.statusCode = 404;
    throw err;
  }

  const merged = {
    ...existing,
    ...updates,
    id: existing.id, // id must not change
    updatedAt: new Date().toISOString(),
  };

  // Deep merge settings if provided
  if (updates.settings) {
    merged.settings = { ...existing.settings, ...updates.settings };
  }

  const container = await cosmosService.getContainer(CONTAINER_NAME);
  const { resource } = await cosmosService.withRetry(() =>
    container.item(id, id).replace(merged)
  );
  return resource;
}

/**
 * Soft delete — sets isActive to false.
 * @param {string} id
 * @returns {object} Updated customer document.
 */
async function deleteCustomer(id) {
  return update(id, { isActive: false });
}

/**
 * Find an existing customer by Azure AD oid (stored as id) or create a new
 * one from the SSO profile.
 * @param {object} azureAdProfile — expects { oid, email, displayName, tid }
 * @returns {object} Customer document.
 */
async function findOrCreate(azureAdProfile) {
  const { oid, email, displayName, tid } = azureAdProfile;

  // Try by Azure AD oid first (used as id)
  let customer = await getById(oid);
  if (customer) return customer;

  // Fall back to email lookup
  if (email) {
    customer = await getByEmail(email);
    if (customer) return customer;
  }

  // Create a new customer from the profile
  return create({
    id: oid,
    email: email,
    displayName: displayName || '',
    azureAdTenantId: tid || null,
    plan: 'free',
  });
}

module.exports = {
  create,
  getById,
  getByEmail,
  update,
  delete: deleteCustomer,
  findOrCreate,
};
