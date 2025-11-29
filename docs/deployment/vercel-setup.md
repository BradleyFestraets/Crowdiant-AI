# Vercel Deployment Setup

Date: 2025-11-30
Status: Draft (execute steps then mark E1.5 items complete)

## Prerequisites
- Vercel account with access to target org/team
- GitHub repo: BradleyFestraets/Crowdiant-AI
- Environment variables prepared (.env.example reference)

## Steps
1. Link Project:
```bash
vercel link --project crowdiant-os
```
Select existing scope/team; if project not created, run `vercel` and follow prompts.

2. Set Production & Preview Environment Variables:
```bash
vercel env add AUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add SENTRY_DSN production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add LOG_LEVEL production
vercel env pull .env.vercel.preview
```
Repeat for `preview` scope as needed.

3. Configure Git Integration:
- In Vercel dashboard: Import GitHub repo, enable automatic deploys for `main` and PR previews.
- Ensure "Automatically expose preview deployments" toggled on.

4. Build & Source Maps (Optional):
Add Sentry auth token only as a build env var (not runtime):
```bash
vercel env add SENTRY_AUTH_TOKEN production
vercel env add SENTRY_AUTH_TOKEN preview
```

5. Trigger First Deployment:
```bash
git push origin main
```
Verify deployment appears at `https://crowdiant-os.vercel.app` (or assigned domain).

6. Health Check Validation:
```bash
curl https://crowdiant-os.vercel.app/api/health
curl https://crowdiant-os.vercel.app/api/health/db
```
Expect JSON with status `healthy` / database `ok`.

7. Preview Deployment Test:
Create a test branch & PR:
```bash
git checkout -b test-preview
# (make trivial change)
git commit -am "chore: preview test"
git push origin test-preview
```
Confirm preview URL created; test `/register/venue` page loads.

8. Finalize Acceptance Criteria:
- Auto deploy on main push: Confirm commit triggers deployment.
- Preview deployments on PR: Confirm preview exists & accessible.

## Rollback Strategy
- Use Vercel dashboard to redeploy previous successful build.
- Keep `git tag` on major stable milestones (e.g., `v0.1.0-foundation`).

## Notes
- `vercel.json` added for basic configuration; adjust regions if latency patterns change.
- `SKIP_ENV_VALIDATION` set during build to prevent local-only variable enforcement in CI.
- Consider adding custom domains after MVP readiness.

## Next Steps
- Add uptime monitoring (BetterStack / Vercel Analytics alerts).
- Integrate Redis in Epic 3 (add REDIS_URL env).
- Configure alert rules once payment endpoints appear.
