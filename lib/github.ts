import { SITE } from "./config";

export type IdeaPR = { url: string; number: number; state: "open" | "merged" | "closed" };

export type IdeaBuild = {
  status: "queued" | "in_progress" | "failed";
  url: string;
  startedAt: string;
  /** live task progress parsed from Claude's tracking comment on the issue */
  tasksDone?: number;
  tasksTotal?: number;
};

export type Idea = {
  number: number;
  title: string;
  excerpt: string;
  url: string;
  votes: number;
  comments: number;
  author: string;
  avatar: string;
  labels: string[];
  state: "open" | "closed";
  updatedAt: string;
  pr?: IdeaPR | null;
  build?: IdeaBuild | null;
};

export type BoardColumnKey = "idea" | "discussing" | "doing" | "done" | "cancelled";

/** Columns where the idea's issue is closed on GitHub rather than open. */
export const CLOSED_COLUMNS: BoardColumnKey[] = ["done", "cancelled"];

export type Board = {
  columns: Record<BoardColumnKey, Idea[]>;
  source: "github" | "demo";
  fetchedAt: string;
};

export const COLUMN_ORDER: { key: BoardColumnKey; title: string; hint: string }[] = [
  { key: "idea", title: "Ideas", hint: "Anything goes — add yours" },
  { key: "discussing", title: "Discussing", hint: "Being shaped by the group" },
  { key: "doing", title: "Doing", hint: "Claude is building these" },
  { key: "done", title: "Done", hint: "Live on the site" },
  { key: "cancelled", title: "Cancelled", hint: "Stopped — not being built" },
];

type GitHubPull = {
  number: number;
  html_url: string;
  state: "open" | "closed";
  merged_at: string | null;
  body?: string | null;
  head: { ref: string };
};

/** Map issue number -> the PR Claude opened for it (branch `idea/N` or a closing keyword in the body). */
function mapPullsToIdeas(pulls: GitHubPull[]): Map<number, IdeaPR> {
  const map = new Map<number, IdeaPR>();
  for (const pr of pulls) {
    const nums = new Set<number>();
    const branchMatch = /^idea\/(\d+)$/.exec(pr.head.ref);
    if (branchMatch) nums.add(Number(branchMatch[1]));
    for (const m of (pr.body ?? "").matchAll(/(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s+#(\d+)/gi)) {
      nums.add(Number(m[1]));
    }
    const state: IdeaPR["state"] = pr.merged_at ? "merged" : pr.state;
    for (const n of nums) {
      // pulls arrive most-recently-updated first; keep the first match per issue
      if (!map.has(n)) map.set(n, { url: pr.html_url, number: pr.number, state });
    }
  }
  return map;
}

type GitHubRun = {
  name: string;
  display_title: string;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: string | null;
  html_url: string;
  run_started_at: string;
};

/** Map issue number -> its most recent build run (run-name "idea-N: title", falling back to title match). */
function mapRunsToIdeas(runs: GitHubRun[], numberByTitle: Map<string, number>): Map<number, IdeaBuild> {
  const map = new Map<number, IdeaBuild>();
  for (const run of runs) {
    const m = /^idea-(\d+):/.exec(run.name);
    const n = m ? Number(m[1]) : numberByTitle.get(run.display_title) ?? numberByTitle.get(run.name);
    if (n === undefined) continue;
    if (map.has(n)) continue; // runs arrive newest first; keep the latest per issue
    if (run.status === "completed") {
      // skipped = a non-doing label event; success is represented by the PR chip instead
      if (run.conclusion === "failure" || run.conclusion === "timed_out") {
        map.set(n, { status: "failed", url: run.html_url, startedAt: run.run_started_at });
      } else {
        map.set(n, null as unknown as IdeaBuild); // block older runs from surfacing
      }
    } else {
      map.set(n, {
        status: run.status === "queued" ? "queued" : "in_progress",
        url: run.html_url,
        startedAt: run.run_started_at,
      });
    }
  }
  for (const [n, v] of map) if (!v) map.delete(n);
  return map;
}

/** Parse "- [x] / - [ ]" counts from Claude's live tracking comment on an in-flight issue. */
async function fetchTaskProgress(
  issueNumber: number,
  headers: Record<string, string>
): Promise<{ done: number; total: number } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${SITE.repo}/issues/${issueNumber}/comments?per_page=100`,
      { headers, next: { revalidate: 15 } }
    );
    if (!res.ok) return null;
    const comments = (await res.json()) as { body?: string | null; user?: { type?: string } | null }[];
    for (let i = comments.length - 1; i >= 0; i--) {
      const body = comments[i].body ?? "";
      const done = (body.match(/- \[x\]/gi) ?? []).length;
      const open = (body.match(/- \[ \]/g) ?? []).length;
      if (done + open > 0) return { done, total: done + open };
    }
  } catch {
    /* progress is best-effort */
  }
  return null;
}

type GitHubIssue = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  state: "open" | "closed";
  comments: number;
  updated_at: string;
  pull_request?: unknown;
  user?: { login?: string; avatar_url?: string } | null;
  labels: ({ name?: string } | string)[];
  reactions?: { "+1"?: number };
};

function labelNames(issue: GitHubIssue): string[] {
  return issue.labels
    .map((l) => (typeof l === "string" ? l : l.name ?? ""))
    .filter(Boolean)
    .map((l) => l.toLowerCase());
}

function toIdea(issue: GitHubIssue): Idea {
  const body = (issue.body ?? "").replace(/[#>*_`\[\]]/g, "").replace(/\s+/g, " ").trim();
  return {
    number: issue.number,
    title: issue.title,
    excerpt: body.length > 180 ? body.slice(0, 177) + "…" : body,
    url: issue.html_url,
    votes: issue.reactions?.["+1"] ?? 0,
    comments: issue.comments,
    author: issue.user?.login ?? "someone",
    avatar: issue.user?.avatar_url ?? "",
    labels: labelNames(issue),
    state: issue.state,
    updatedAt: issue.updated_at,
  };
}

function columnFor(idea: Idea): BoardColumnKey {
  // Most-advanced label wins so an idea only appears in one column.
  // `cancelled` outranks everything: a cancelled idea keeps whatever stage
  // label it was cancelled from, but belongs in Cancelled.
  if (idea.labels.includes("cancelled")) return "cancelled";
  if (idea.labels.includes("done")) return "done";
  if (idea.labels.includes("doing")) return "doing";
  if (idea.labels.includes("discussing")) return "discussing";
  return "idea";
}

const DEMO_IDEAS: Partial<Record<BoardColumnKey, Partial<Idea>[]>> = {
  idea: [
    { number: 101, title: "Goal anti-patterns gallery", excerpt: "A wall of real (anonymised) bad goals and what makes them bad — output-fixation, vanity metrics, 47 KPIs per team.", votes: 2, author: "demo" },
    { number: 102, title: "ElevenLabs goal coach with live chalkboard", excerpt: "A voice agent that coaches you on writing better goals while sketching ideas in chalk on a shared blackboard for group jam sessions.", votes: 4, author: "demo" },
  ],
  discussing: [
    { number: 103, title: "Outcome vs output checker", excerpt: "Paste a goal, get instant feedback: is this an outcome or an output? Does it name a customer? Can you measure it sooner than year-end?", votes: 5, author: "demo" },
  ],
  doing: [
    { number: 104, title: "Better goals starter templates", excerpt: "Downloadable templates for OKRs and outcome hypotheses aligned to better value sooner safer happier.", votes: 6, author: "demo" },
  ],
  done: [
    { number: 105, title: "The bettergoals.ai site itself", excerpt: "This site — built live with the community, one endorsed idea at a time.", votes: 7, author: "demo" },
  ],
  cancelled: [
    { number: 106, title: "Gamified leaderboard of team OKR scores", excerpt: "Rank teams by how many key results they hit. Cancelled — scoring teams against each other pulls against better value sooner safer happier.", votes: 1, author: "demo" },
  ],
};

/** An empty bucket per column, derived from COLUMN_ORDER so new stages can't be missed. */
function emptyColumns(): Board["columns"] {
  const columns = {} as Board["columns"];
  for (const { key } of COLUMN_ORDER) columns[key] = [];
  return columns;
}

function demoBoard(): Board {
  const columns = emptyColumns();
  for (const { key } of COLUMN_ORDER) {
    columns[key] = (DEMO_IDEAS[key] ?? []).map((d) => ({
      number: d.number ?? 0,
      title: d.title ?? "",
      excerpt: d.excerpt ?? "",
      url: `https://github.com/${SITE.repo}/issues`,
      votes: d.votes ?? 0,
      comments: 0,
      author: d.author ?? "demo",
      avatar: "",
      labels: [key],
      state: CLOSED_COLUMNS.includes(key) ? "closed" : "open",
      updatedAt: new Date().toISOString(),
    }));
  }
  return { columns, source: "demo", fetchedAt: new Date().toISOString() };
}

export async function fetchBoard(): Promise<Board> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const [res, pullsRes, runsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${SITE.repo}/issues?state=all&per_page=100&sort=updated`, {
        headers,
        next: { revalidate: 15 },
      }),
      fetch(`https://api.github.com/repos/${SITE.repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`, {
        headers,
        next: { revalidate: 15 },
      }),
      fetch(
        `https://api.github.com/repos/${SITE.repo}/actions/workflows/build-endorsed-idea.yml/runs?per_page=30`,
        { headers, next: { revalidate: 15 } }
      ),
    ]);
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const issues = (await res.json()) as GitHubIssue[];
    const prByIssue = pullsRes.ok
      ? mapPullsToIdeas((await pullsRes.json()) as GitHubPull[])
      : new Map<number, IdeaPR>();
    const numberByTitle = new Map(issues.filter((i) => !i.pull_request).map((i) => [i.title, i.number]));
    const buildByIssue = runsRes.ok
      ? mapRunsToIdeas(
          ((await runsRes.json()) as { workflow_runs: GitHubRun[] }).workflow_runs ?? [],
          numberByTitle
        )
      : new Map<number, IdeaBuild>();

    const columns = emptyColumns();
    for (const raw of issues) {
      if (raw.pull_request) continue;
      const idea = toIdea(raw);
      // closed issues only show if explicitly done or cancelled
      if (idea.state === "closed" && !idea.labels.includes("done") && !idea.labels.includes("cancelled"))
        continue;
      idea.pr = prByIssue.get(idea.number) ?? null;
      idea.build = buildByIssue.get(idea.number) ?? null;
      columns[columnFor(idea)].push(idea);
    }

    // live task progress for the (few) builds currently in flight
    await Promise.all(
      [...columns.doing, ...columns.discussing].map(async (idea) => {
        if (idea.build && idea.build.status !== "failed") {
          const progress = await fetchTaskProgress(idea.number, headers);
          if (progress) {
            idea.build.tasksDone = progress.done;
            idea.build.tasksTotal = progress.total;
          }
        }
      })
    );
    for (const { key } of COLUMN_ORDER) columns[key].sort((a, b) => b.votes - a.votes);
    return { columns, source: "github", fetchedAt: new Date().toISOString() };
  } catch {
    return demoBoard();
  }
}
