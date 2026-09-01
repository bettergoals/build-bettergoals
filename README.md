# bettergoals builder

The build experience for [bettergoals.ai](https://bettergoals.ai) — deployed at **build.bettergoals.ai**, kept separate from the product so the community tool stays clean and the build controls stay secured.

## What it does

- Live kanban board of product ideas (GitHub issues on [`bettergoals/bettergoals`](https://github.com/bettergoals/bettergoals), labels `idea`/`discussing`/`doing`/`done` = columns)
- 👍 reactions are endorsement votes (voting itself happens on GitHub, tied to identity)
- With the facilitator passcode, cards can be dragged between columns — moving one to **Doing** labels the issue, which triggers Claude Code (via GitHub Actions in the product repo) to build it and open a PR against the product's `preview` branch

## Environment variables (Vercel)

- `GITHUB_TOKEN` — fine-grained PAT for the product repo: Issues read/write, Contents read
- `BOARD_PASSCODE` — facilitator passcode that unlocks card moves
- `GITHUB_REPO` — defaults to `bettergoals/bettergoals`
- `NEXT_PUBLIC_SITE_URL` — defaults to `https://build.bettergoals.ai`

## Development

```bash
npm install
npm run dev:live   # injects your gh CLI token, passcode "local-dev", port 3001
```

Supported by [TeamForm](https://teamform.co) and [Sooner Safer Happier](https://soonersaferhappier.com).
