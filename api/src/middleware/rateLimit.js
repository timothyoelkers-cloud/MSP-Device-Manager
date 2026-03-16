class RateLimiter {
  constructor({ windowMs = 60_000, maxRequests = 100 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.store = new Map();

    this._cleanupInterval = setInterval(() => this._cleanup(), 60_000);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let entry = this.store.get(key);

    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Sliding window: keep only timestamps within the current window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
    const remaining = Math.max(0, this.maxRequests - entry.timestamps.length);
    const resetAt = new Date(now + this.windowMs);

    if (entry.timestamps.length >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    entry.timestamps.push(now);
    return { allowed: true, remaining: remaining - 1, resetAt };
  }

  reset(key) {
    this.store.delete(key);
  }

  _cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) this.store.delete(key);
    }
  }
}

// Pre-configured limiters
const generalLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 100 });
const authLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });
const graphLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 60 });

/**
 * Rate limiting HOF for Azure Functions v4 handlers.
 * @param {RateLimiter} limiter
 * @returns {(handler: Function) => Function}
 */
function rateLimit(limiter) {
  return (handler) => {
    return async (request, context) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded
        ? forwarded.split(',')[0].trim()
        : request.headers.get('x-real-ip') || 'unknown';

      const { allowed, remaining, resetAt } = limiter.check(ip);

      if (!allowed) {
        const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
        return {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'Content-Type': 'application/json',
          },
          jsonBody: {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter,
          },
        };
      }

      const response = await handler(request, context);

      // Attach rate limit headers to the response
      const headers = response.headers || {};
      headers['X-RateLimit-Remaining'] = String(remaining);
      headers['X-RateLimit-Reset'] = resetAt.toISOString();

      return { ...response, headers: { ...response.headers, ...headers } };
    };
  };
}

module.exports = { RateLimiter, generalLimiter, authLimiter, graphLimiter, rateLimit };
