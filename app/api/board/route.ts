import { NextResponse } from "next/server";
import { fetchBoard } from "@/lib/github";

// Always run the handler so the room sees votes and moves land live;
// the GitHub fetches inside fetchBoard are still data-cached for 15s.
export const dynamic = "force-dynamic";

export async function GET() {
  const board = await fetchBoard();
  return NextResponse.json(board, {
    headers: { "Cache-Control": "no-store" },
  });
}
