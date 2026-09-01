import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "bg_session";
export const OTP_COOKIE = "bg_otp";
const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type Session = { email: string; name: string; exp: number };

/** Email sign-in ships dark until both env vars are configured. */
export function authEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.SESSION_SECRET);
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return s;
}

function mac(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function macValid(payload: string, candidate: string): boolean {
  const a = Buffer.from(mac(payload));
  const b = Buffer.from(candidate);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Stateless pending-PIN token: carries email + expiry + an HMAC binding them to the code. */
export function createOtpToken(email: string, pin: string): string {
  const exp = Date.now() + OTP_TTL_MS;
  const payload = `${email}|${exp}`;
  return Buffer.from(JSON.stringify({ email, exp, mac: mac(`otp|${payload}|${pin}`) })).toString("base64url");
}

export function verifyOtpToken(token: string, pin: string): string | null {
  try {
    const { email, exp, mac: m } = JSON.parse(Buffer.from(token, "base64url").toString()) as {
      email: string;
      exp: number;
      mac: string;
    };
    if (!email || !exp || Date.now() > exp) return null;
    if (!/^\d{6}$/.test(pin)) return null;
    return macValid(`otp|${email}|${exp}|${pin}`, m) ? email : null;
  } catch {
    return null;
  }
}

export function createSessionToken(email: string, name: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${email}|${name}|${exp}`;
  return Buffer.from(JSON.stringify({ email, name, exp, mac: mac(`session|${payload}`) })).toString("base64url");
}

export function readSessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  try {
    const { email, name, exp, mac: m } = JSON.parse(Buffer.from(token, "base64url").toString()) as Session & {
      mac: string;
    };
    if (!email || !exp || Date.now() > exp) return null;
    return macValid(`session|${email}|${name}|${exp}`, m) ? { email, name, exp } : null;
  } catch {
    return null;
  }
}

/** Send the PIN via Resend's REST API (no SDK dependency). */
export async function sendPinEmail(email: string, pin: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? "bettergoals <login@bettergoals.ai>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${pin} is your bettergoals sign-in code`,
      text: `Your bettergoals sign-in code is ${pin}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    }),
  });
  return res.ok;
}
