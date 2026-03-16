const ALLOWED_GRAPH_PATHS = [
  /^\/(v1\.0|beta)\/deviceManagement\/managedDevices(\/.*)?$/,
  /^\/v1\.0\/deviceManagement\/deviceCompliancePolicies(\/.*)?$/,
  /^\/v1\.0\/deviceManagement\/deviceConfigurations(\/.*)?$/,
  /^\/v1\.0\/deviceManagement\/windowsAutopilotDeviceIdentities(\/.*)?$/,
  /^\/v1\.0\/deviceManagement\/deviceEnrollmentConfigurations(\/.*)?$/,
  /^\/v1\.0\/deviceManagement\/deviceComplianceScripts(\/.*)?$/,
  /^\/v1\.0\/deviceManagement\/scripts(\/.*)?$/,
  /^\/v1\.0\/users(\/.*)?$/,
  /^\/v1\.0\/groups(\/.*)?$/,
  /^\/v1\.0\/applications(\/.*)?$/,
  /^\/v1\.0\/identity\/conditionalAccess(\/.*)?$/,
  /^\/v1\.0\/deviceAppManagement(\/.*)?$/,
  /^\/v1\.0\/security(\/.*)?$/,
  /^\/beta\/deviceManagement(\/.*)?$/,
  /^\/v1\.0\/subscribedSkus$/,
  /^\/v1\.0\/organization$/,
];

const ALLOWED_ODATA_PARAMS = [
  '$count', '$filter', '$select', '$expand', '$top', '$skip', '$orderby'
];

const TENANT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function validateGraphPath(path) {
  if (!path || typeof path !== 'string') return false;
  // Strip query string for path matching, validate params separately
  const [pathname, query] = path.split('?');
  const pathValid = ALLOWED_GRAPH_PATHS.some((re) => re.test(pathname));
  if (!pathValid) return false;
  // Validate OData query params if present
  if (query) {
    const params = new URLSearchParams(query);
    for (const key of params.keys()) {
      if (!ALLOWED_ODATA_PARAMS.includes(key)) return false;
    }
  }
  return true;
}

function validateTenantId(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') return false;
  return TENANT_ID_REGEX.test(tenantId);
}

function stripDangerousKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripDangerousKeys);
  const cleaned = {};
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) continue;
    cleaned[key] = stripDangerousKeys(obj[key]);
  }
  return cleaned;
}

function sanitizeBody(body) {
  if (body === undefined || body === null) return null;
  try {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_SIZE) return null;
    const parsed = typeof body === 'string' ? JSON.parse(raw) : body;
    return stripDangerousKeys(parsed);
  } catch {
    return null;
  }
}

function validateRequest(options = {}) {
  const { params: requiredParams = [], body: validateBody = false, graphPath = false } = options;

  return (request, context) => {
    // Validate required params
    for (const param of requiredParams) {
      const value = request.params?.[param] || request.query?.get?.(param);
      if (!value) {
        return { status: 400, jsonBody: { error: `Missing required parameter: ${param}` } };
      }
      // Auto-validate tenantId when it appears as a required param
      if (param === 'tenantId' && !validateTenantId(value)) {
        return { status: 400, jsonBody: { error: 'Invalid tenantId format — expected a GUID' } };
      }
    }

    // Validate graph path
    if (graphPath) {
      const path = request.params?.path || request.query?.get?.('path');
      if (!path || !validateGraphPath(path)) {
        return { status: 400, jsonBody: { error: 'Disallowed or invalid Graph API path' } };
      }
    }

    // Validate and sanitize body
    if (validateBody) {
      const sanitized = sanitizeBody(request.body);
      if (request.body !== undefined && request.body !== null && sanitized === null) {
        return { status: 400, jsonBody: { error: 'Invalid or oversized request body' } };
      }
      request.sanitizedBody = sanitized;
    }

    return null; // Validation passed
  };
}

module.exports = {
  ALLOWED_GRAPH_PATHS,
  ALLOWED_ODATA_PARAMS,
  validateGraphPath,
  validateTenantId,
  sanitizeBody,
  validateRequest,
};
