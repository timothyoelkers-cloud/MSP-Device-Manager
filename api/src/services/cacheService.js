// Redis Cache Service
// Provides high-performance caching for Graph API responses and session data

const { createClient } = require('redis');

let client = null;
let connected = false;

const DEFAULT_TTL = 300; // 5 minutes

async function getClient() {
    if (client && connected) return client;

    const redisUrl = process.env.REDIS_CONNECTION_STRING;
    if (!redisUrl) {
        // Fallback: in-memory cache for local development
        return null;
    }

    try {
        client = createClient({ url: `rediss://${redisUrl}` });
        client.on('error', (err) => {
            console.error('Redis error:', err.message);
            connected = false;
        });
        await client.connect();
        connected = true;
        return client;
    } catch (err) {
        console.warn('Redis unavailable, using no-cache fallback:', err.message);
        return null;
    }
}

// In-memory fallback for local dev
const memCache = new Map();

async function get(key) {
    const redis = await getClient();
    if (redis) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
    }
    const entry = memCache.get(key);
    if (entry && entry.expires > Date.now()) return entry.value;
    memCache.delete(key);
    return null;
}

async function set(key, value, ttl = DEFAULT_TTL) {
    const redis = await getClient();
    if (redis) {
        await redis.setEx(key, ttl, JSON.stringify(value));
        return;
    }
    memCache.set(key, { value, expires: Date.now() + ttl * 1000 });
}

async function del(key) {
    const redis = await getClient();
    if (redis) {
        await redis.del(key);
        return;
    }
    memCache.delete(key);
}

async function invalidatePattern(pattern) {
    const redis = await getClient();
    if (redis) {
        const keys = [];
        for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
            keys.push(key);
        }
        if (keys.length > 0) await redis.del(keys);
        return;
    }
    // In-memory fallback: simple prefix match
    const prefix = pattern.replace('*', '');
    for (const key of memCache.keys()) {
        if (key.startsWith(prefix)) memCache.delete(key);
    }
}

module.exports = { get, set, del, invalidatePattern };
