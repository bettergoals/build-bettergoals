import { type NextRequest, NextResponse } from "next/server";
import {
  authEnabled,
  createSessionToken,
  OTP_COOKIE,
  SESSION_COOKIE,
  verifyOtpToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Email sign-in isn't enabled yet." }, { status: 501 });
  }
  let body: { pin?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const otpToken = req.cookies.get(OTP_COOKIE)?.value;
  if (!otpToken) {
    return NextResponse.json({ error: "Code expired — request a new one." }, { status: 401 });
  }
  const email = verifyOtpToken(otpToken, String(body.pin ?? ""));
  if (!email) {
    return NextResponse.json({ error: "Wrong or expired code." }, { status: 401 });
  }
  const name = String(body.name ?? "")
    .trim()
    .slice(0, 60);
  if (!name) {
    return NextResponse.json({ error: "Pick a display name." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, name, email });
  res.cookies.set(SESSION_COOKIE, createSessionToken(email, name), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  res.cookies.set(OTP_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
