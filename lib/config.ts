export const SITE = {
  name: "bettergoals builder",
  tagline: "Where the community decides what gets built.",
  description:
    "The build experience for bettergoals.ai — propose ideas, endorse them, and move them to Doing to have Claude Code build them into the product.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://build.bettergoals.ai",
  /** The PRODUCT repo — ideas live as issues there and Claude builds into it. */
  repo: process.env.GITHUB_REPO ?? "bettergoals/bettergoals",
};

export const PRODUCT_URL = "https://bettergoals.ai";
export const PREVIEW_URL = "https://preview.bettergoals.ai";
export const REPO_URL = `https://github.com/${SITE.repo}`;
export const NEW_IDEA_URL = `${REPO_URL}/issues/new?template=idea.yml`;

/** 👍 votes needed before an idea counts as endorsed by the group */
export const ENDORSE_THRESHOLD = 3;
