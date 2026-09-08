import { BUILD_REPO, PREVIEW_BRANCH, PRODUCTION_BRANCH, SITE } from "./config";
import { fetchIdeaPulls, type IdeaPR } from "./github";

/**
 * Shipping an idea = making it live for real users, not just changing a label.
 *
 * Moving a card to Done runs this: the idea's pull request is merged, and if
 * it landed on the product's `preview` branch that branch is promoted to
 * `main` (production) too. Vercel deploys `main` on push, so the website
 * updates on its own — nobody has to click anything on GitHub.
 */

export class ShipError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export type ShipResult = {
  /** the idea's own pull request, now merged */
  pr: IdeaPR;
  /** true when the code is on a production branch after this call */
  live: boolean;
  /** the preview -> main promotion PR, when one was needed */
  promotion?: { url: string; number: number };
  /** which site deploys as a result */
  site: "bettergoals.ai" | "build.bettergoals.ai";
};

type Headers = Record<string, string>;

type PullDetail = {
  number: number;
  html_url: string;
  state: "open" | "closed";
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  base: { ref: string };
  head: { ref: string; sha: string };
};

const api = (path: string) => `https://api.github.com${path}`;

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    return data.message ? ` — ${data.message}` : "";
  } catch {
    return "";
  }
}

function permissionHint(status: number, repo: string): string {
  if (status === 403 || status === 404) {
    return (
      ` The board's GITHUB_TOKEN needs "Contents: read & write" and "Pull requests: read & write" ` +
      `on ${repo} to merge for you.`
    );
  }
  return "";
}

/** Fetch a PR, waiting briefly for GitHub to finish computing mergeability. */
async function getPull(repo: string, number: number, headers: Headers): Promise<PullDetail> {
  let pull: PullDetail | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(api(`/repos/${repo}/pulls/${number}`), { headers, cache: "no-store" });
    if (!res.ok) {
      throw new ShipError(`Could not read pull request #${number} on ${repo} (GitHub ${res.status}).`);
    }
    pull = (await res.json()) as PullDetail;
    if (pull.merged || pull.state === "closed" || pull.mergeable !== null) break;
    await new Promise((r) => setTimeout(r, 800));
  }
  return pull!;
}

async function mergePull(
  repo: string,
  pull: PullDetail,
  method: "squash" | "merge",
  headers: Headers,
  title?: string
): Promise<void> {
  const res = await fetch(api(`/repos/${repo}/pulls/${pull.number}/merge`), {
    method: "PUT",
    headers,
    body: JSON.stringify({
      merge_method: method,
      sha: pull.head.sha,
      ...(title ? { commit_title: title } : {}),
    }),
  });
  if (res.ok) return;
  const detail = await readError(res);
  if (res.status === 405 || res.status === 409) {
    throw new ShipError(
      `Pull request #${pull.number} on ${repo} cannot be merged right now${detail}. ` +
        `Resolve it on GitHub (conflicts or a moving branch) and move the card again.`,
      409
    );
  }
  throw new ShipError(
    `GitHub refused to merge #${pull.number} on ${repo} (${res.status})${detail}.${permissionHint(res.status, repo)}`,
    res.status === 403 ? 403 : 502
  );
}

/** Land `preview` on `main` through a pull request — production is protected against direct pushes. */
async function promotePreview(
  headers: Headers,
  ideaTitle: string,
  ideaNumber: number
): Promise<{ url: string; number: number } | null> {
  const repo = SITE.repo;
  const compareRes = await fetch(api(`/repos/${repo}/compare/${PRODUCTION_BRANCH}...${PREVIEW_BRANCH}`), {
    headers,
    cache: "no-store",
  });
  if (!compareRes.ok) {
    throw new ShipError(`Could not compare ${PREVIEW_BRANCH} with ${PRODUCTION_BRANCH} (GitHub ${compareRes.status}).`);
  }
  const compare = (await compareRes.json()) as { ahead_by: number };
  if (compare.ahead_by === 0) return null; // nothing to promote — already live

  const owner = repo.split("/")[0];
  const existingRes = await fetch(
    api(`/repos/${repo}/pulls?state=open&base=${PRODUCTION_BRANCH}&head=${owner}:${PREVIEW_BRANCH}&per_page=1`),
    { headers, cache: "no-store" }
  );
  let promotion: PullDetail | null = null;
  if (existingRes.ok) {
    const existing = (await existingRes.json()) as PullDetail[];
    if (existing[0]) promotion = existing[0];
  }
  if (!promotion) {
    const createRes = await fetch(api(`/repos/${repo}/pulls`), {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `Promote preview to production: ${ideaTitle}`,
        head: PREVIEW_BRANCH,
        base: PRODUCTION_BRANCH,
        body:
          `Opened by the build board when “${ideaTitle}” (#${ideaNumber}) was moved to Done.\n\n` +
          `Merging puts everything on \`${PREVIEW_BRANCH}\` live on bettergoals.ai.`,
      }),
    });
    if (!createRes.ok) {
      const detail = await readError(createRes);
      throw new ShipError(
        `Merged the idea into ${PREVIEW_BRANCH}, but could not open the promotion to ${PRODUCTION_BRANCH} ` +
          `(GitHub ${createRes.status})${detail}.${permissionHint(createRes.status, repo)}`,
        createRes.status === 403 ? 403 : 502
      );
    }
    promotion = (await createRes.json()) as PullDetail;
  }
  // Re-read so the merge carries the branch's current head sha.
  promotion = await getPull(repo, promotion.number, headers);
  await mergePull(repo, promotion, "merge", headers, `Promote preview to production (#${promotion.number})`);
  return { url: promotion.html_url, number: promotion.number };
}

/**
 * Ship the idea behind issue `number`. Returns null when no pull request is
 * linked (there is nothing to ship — the caller may still relabel).
 */
export async function shipIdea(number: number, title: string, headers: Headers): Promise<ShipResult | null> {
  const linked = (await fetchIdeaPulls(headers, { cache: "no-store" })).get(number);
  if (!linked) return null;

  const repo = linked.repo;
  const site: ShipResult["site"] = repo === BUILD_REPO ? "build.bettergoals.ai" : "bettergoals.ai";
  const pull = await getPull(repo, linked.number, headers);

  if (pull.state === "closed" && !pull.merged) {
    throw new ShipError(
      `Pull request #${pull.number} on ${repo} was closed without merging, so there is nothing to ship. ` +
        `Reopen it on GitHub, or move the card back to Doing to have it rebuilt.`,
      409
    );
  }

  if (!pull.merged) {
    if (pull.mergeable === false) {
      throw new ShipError(
        `Pull request #${pull.number} on ${repo} has conflicts with ${pull.base.ref}. ` +
          `Resolve them on GitHub and move the card again.`,
        409
      );
    }
    await mergePull(repo, pull, "squash", headers);
  }

  const pr: IdeaPR = { ...linked, state: "merged", base: pull.base.ref };

  // Product PRs land on `preview`; production only changes once preview is promoted.
  if (repo === SITE.repo && pull.base.ref === PREVIEW_BRANCH) {
    const promotion = await promotePreview(headers, title, number);
    return { pr, live: true, promotion: promotion ?? undefined, site };
  }

  // Board PRs (and any product PR opened straight against main) are production already.
  return { pr, live: pull.base.ref === PRODUCTION_BRANCH, site };
}
