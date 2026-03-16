const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

function addSecurityHeaders(handler) {
  return async (request, context) => {
    const response = await handler(request, context);

    const existingHeaders = response.headers || {};
    const mergedHeaders = { ...SECURITY_HEADERS };

    for (const [key, value] of Object.entries(existingHeaders)) {
      mergedHeaders[key] = value;
    }

    return {
      ...response,
      headers: mergedHeaders
    };
  };
}

function addCorsHeaders(handler, allowedOrigins) {
  return async (request, context) => {
    const origin = request.headers.get('Origin') || request.headers.get('origin');

    const corsHeaders = {};
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
      corsHeaders['Access-Control-Max-Age'] = '3600';
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        body: null,
        headers: { ...corsHeaders }
      };
    }

    const response = await handler(request, context);

    const existingHeaders = response.headers || {};
    const mergedHeaders = { ...corsHeaders };

    for (const [key, value] of Object.entries(existingHeaders)) {
      mergedHeaders[key] = value;
    }

    return {
      ...response,
      headers: mergedHeaders
    };
  };
}

module.exports = {
  SECURITY_HEADERS,
  addSecurityHeaders,
  addCorsHeaders
};
