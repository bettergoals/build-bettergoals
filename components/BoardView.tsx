"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, BoardColumnKey, Idea } from "@/lib/github";
import { COLUMN_ORDER } from "@/lib/github";
import { ENDORSE_THRESHOLD, NEW_IDEA_URL } from "@/lib/config";

const COLUMN_ACCENT: Record<BoardColumnKey, string> = {
  idea: "border-t-ink/30",
  discussing: "border-t-safer",
  doing: "border-t-happier",
  done: "border-t-sooner",
  cancelled: "border-t-ink/15",
};

function elapsed(startedAt: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  return mins > 0 ? ` ${mins}m` : "";
}

function IdeaCard({
  idea,
  column,
  onMove,
  canMove,
}: {
  idea: Idea;
  column: BoardColumnKey;
  onMove: (idea: Idea, from: BoardColumnKey, to: BoardColumnKey) => void;
  canMove: boolean;
}) {
  const endorsed = idea.votes >= ENDORSE_THRESHOLD;
  const cancelled = column === "cancelled";
  return (
    <div
      draggable={canMove}
      onDragStart={(e) => {
        if (!canMove) return;
        e.dataTransfer.setData("text/plain", JSON.stringify({ number: idea.number, from: column }));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        canMove ? "cursor-grab active:cursor-grabbing" : ""
      } ${
        cancelled
          ? "border-ink/10 opacity-70"
          : endorsed
            ? "border-sooner/60 ring-1 ring-sooner/30"
            : "border-ink/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={idea.url}
          target="_blank"
          rel="noreferrer"
          className={`text-sm font-semibold leading-snug hover:underline ${
            cancelled ? "text-ink-soft line-through decoration-ink/40" : ""
          }`}
        >
          {idea.title}
        </a>
        <a
          href={idea.url}
          target="_blank"
          rel="noreferrer"
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
            endorsed ? "bg-sooner/15 text-sooner" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
          }`}
          title="Vote with a 👍 reaction on the GitHub issue"
        >
          👍 {idea.votes}
        </a>
      </div>
      {idea.excerpt && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{idea.excerpt}</p>}
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
        {idea.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={idea.avatar} alt="" className="h-4 w-4 rounded-full" />
        ) : null}
        <span>@{idea.author}</span>
        <span>·</span>
        <a href={idea.url} target="_blank" rel="noreferrer" className="hover:underline">💬 {idea.comments}</a>
        {endorsed && <span className="font-semibold text-sooner">endorsed</span>}
        {idea.build && idea.build.status !== "failed" && (
          <a
            href={idea.build.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-happier/15 px-2 py-0.5 font-bold text-happier"
            title="Claude Code is building this — click to watch the run"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-happier opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-happier" />
            </span>
            building{elapsed(idea.build.startedAt)}
            {idea.build.tasksTotal ? ` · ${idea.build.tasksDone}/${idea.build.tasksTotal}` : ""}
          </a>
        )}
        {idea.build?.status === "failed" && !idea.pr && (
          <a
            href={idea.build.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-600"
            title="The build failed — click for logs"
          >
            build failed ↗
          </a>
        )}
        {idea.pr && (
          <a
            href={idea.pr.url}
            target="_blank"
            rel="noreferrer"
            className={`rounded-full px-2 py-0.5 font-bold ${
              idea.pr.state === "merged"
                ? "bg-sooner/15 text-sooner"
                : idea.pr.state === "open"
                  ? "bg-happier/15 text-happier"
                  : "bg-ink/10 text-ink-soft"
            }`}
            title={`Pull request #${idea.pr.number} (${idea.pr.state}) — review the build`}
          >
            {idea.pr.state === "merged" ? "PR ✓" : "PR ↗"}
          </a>
        )}
        {canMove && (
          <select
            aria-label="Move to column"
            value={column}
            onChange={(e) => onMove(idea, column, e.target.value as BoardColumnKey)}
            className="ml-auto rounded-md border border-ink/15 bg-chalk px-1 py-0.5 text-[11px] text-ink-soft"
          >
            {COLUMN_ORDER.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key === column ? "Move to…" : c.title}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function UnlockBar({ onUnlocked }: { onUnlocked: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/board/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Unlock failed");
      }
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-happier/40 bg-happier/10 px-4 py-3"
    >
      <span className="text-sm font-semibold">🛠️ Builder mode is locked</span>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Facilitator passcode"
        className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-sm"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={busy || !passcode}
        className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-chalk disabled:opacity-50"
      >
        Unlock
      </button>
      {error && <span className="text-sm font-medium text-red-600">{error}</span>}
    </form>
  );
}

export default function BoardView({
  initial,
  builder = false,
  initialUnlocked = false,
}: {
  initial: Board;
  builder?: boolean;
  initialUnlocked?: boolean;
}) {
  const [board, setBoard] = useState<Board>(initial);
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const canMove = builder && unlocked;
  const [dragOver, setDragOver] = useState<BoardColumnKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/board?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setBoard(await res.json());
    } catch {
      /* keep last good board */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const moveIdea = useCallback(
    async (idea: Idea, from: BoardColumnKey, to: BoardColumnKey) => {
      if (from === to) return;
      // Cancelling closes the GitHub issue, so ask before doing it.
      if (to === "cancelled") {
        const building = Boolean(idea.build && idea.build.status !== "failed");
        const confirmed = window.confirm(
          `Cancel “${idea.title}”?\n\n` +
            `It moves to Cancelled and issue #${idea.number} is closed as not planned. ` +
            `Move the card back to an active column to reopen it.` +
            (building
              ? `\n\nHeads up: a build is already in flight. Cancelling does not stop it — ` +
                `stop the GitHub Actions run too if you want it to halt.`
              : "")
        );
        if (!confirmed) return;
      }
      // optimistic update
      const nextState: Idea["state"] =
        to === "cancelled" ? "closed" : from === "cancelled" ? "open" : idea.state;
      setBoard((prev) => {
        const columns = { ...prev.columns };
        columns[from] = columns[from].filter((i) => i.number !== idea.number);
        columns[to] = [...columns[to], { ...idea, labels: [to], state: nextState }].sort(
          (a, b) => b.votes - a.votes
        );
        return { ...prev, columns };
      });
      try {
        const res = await fetch("/api/board/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: idea.number, to }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? `Move failed (${res.status})`);
        }
        if (to === "doing") showToast(`🤖 “${idea.title}” moved to Doing — Claude Code will pick it up.`);
        else if (to === "cancelled")
          showToast(`🛑 “${idea.title}” cancelled — issue #${idea.number} closed as not planned.`);
        else if (from === "cancelled")
          showToast(`↩️ “${idea.title}” is back in play — issue #${idea.number} reopened.`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Move failed — reverting.");
        refresh();
      }
    },
    [refresh, showToast]
  );

  const handleDrop = useCallback(
    (to: BoardColumnKey) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      try {
        const { number, from } = JSON.parse(e.dataTransfer.getData("text/plain")) as {
          number: number;
          from: BoardColumnKey;
        };
        const idea = board.columns[from]?.find((i) => i.number === number);
        if (idea) moveIdea(idea, from, to);
      } catch {
        /* not our payload */
      }
    },
    [board, moveIdea]
  );

  return (
    <div>
      {builder && !unlocked && <UnlockBar onUnlocked={() => setUnlocked(true)} />}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {board.source === "github" ? (
            <>
              Live from GitHub · {ENDORSE_THRESHOLD}+ 👍 = endorsed
              {canMove && <> · drag cards between columns</>}
            </>
          ) : (
            <span className="rounded-full bg-happier/15 px-3 py-1 font-medium text-happier">
              Demo data — connect the GitHub repo to go live
            </span>
          )}
        </p>
        <a
          href={NEW_IDEA_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-chalk hover:bg-ink-soft"
        >
          + Add an idea
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {COLUMN_ORDER.map(({ key, title, hint }) => (
          <section
            key={key}
            onDragOver={(e) => {
              if (!canMove) return;
              e.preventDefault();
              setDragOver(key);
            }}
            onDragLeave={() => setDragOver((d) => (d === key ? null : d))}
            onDrop={canMove ? handleDrop(key) : undefined}
            className={`rounded-2xl border border-t-4 bg-chalk p-3 transition ${COLUMN_ACCENT[key]} ${
              dragOver === key ? "border-ink/40 bg-ink/5" : "border-ink/10"
            }`}
          >
            <div className="mb-3 px-1">
              <h2 className="font-bold">
                {title} <span className="text-sm font-normal text-ink-soft">({board.columns[key].length})</span>
              </h2>
              <p className="text-xs text-ink-soft">{hint}</p>
            </div>
            <div className="flex min-h-16 flex-col gap-3">
              {board.columns[key].length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink/20 p-4 text-center text-xs text-ink-soft">
                  {canMove
                    ? key === "cancelled"
                      ? "Drop an idea here to cancel it"
                      : "Drop an idea here"
                    : "Nothing here yet"}
                </p>
              ) : (
                board.columns[key].map((idea) => (
                  <IdeaCard key={idea.number} idea={idea} column={key} onMove={moveIdea} canMove={canMove} />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-chalk shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
