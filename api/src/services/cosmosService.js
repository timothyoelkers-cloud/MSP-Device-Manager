const { CosmosClient } = require('@azure/cosmos');

// ---------------------------------------------------------------------------
// Cosmos DB Singleton Service
// ---------------------------------------------------------------------------

const DATABASE_ID = 'msp-device-manager';

const CONTAINERS = [
  { id: 'customers', partitionKey: '/id' },
  { id: 'tenants', partitionKey: '/customerId' },
  {
    id: 'sessions',
    partitionKey: '/userId',
    defaultTtl: 60 * 60 * 24, // 24 hours
  },
  {
    id: 'auditLog',
    partitionKey: '/customerId',
    defaultTtl: 60 * 60 * 24 * 90, // 90 days
  },
  {
    id: 'consents',
    partitionKey: '/customerId',
  },
  {
    id: 'securityAlerts',
    partitionKey: '/customerId',
    defaultTtl: 60 * 60 * 24 * 180, // 180 days
  },
];

// Maximum number of retries for transient Cosmos errors
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

// Transient status codes worth retrying
const RETRYABLE_STATUS_CODES = new Set([408, 429, 449, 503]);

let _client = null;
let _database = null;
const _containers = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClient() {
  if (!_client) {
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        'COSMOS_CONNECTION_STRING environment variable is not set'
      );
    }
    _client = new CosmosClient(connectionString);
  }
  return _client;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async operation with retry logic for transient Cosmos DB errors.
 * Respects the Retry-After header returned by the service when available.
 */
async function withRetry(operation, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable =
        RETRYABLE_STATUS_CODES.has(error.code) ||
        RETRYABLE_STATUS_CODES.has(error.statusCode);

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      // Honour Retry-After header (seconds) when present, else exponential backoff
      const retryAfterMs = error.retryAfterInMs
        ? error.retryAfterInMs
        : RETRY_DELAY_MS * Math.pow(2, attempt);

      console.warn(
        `Cosmos DB transient error (${error.code || error.statusCode}). ` +
          `Retrying in ${retryAfterMs}ms (attempt ${attempt + 1}/${retries})...`
      );
      await sleep(retryAfterMs);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the database reference, creating it if it does not exist.
 */
async function getDatabase() {
  if (!_database) {
    const client = getClient();
    const { database } = await withRetry(() =>
      client.databases.createIfNotExists({ id: DATABASE_ID })
    );
    _database = database;
  }
  return _database;
}

/**
 * Returns a container reference by name, creating it if it does not exist.
 * @param {string} name — must be one of the known container IDs
 */
async function getContainer(name) {
  if (_containers[name]) {
    return _containers[name];
  }

  const db = await getDatabase();

  // Look up the container definition to get the correct partition key / TTL
  const definition = CONTAINERS.find((c) => c.id === name);
  if (!definition) {
    throw new Error(`Unknown container: ${name}`);
  }

  const containerDef = {
    id: definition.id,
    partitionKey: { paths: [definition.partitionKey] },
  };

  if (definition.defaultTtl !== undefined) {
    containerDef.defaultTtl = definition.defaultTtl;
  }

  const { container } = await withRetry(() =>
    db.containers.createIfNotExists(containerDef)
  );
  _containers[name] = container;
  return container;
}

/**
 * Initialises the database and all containers on startup.
 * Safe to call multiple times.
 */
async function initialize() {
  console.log('Initializing Cosmos DB...');

  await getDatabase();
  console.log(`  Database "${DATABASE_ID}" ready.`);

  for (const def of CONTAINERS) {
    await getContainer(def.id);
    console.log(`  Container "${def.id}" ready.`);
  }

  console.log('Cosmos DB initialization complete.');
}

module.exports = {
  getClient,
  getDatabase,
  getContainer,
  initialize,
  withRetry,
};
