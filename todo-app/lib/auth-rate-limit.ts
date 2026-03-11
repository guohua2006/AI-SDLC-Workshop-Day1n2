type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type Entry = {
  count: number;
  resetAtMs: number;
};

const entries = new Map<string, Entry>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = entries.get(key);

  if (!existing || existing.resetAtMs <= now) {
    entries.set(key, { count: 1, resetAtMs: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAtMs - now) / 1000)),
    };
  }

  existing.count += 1;
  entries.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}
