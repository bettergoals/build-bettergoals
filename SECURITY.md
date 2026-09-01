# Security posture — build.bettergoals.ai

The full security posture and SOC 2 control mapping for the bettergoals platform lives in the product repo: [bettergoals/bettergoals → SECURITY.md](https://github.com/bettergoals/bettergoals/blob/main/SECURITY.md).

Controls implemented in this app:

- Facilitator passcode gates all board writes: constant-time comparison, httpOnly/secure/SameSite cookie, 12h expiry, per-IP rate limiting on unlock attempts.
- Email sign-in (dark until `RESEND_API_KEY` + `SESSION_SECRET` are set): stateless HMAC-bound one-time PINs, signed 30-day httpOnly sessions, per-IP rate limiting on PIN request and verify, no PII persisted server-side.
- Security headers on every response (HSTS preload, nosniff, frame DENY, strict referrer, restrictive permissions).
- GitHub access via a fine-grained PAT (Issues RW + Contents R on the product repo only), server-side env var only.

Report a vulnerability via a private security advisory on this repo.
