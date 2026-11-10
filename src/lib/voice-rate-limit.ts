const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IP = 15;
const requests = new Map<string, { count: number; resetAt: number }>();

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function hasPersistentRateLimitConfig(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** Local fallback for a single process. Production must configure persistent Upstash KV. */
export async function enforceVoiceRateLimit(request: Request): Promise<boolean> {
  const persistentKvConfigured = hasPersistentRateLimitConfig();

  if (process.env.NODE_ENV === "production" && !persistentKvConfigured) return false;
  if (persistentKvConfigured) {
    try {
      const [{ Ratelimit }, { kv }] = await Promise.all([
        import("@upstash/ratelimit"),
        import("@vercel/kv"),
      ]);
      const limiter = new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_IP, "1 m"),
        prefix: "lingoswap:voice-api",
      });
      const { success } = await limiter.limit(requestIp(request));
      return success;
    } catch {
      return process.env.NODE_ENV !== "production" ? localLimit(requestIp(request)) : false;
    }
  }

  return localLimit(requestIp(request));
}

function localLimit(ip: string): boolean {
  const now = Date.now();
  const current = requests.get(ip);
  if (!current || current.resetAt <= now) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_IP) return false;
  current.count += 1;
  return true;
}
