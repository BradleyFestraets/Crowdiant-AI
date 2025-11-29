# Development & Deployment Pipeline

## Overview
Automated CI/CD using GitHub Actions with deployment to Vercel.

## CI Pipeline
Runs on every push and PR to `main` or `develop`:
- **Lint**: ESLint checks
- **Type Check**: TypeScript validation
- **Format Check**: Prettier formatting
- **Build**: Next.js production build

## Deployment Strategy

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Configure environment variables in Vercel dashboard
3. Automatic deployments:
   - **Production**: Deploys from `main` branch
   - **Preview**: Deploys from PRs
   - **Development**: Deploys from `develop` branch

### Environment Variables
Required for all environments:
```
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_URL=
```

Add via Vercel dashboard or `.env.local` for local development.

### Database Migrations
Prisma migrations run automatically via:
- Vercel: Set build command to `prisma migrate deploy && next build`
- Local: `pnpm db:migrate`

## Branch Protection
Recommended settings for `main` branch:
- Require PR reviews (1 minimum)
- Require status checks to pass (CI workflow)
- Require branches to be up to date
- Restrict force pushes

## Local Development
```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Run quality checks
pnpm check

# Generate Prisma client
pnpm db:generate
```

## Troubleshooting

### Build Fails in CI
- Check Node version matches (20.x)
- Verify `pnpm-lock.yaml` is committed
- Ensure environment variables are set

### Migration Failures
- Run `pnpm db:generate` locally first
- Check DATABASE_URL connectivity
- Review migration files in `prisma/migrations/`
