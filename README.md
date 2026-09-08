# bettergoals builder

The build experience for [bettergoals.ai](https://bettergoals.ai) — deployed at **build.bettergoals.ai**, kept separate from the product so the community tool stays clean and the build controls stay secured.

## What it does

- Live kanban board of product ideas (GitHub issues on [`bettergoals/bettergoals`](https://github.com/bettergoals/bettergoals), labels `idea`/`discussing`/`doing`/`done` = columns)
- 👍 reactions are endorsement votes (voting itself happens on GitHub, tied to identity)
- With the facilitator passcode, cards can be dragged between columns — moving one to **Doing** labels the issue, which triggers Claude Code (via GitHub Actions in the product repo) to build it and open a PR against the product's `preview` branch
- Moving a card to **Done** ships it: the board merges the linked PR (in whichever repo it landed), promotes `preview` to `main` when the product changed, and closes the issue — Vercel deploys, so the site updates with no further clicks

## Environment variables (Vercel)

- `GITHUB_TOKEN` — fine-grained PAT on **both** `bettergoals/bettergoals` and `bettergoals/build-bettergoals`: Issues read/write, Contents read/write, Pull requests read/write. Contents and Pull requests write are what let a move to **Done** merge the idea's PR and promote `preview` to `main` (production); with a read-only token the board still works but Done fails with a clear message
- `BOARD_PASSCODE` — facilitator passcode that unlocks card moves
- `GITHUB_REPO` — defaults to `bettergoals/bettergoals`
- `NEXT_PUBLIC_SITE_URL` — defaults to `https://build.bettergoals.ai`

## Development

```bash
npm install
npm run dev:live   # injects your gh CLI token, passcode "local-dev", port 3001
```

Supported by [TeamForm](https://teamform.co) and [Sooner Safer Happier](https://soonersaferhappier.com).
