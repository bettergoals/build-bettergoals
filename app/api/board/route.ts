import { type NextRequest, NextResponse } from "next/server";
import { fetchBoard } from "@/lib/github";
import { clientKey, rateLimit } from "@/lib/ratelimit";

// Always run the handler so the room sees votes and moves land live;
// the GitHub fetches inside fetchBoard are still data-cached for 15s.
export const dynamic = "force-dynamic";

/**
 * The board the client polls. `?fresh=1` skips the shared 15s cache — the board
 * asks for it only after a human action (a card move, coming back to the tab,
 * pressing Refresh now), so it stays a handful of GitHub calls. It is capped
 * anyway: over the cap we quietly serve the cached board rather than erroring,
 * because a slightly stale board beats a broken one.
 */
export async function GET(req: NextRequest) {
  const fresh =
    new URL(req.url).searchParams.get("fresh") === "1" &&
    rateLimit(clientKey(req, "board-fresh"), 20, 60_000);
  const board = await fetchBoard({ fresh });
  return NextResponse.json(board, {
    headers: { "Cache-Control": "no-store" },
  });
}
