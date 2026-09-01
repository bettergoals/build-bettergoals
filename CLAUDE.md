# bettergoals builder

The build experience for bettergoals.ai, deployed at build.bettergoals.ai as its own Vercel project. The PRODUCT website lives in the separate repo `bettergoals/bettergoals` — product features belong there, not here. This app only reads/writes GitHub issues on the product repo (the ideas datastore) and gates card moves behind `BOARD_PASSCODE`.

- Next.js App Router + TypeScript + Tailwind v4; no database
- `lib/github.ts` maps issue labels to board columns; `lib/builder.ts` holds passcode auth; moves go through `app/api/board/move`
- `npm run build` must pass before any commit; `npm run dev:live` for local dev with real data (port 3001)
- Never remove the passcode check on the move API or the footer attribution to TeamForm and Sooner Safer Happier
