import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Max requests per window */
  limit?: number;
  /** Window duration in seconds */
  windowSeconds?: number;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

/**
 * In-memory rate limiter for Next.js API routes.
 * NOTE: For serverless deployments (Vercel), replace with @upstash/ratelimit
 * for cross-instance persistence.
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const { limit = 10, windowSeconds = 60 } = options;

  return function checkRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
    const ip = getClientIp(req);
    const key = `${req.url || ''}:${ip}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }

    entry.count++;

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many requests. Try again later.' });
      return false;
    }

    return true;
  };
}

// Pre-configured limiters for common use cases
export const apiLimiter = rateLimit({ limit: 30, windowSeconds: 60 });
export const authLimiter = rateLimit({ limit: 5, windowSeconds: 60 });
export const emailLimiter = rateLimit({ limit: 3, windowSeconds: 60 });
