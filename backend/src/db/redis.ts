import Redis from 'ioredis';

// Redis connection - optional, falls back to in-memory if not configured
let redisClient: Redis | null = null;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    // SECURITY: Enable TLS for rediss:// URLs (Railway uses TLS by default)
    const useTls = REDIS_URL.startsWith('rediss://');

    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Redis] Max retries reached, falling back to in-memory rate limiting');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000); // Exponential backoff
      },
      lazyConnect: true,
      ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection error:', err.message);
    });

    // Test connection
    redisClient.connect().catch((err) => {
      console.warn('[Redis] Failed to connect:', err.message);
      redisClient = null;
    });
  } catch (error) {
    console.warn('[Redis] Failed to initialize:', error);
    redisClient = null;
  }
} else {
  console.log('[Redis] REDIS_URL not configured, using in-memory rate limiting');
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}
