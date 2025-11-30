# Crowdiant AI - Project Context

> Quick reference for AI assistants. Read this first before making changes.

## Project Overview

**Crowdiant** is a restaurant operating system with express checkout, POS, and trust-based customer management. Built with the T3 stack.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.8
- **Database:** PostgreSQL + Prisma 6.6
- **Auth:** NextAuth 5 (beta) with credentials + OAuth
- **API:** tRPC 11
- **Styling:** Tailwind CSS 4
- **Hosting:** Vercel (free tier)
- **CI:** GitHub Actions

## Current State (as of 2025-11-30)

- **Epic 1:** Complete (Foundation)
- **Epic 2 Story 2.1:** Complete (Venue Registration)
- **Production:** https://crowdiant-ai.vercel.app
- **CI:** Green ✅

## Development Workflow

### Local Setup
```bash
pnpm install
cp .env.example .env  # Then fill in values
pnpm db:push          # Push schema to local DB
pnpm dev              # Start dev server
```

### Before Pushing
```bash
pnpm lint        # ESLint on src/
pnpm typecheck   # TypeScript check
pnpm format:check # Prettier check
```

### Deployment
- Push to `main` → CI runs quality checks → Vercel auto-deploys
- No build step in CI (Vercel handles builds with proper env vars)

## Critical Constraints

### DO NOT:
1. **Add `regions` to vercel.json** - Multi-region requires Pro plan
2. **Add build step to CI** - Vercel builds; CI just validates code quality
3. **Require DATABASE_URL in CI** - Use `SKIP_ENV_VALIDATION=true`
4. **Run tests in CI** - Tests need a real database; run locally only
5. **Use `next lint`** - Use `eslint src` directly to avoid env loading

### Environment Variables
- **CI/Build:** `SKIP_ENV_VALIDATION=true` makes all env vars optional
- **Production:** Set in Vercel dashboard (DATABASE_URL, AUTH_SECRET, etc.)
- **Local:** Copy `.env.example` to `.env` and fill in values

## File Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
├── lib/           # Utilities
├── server/
│   ├── api/       # tRPC routers
│   ├── auth.ts    # NextAuth config
│   └── db.ts      # Prisma client
├── trpc/          # tRPC client setup
└── __tests__/     # Vitest tests (run locally only)

docs/
├── sprint-artifacts/  # Story specs, status tracking
└── features/          # Feature documentation

prisma/
└── schema.prisma      # Database schema
```

## Key Files

| File | Purpose |
|------|---------|
| `src/env.js` | Environment variable validation (skippable) |
| `vercel.json` | Vercel config (keep minimal!) |
| `.github/workflows/ci.yml` | CI pipeline (lint, typecheck, format) |
| `docs/sprint-artifacts/sprint-status.yaml` | Sprint tracking |
| `docs/sprint-artifacts/epics-and-stories.md` | Full roadmap |

## Next Steps

1. **Story 2.2:** Staff Invitation & Management
2. **Story 2.3:** User Authentication (Login/Logout UI)
3. **Story 2.4:** Password Reset Flow

## Sprint Tracking

See `docs/sprint-artifacts/sprint-status.yaml` for current status of all epics and stories.

## Debugging

### CI Fails
- Check if lint/typecheck pass locally: `pnpm lint && pnpm typecheck`
- Format issues: `pnpm format:write` then commit

### Vercel Deploy Fails
- Check Vercel dashboard for build logs
- Ensure env vars are set in Vercel project settings
- Don't add features that require Pro plan (multi-region, etc.)

### Tests Fail
- Tests run against local DB, not in CI
- Run `pnpm test` locally before pushing
- Check `src/__tests__/` for test files
