import { type NextRequest, NextResponse } from "next/server";
import { authEnabled, readSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = authEnabled() ? readSessionToken(req.cookies.get(SESSION_COOKIE)?.value) : null;
  return NextResponse.json(
    {
      enabled: authEnabled(),
      signedIn: Boolean(session),
      name: session?.name ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
