import { cookies } from "next/headers";
import BoardView from "@/components/BoardView";
import { BUILDER_COOKIE, passcodeValid } from "@/lib/builder";
import { fetchBoard } from "@/lib/github";

export const dynamic = "force-dynamic";

export default async function BuilderBoard() {
  const [board, cookieStore] = await Promise.all([fetchBoard(), cookies()]);
  const unlocked = passcodeValid(cookieStore.get(BUILDER_COOKIE)?.value);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Ideas board</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Every card is a GitHub issue on the product repo. Open one to vote with a
        👍 or join the discussion. With the facilitator passcode, drag an endorsed
        idea to <strong>Doing</strong> — Claude Code builds it into{" "}
        <a href="https://bettergoals.ai" className="underline underline-offset-2">bettergoals.ai</a>{" "}
        and opens a pull request for the community to review on preview.
      </p>
      <div className="mt-8">
        <BoardView initial={board} builder initialUnlocked={unlocked} />
      </div>
    </div>
  );
}
