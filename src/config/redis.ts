import Redis from 'ioredis';
import config from './index';

// If REDIS_URL isn't configured (e.g. local dev without Redis installed), we fall back to a
// no-op cache so the rest of the app works exactly the same, just without caching.
const redisClient = config.redis_url
  ? new Redis(config.redis_url, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying - ioredis marks the connection as failed
        return Math.min(times * 200, 2000);
      },
    })
  : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis connection error:', err.message));
  redisClient.on('connect', () => console.log('✅ Redis connected'));
}

const DEFAULT_TTL_SECONDS = 60;

const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
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
    // ignore
  }
};

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
