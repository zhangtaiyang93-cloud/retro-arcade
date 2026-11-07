# Owner review and Vercel release

This is a Next.js app. Deploy the repository root, including `public/art/` and
`public/audio/`. No database, API key, paid service or environment variable is
required. Progress is stored in each browser's localStorage; a new deployment
domain has its own save. This remains a classroom prototype, not a secured
multi-user economy.

## If this repository is already connected to Vercel

1. Confirm the Vercel project's Git production branch is `main` and the root
   directory is the repository root (leave Root Directory blank).
2. Review this PR and its `Tests and production build` check. Review the Vercel
   Preview deployment if the existing integration generates one.
3. Approve and merge the PR. A merge into the configured production branch
   triggers Vercel's production deployment. Approval alone does not merge code.
4. Wait for Vercel to report Ready, then open the project's production URL.

## One-time connection if Vercel is not connected yet

The repository owner must import `zhangtaiyang93-cloud/retro-arcade` into their
own Vercel account/team and grant that integration access to this repository.
Do not create a second project if one already exists.

Use these settings:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Root Directory | Repository root / blank |
| Node.js | 24.x (also declared in package.json) |
| Install Command | npm ci |
| Build Command | npm run build |
| Output Directory | Next.js default; do not set `out` |
| Environment Variables | None required |
| Production Branch | main |

`vercel.json` supplies the framework and build commands. Vercel project ownership,
Git authorization and production-branch selection are account settings, not
something this PR can configure. No Vercel token is required in GitHub Actions.

Official guides: https://vercel.com/docs/git and
https://vercel.com/docs/frameworks/full-stack/nextjs

## Review smoke test

- Open `/`. The English title and Eric Skiff music credit are visible.
- START A NEW NIGHT plays the opening. ENTER ARCADE starts the 30-minute clock.
- Walk, inspect a cabinet, confirm entry, play, and return to the hall.
- Ordinary games are free; NEON LUCK charges 50 tickets per spin.
- Each hidden pickup pays once per run and stops highlighting afterward.
- Redeem a prize, refresh, and confirm tickets, prizes and time persist.
- Toggle MUSIC and SFX independently. The recording continues across routes.
- EXIT asks for confirmation and settles the run; `/storyboard` previews all
  endings without awarding tickets. An active run's clock continues during previews.

The music is Eric Skiff's “Underclocked (underunderclocked mix),” CC BY 4.0.
Keep the in-game attribution and `public/audio/CREDITS.txt`. Artwork generation
prompts are retained in `public/art/generation-prompts.txt`.

## Local verification and rollback

Use Node.js 24, then `npm ci`, `npm test`, `npm run build`, and `npm start`.
GitHub Actions repeats tests, a production dependency audit and the build on PRs
and on `main`. Owners can make that check required in repository branch rules.

If a release has a problem, use Vercel's deployment rollback UI and revert the
merge through a new PR. Do not force-push `main` or overwrite other teammates'
branches. Browser saves are not a shared database and should not be cleared
as part of deployment.
