import { NextResponse } from "next/server";
import { authEnabled, createOtpToken, generatePin, normalizeEmail, OTP_COOKIE, sendPinEmail } from "@/lib/auth";

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Email sign-in isn't enabled yet." }, { status: 501 });
  }
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });

  const pin = generatePin();
  const sent = await sendPinEmail(email, pin);
  if (!sent) return NextResponse.json({ error: "Couldn't send the code — try again." }, { status: 502 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OTP_COOKIE, createOtpToken(email, pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
