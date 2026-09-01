/**
 * Best-effort in-memory rate limiter (per serverless instance). Slows
 * brute-force attempts against the passcode and PIN endpoints; a durable
 * KV-backed limiter is planned alongside the voting slice. Documented in
 * SECURITY.md.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) buckets.clear();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

export function clientKey(req: Request, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${scope}:${ip}`;
}
