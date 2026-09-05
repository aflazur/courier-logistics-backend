import Redis from 'ioredis';
import config from './index';

// If REDIS_URL isn't configured (e.g. local dev without Redis installed), we fall back to a
// no-op cache so the rest of the app works exactly the same, just without caching.
const redisClient = config.redis_url ? new Redis(config.redis_url) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis connection error:', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));
}

const DEFAULT_TTL_SECONDS = 60;

const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null; // cache errors should never break a request
  }
};

const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> => {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // ignore - caching is a performance optimization, not a correctness requirement
  }
};

// Deletes every key matching a prefix (e.g. "hubs:*") - used to invalidate stale cache
// entries whenever the underlying data changes (a hub is created/updated/deleted, etc).
const cacheInvalidate = async (pattern: string): Promise<void> => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(...keys);
  } catch {
    // ignore
  }
};

export { redisClient, cacheGet, cacheSet, cacheInvalidate };
