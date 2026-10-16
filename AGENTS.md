<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Community edition agent instructions

Read `README.md`, `docs/SETUP.md`, `docs/USER-GUIDE.md`, and `docs/AGENT-GUIDE.md` before setup or modification.

- This is a clean, independent installation template. Never retrieve or copy a private upstream repository, its Git history, production environment, customer records, tokens, or research captures.
- Each deployment uses its owner's Supabase project, Google OAuth client, AI Gateway, and Vercel project. Check the linked project before every cloud mutation.
- Analysis targets are stored in `seo_brands` through the UI. Do not hardcode a user's company or website in source or migrations.
- `APP_URL` is the tool's fixed origin, not the analyzed website. OAuth must never trust incoming Host headers for redirect destinations.
- This is a single-team workspace, not a multi-tenant SaaS. Do not promise customer isolation within one deployment.
- Preserve membership checks, RLS, encrypted token storage, secret-based worker authentication, domain guards, SSRF protections, quotas, and measurement provenance.
- Do not auto-enroll arbitrary Auth users, expose service-role keys, disable RLS, or populate fake production data to make the UI appear functional.
- Read installed Next.js and AI SDK documentation before API changes. Use the lockfile.
- Never print secret values or commit `.env*` except `.env.example`. Do not load another checkout's `.env.local` for tests.
- Test meaningful changed boundaries. Report local tests, build, browser behavior, remote deployment, and live collection separately.
- Do not claim a scheduled run succeeded from a manual run or claim data receipt from authentication alone.
- Do not alter a user's analyzed website or publish generated content without authorization for that destination.
