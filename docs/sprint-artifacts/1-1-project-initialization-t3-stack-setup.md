# Story 1.1: Project Initialization & T3 Stack Setup

**Status:** in-progress  
**Story ID:** E1.1  
**Epic:** Epic 1 - Foundation & Platform Setup  
**Sprint:** Sprint 0  
**Type:** Technical Task  
**Priority:** P0 - Critical  
**Effort:** 3 points  

---

## Story

**As a** developer,  
**I want to** initialize the project with the T3 Stack,  
**so that** we have a solid TypeScript foundation with modern tooling and a reproducible development environment.

---

## Context & Requirements

### From Epic 1 Technical Specification

This story establishes the absolute foundation for the Crowdiant Restaurant OS platform. The T3 Stack (Next.js 14+, TypeScript, tRPC, Prisma, NextAuth, Tailwind) provides the architectural bedrock defined in the architecture document. Without this foundation, no subsequent development can proceed.

**Key Requirements:**
- **Multi-tenant SaaS platform:** Requires scalable architecture from day one
- **Type safety:** End-to-end TypeScript for complex restaurant domain logic
- **Rapid development:** Modern tooling to accelerate feature delivery
- **Production readiness:** Vercel deployment model with serverless scaling

**Sources:**
- [Epic 1 Tech Spec: Overview](docs/sprint-artifacts/epic-1-context.md#overview)
- [Architecture: Project Initialization](docs/architecture.md#project-initialization)
- [Epics: Story E1.1](docs/sprint-artifacts/epics-and-stories.md#story-e11)

---

## Acceptance Criteria

### AC1: T3 Stack Initialization
- [ ] Execute T3 Stack creation command successfully:
  ```bash
  npx create-t3-app@latest crowdiant-os --typescript --tailwind --trpc --prisma --nextAuth --app-router
  ```
- [ ] Command completes without errors
- [ ] Project directory `crowdiant-os` created with correct structure
- [ ] All default T3 components present (Next.js, tRPC, Prisma, NextAuth, Tailwind)

**Validation:** Directory structure matches T3 Stack standard layout

---

### AC2: Dependency Installation
- [ ] All npm/pnpm dependencies install successfully
- [ ] Switch package manager to pnpm (if not default):
  ```bash
  npm install -g pnpm
  pnpm install
  ```
- [ ] No dependency conflicts or version warnings
- [ ] Lockfile `pnpm-lock.yaml` generated

**Validation:** `pnpm install` completes with exit code 0

---

### AC3: TypeScript Configuration
- [ ] Enable TypeScript strict mode in `tsconfig.json`
- [ ] Configure path aliases:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```
- [ ] No TypeScript compilation errors
- [ ] Type checking passes: `pnpm tsc --noEmit`

**Validation:** Running `pnpm tsc --noEmit` exits with code 0

---

### AC4: ESLint and Prettier Setup
- [ ] ESLint configured with Next.js recommended rules
- [ ] Prettier configured for consistent formatting
- [ ] Add Prettier plugin for Tailwind CSS class sorting:
  ```bash
  pnpm add -D prettier-plugin-tailwindcss
  ```
- [ ] Create `.prettierrc`:
  ```json
  {
    "semi": true,
    "trailingComma": "all",
    "singleQuote": false,
    "printWidth": 100,
    "tabWidth": 2,
    "plugins": ["prettier-plugin-tailwindcss"]
  }
  ```
- [ ] Add npm scripts to `package.json`:
  ```json
  {
    "scripts": {
      "lint": "next lint",
      "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
      "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\""
    }
  }
  ```
- [ ] All files pass linting: `pnpm lint`
- [ ] All files formatted correctly: `pnpm format:check`

**Validation:** Both lint and format:check commands pass

---

### AC5: Environment Variables Configuration
- [ ] Create `.env.example` with all required foundation variables:
  ```bash
  # Database
  DATABASE_URL="postgresql://user:password@localhost:5432/crowdiant_dev"

  # NextAuth
  NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
  NEXTAUTH_URL="http://localhost:3000"

  # Application
  NODE_ENV="development"
  LOG_LEVEL="debug"

  # Future integrations (Epic 3+)
  # STRIPE_SECRET_KEY="sk_test_..."
  # REDIS_URL="redis://localhost:6379"
  # SENTRY_DSN="https://...@sentry.io/..."
  ```
- [ ] Add comments explaining each variable
- [ ] Document how to generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Add `.env.local` to `.gitignore` (should already be present)
- [ ] Create `.env.local` for local development (do not commit)

**Validation:** `.env.example` contains all required variables with comments

---

### AC6: README Documentation
- [ ] Update `README.md` with comprehensive setup instructions
- [ ] Include prerequisites:
  - Node.js 20.x LTS
  - pnpm (latest)
  - PostgreSQL 16 (or PlanetScale account)
- [ ] Document step-by-step setup process:
  1. Clone repository
  2. Install dependencies: `pnpm install`
  3. Copy `.env.example` to `.env.local`
  4. Configure environment variables
  5. Run dev server: `pnpm dev`
- [ ] Add troubleshooting section for common issues
- [ ] Include links to T3 Stack documentation
- [ ] Document folder structure and purpose of key directories

**Validation:** Another team member can follow README and successfully start dev server

---

### AC7: Development Server Verification
- [ ] Start development server: `pnpm dev`
- [ ] Server starts on `http://localhost:3000` without errors
- [ ] Browser loads default T3 app welcome page
- [ ] Hot reload works (edit page, see changes without restart)
- [ ] No console errors in terminal or browser

**Validation:** Navigate to http://localhost:3000 and see T3 welcome page

---

### AC8: Health Check Endpoint (Foundation)
- [ ] Create basic health check API route: `src/app/api/health/route.ts`
  ```typescript
  export async function GET() {
    return Response.json({ 
      status: 'ok', 
      timestamp: Date.now(),
      service: 'crowdiant-os',
      environment: process.env.NODE_ENV
    });
  }
  ```
- [ ] Endpoint responds at `http://localhost:3000/api/health`
- [ ] Returns JSON with correct structure
- [ ] Status code 200

**Validation:** 
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":1732656000000,"service":"crowdiant-os","environment":"development"}
```

---

## Tasks / Subtasks

### Task 1: Initialize T3 Stack Project (AC1, AC2)
- [ ] 1.1 Navigate to parent directory where project will be created
- [ ] 1.2 Run T3 Stack creation command with all required flags
- [ ] 1.3 Verify command completes successfully
- [ ] 1.4 Change into project directory: `cd crowdiant-os`
- [ ] 1.5 Inspect directory structure (confirm src/, prisma/, public/ present)
- [ ] 1.6 Install dependencies with pnpm: `pnpm install`
- [ ] 1.7 Verify no errors during installation
- [ ] 1.8 Commit initial scaffold: `git init && git add . && git commit -m "feat: Initialize T3 Stack project"`

**Estimated Time:** 15 minutes  
**Dependencies:** None (first task)

---

### Task 2: Configure TypeScript Strict Mode (AC3)
- [ ] 2.1 Open `tsconfig.json` in editor
- [ ] 2.2 Locate `compilerOptions` section
- [ ] 2.3 Set `"strict": true` if not already enabled
- [ ] 2.4 Verify path aliases configured (`@/*` → `./src/*`)
- [ ] 2.5 Run type check: `pnpm tsc --noEmit`
- [ ] 2.6 Fix any type errors (should be none in fresh project)
- [ ] 2.7 Commit: `git commit -am "chore: Enable TypeScript strict mode"`

**Estimated Time:** 10 minutes  
**Dependencies:** Task 1

---

### Task 3: Setup ESLint and Prettier (AC4)
- [ ] 3.1 Verify ESLint already configured (T3 includes it)
- [ ] 3.2 Install Prettier Tailwind plugin: `pnpm add -D prettier-plugin-tailwindcss`
- [ ] 3.3 Create `.prettierrc` with configuration (see AC4)
- [ ] 3.4 Add lint and format scripts to `package.json`
- [ ] 3.5 Run `pnpm format` to format all files
- [ ] 3.6 Run `pnpm lint` to verify no linting errors
- [ ] 3.7 Test format check: `pnpm format:check`
- [ ] 3.8 Commit: `git commit -am "chore: Configure ESLint and Prettier with Tailwind plugin"`

**Estimated Time:** 15 minutes  
**Dependencies:** Task 1

---

### Task 4: Create Environment Variable Template (AC5)
- [ ] 4.1 Create `.env.example` file in project root
- [ ] 4.2 Add all foundation environment variables (see AC5)
- [ ] 4.3 Add detailed comments for each variable
- [ ] 4.4 Document NEXTAUTH_SECRET generation command
- [ ] 4.5 Verify `.env.local` in `.gitignore` (should be present)
- [ ] 4.6 Copy `.env.example` to `.env.local` for local dev
- [ ] 4.7 Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] 4.8 Paste generated secret into `.env.local`
- [ ] 4.9 Set DATABASE_URL to placeholder (will be configured in Story 1.2)
- [ ] 4.10 Commit: `git add .env.example && git commit -m "chore: Add environment variable template"`

**Estimated Time:** 10 minutes  
**Dependencies:** Task 1  
**Note:** Do NOT commit `.env.local`

---

### Task 5: Update README with Setup Instructions (AC6)
- [ ] 5.1 Open `README.md` in editor
- [ ] 5.2 Replace default T3 content with project-specific instructions
- [ ] 5.3 Add "Prerequisites" section (Node.js 20.x, pnpm, PostgreSQL)
- [ ] 5.4 Add "Getting Started" section with numbered steps
- [ ] 5.5 Add "Development" section (commands for dev, build, lint, format)
- [ ] 5.6 Add "Project Structure" section (explain src/, prisma/, public/)
- [ ] 5.7 Add "Environment Variables" section referencing `.env.example`
- [ ] 5.8 Add "Troubleshooting" section for common issues:
  - Port 3000 already in use
  - pnpm not found
  - Database connection errors (for future reference)
- [ ] 5.9 Add links to T3 Stack docs, Next.js docs, Prisma docs
- [ ] 5.10 Test instructions by having another developer follow them
- [ ] 5.11 Commit: `git commit -am "docs: Add comprehensive setup instructions to README"`

**Estimated Time:** 30 minutes  
**Dependencies:** Tasks 1-4

---

### Task 6: Verify Development Server (AC7)
- [ ] 6.1 Ensure `.env.local` configured with valid values
- [ ] 6.2 Start dev server: `pnpm dev`
- [ ] 6.3 Wait for compilation to complete (watch for "Ready" message)
- [ ] 6.4 Open browser to `http://localhost:3000`
- [ ] 6.5 Verify T3 welcome page loads without errors
- [ ] 6.6 Open browser dev tools console, verify no errors
- [ ] 6.7 Test hot reload: edit `src/app/page.tsx`, save, verify page updates
- [ ] 6.8 Check terminal for any warnings or errors
- [ ] 6.9 Stop server (Ctrl+C), restart, verify still works

**Estimated Time:** 10 minutes  
**Dependencies:** Tasks 1-5

---

### Task 7: Create Health Check Endpoint (AC8)
- [ ] 7.1 Create directory: `src/app/api/health`
- [ ] 7.2 Create file: `src/app/api/health/route.ts`
- [ ] 7.3 Implement GET handler (see AC8 for code)
- [ ] 7.4 Start dev server if not running: `pnpm dev`
- [ ] 7.5 Test endpoint in browser: `http://localhost:3000/api/health`
- [ ] 7.6 Verify JSON response structure correct
- [ ] 7.7 Test with curl: `curl http://localhost:3000/api/health`
- [ ] 7.8 Verify status code 200
- [ ] 7.9 Verify timestamp is recent (within 1 second of request)
- [ ] 7.10 Commit: `git add src/app/api/health && git commit -m "feat: Add health check endpoint"`

**Estimated Time:** 10 minutes  
**Dependencies:** Task 6

---

### Task 8: Final Validation & Documentation
- [ ] 8.1 Run full test suite (when tests added in Story 1.2+)
- [ ] 8.2 Run type check: `pnpm tsc --noEmit` (should pass)
- [ ] 8.3 Run linter: `pnpm lint` (should pass)
- [ ] 8.4 Run formatter check: `pnpm format:check` (should pass)
- [ ] 8.5 Verify all 8 acceptance criteria met
- [ ] 8.6 Review all commits for clear messages
- [ ] 8.7 Push to GitHub (if repository created): `git push origin main`
- [ ] 8.8 Verify README accurate by having team member clone and follow instructions
- [ ] 8.9 Document any deviations from T3 defaults in dev notes below
- [ ] 8.10 Mark story as complete in sprint-status.yaml

**Estimated Time:** 15 minutes  
**Dependencies:** Tasks 1-7

---

## Dev Notes

### Architecture Alignment

**T3 Stack Decision Rationale:**
The T3 Stack was chosen to align with the architecture document's requirements for a type-safe, scalable, multi-tenant SaaS platform. Key alignments:

1. **Next.js 14+ App Router:** Enables server components, streaming, and modern React patterns essential for real-time restaurant operations.
2. **TypeScript (strict mode):** Provides type safety critical for complex domain logic (multi-tenancy, payments, trust scoring).
3. **tRPC:** End-to-end type safety eliminates API contract bugs, accelerates development.
4. **Prisma:** Type-safe ORM with excellent migration support for evolving database schema.
5. **NextAuth.js:** Extensible authentication framework supporting multi-tenant sessions.
6. **Tailwind CSS:** Utility-first styling for rapid UI development with shadcn/ui components (Story 1.4).

**Source:** [Architecture: Decision Summary](docs/architecture.md#decision-summary)

---

### Project Structure Overview

```
crowdiant-os/
├── .env.example              # Environment variable template (committed)
├── .env.local                # Local environment config (gitignored)
├── .eslintrc.cjs             # ESLint configuration
├── .prettierrc               # Prettier configuration
├── next.config.mjs           # Next.js configuration
├── package.json              # Dependencies and scripts
├── pnpm-lock.yaml            # Dependency lockfile
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Setup instructions and documentation
│
├── prisma/
│   ├── schema.prisma         # Database schema (Story 1.2)
│   └── migrations/           # Migration history
│
├── public/
│   ├── fonts/                # Custom fonts
│   └── images/               # Static images
│
└── src/
    ├── app/                  # Next.js App Router
    │   ├── api/              # API routes
    │   │   └── health/       # Health check endpoint ✅ (This story)
    │   ├── layout.tsx        # Root layout
    │   └── page.tsx          # Home page
    │
    ├── server/               # Server-side code
    │   ├── api/              # tRPC routers (Story 1.3)
    │   ├── auth.ts           # NextAuth config (Story 1.3)
    │   └── db.ts             # Prisma client (Story 1.2)
    │
    ├── styles/               # Global styles
    │   └── globals.css       # Tailwind base styles
    │
    └── lib/                  # Utility functions
        └── utils.ts          # Helper utilities
```

**This Story Creates:**
- Basic project structure (auto-generated by T3 Stack)
- `.env.example` with foundation variables
- Health check endpoint at `src/app/api/health/route.ts`
- Updated README.md with setup instructions

**Next Story Will Add:**
- Prisma schema in `prisma/schema.prisma`
- Database migrations in `prisma/migrations/`
- Prisma client setup in `src/server/db.ts`

---

### Technical Constraints & Standards

**Package Manager:** pnpm (not npm/yarn)
- Faster installs via content-addressable storage
- Better monorepo support for future microservices
- Strict dependency resolution prevents phantom dependencies

**Coding Standards:**
- TypeScript strict mode enabled (no implicit any)
- ESLint enforces Next.js best practices
- Prettier formats all code automatically
- Absolute imports via `@/` prefix (cleaner than relative paths)

**Commit Message Convention:**
```
feat: Add new feature
fix: Bug fix
chore: Tooling, configs, dependencies
docs: Documentation only
refactor: Code restructuring without behavior change
test: Add or modify tests
```

**Source:** [Epic 1 Tech Spec: Technical Dependencies](docs/sprint-artifacts/epic-1-context.md#dependencies-and-integrations)

---

### Environment Variables (Foundation)

**Required for This Story:**
- `NEXTAUTH_SECRET`: Random 32+ character string for session encryption
- `NEXTAUTH_URL`: Base URL (http://localhost:3000 for dev)
- `NODE_ENV`: Auto-set by Next.js (development/production)
- `LOG_LEVEL`: Logging verbosity (debug/info/warn/error)

**Required in Story 1.2 (Database):**
- `DATABASE_URL`: PostgreSQL connection string

**Required in Future Stories:**
- `STRIPE_SECRET_KEY` (Epic 3: Express Checkout)
- `REDIS_URL` (Epic 3: Pre-auth state management)
- `SENTRY_DSN` (Story 1.6: Observability)
- `TWILIO_ACCOUNT_SID` (Epic 9: SMS notifications)

**Security Notes:**
- NEVER commit `.env.local` to git
- Use Vercel for encrypted production environment variables
- Rotate NEXTAUTH_SECRET if compromised
- Use different secrets for dev/staging/production

---

### Testing Strategy (Future Stories)

**Unit Tests (Story 1.2+):**
- Framework: Vitest (fast, modern alternative to Jest)
- Location: `tests/unit/` or co-located with source files
- Coverage target: 80%+ for critical paths

**Integration Tests (Story 1.3+):**
- Framework: Vitest + Prisma test database
- Location: `tests/integration/`
- Coverage: 100% of authentication flows and database operations

**E2E Tests (Story 1.5+):**
- Framework: Playwright
- Location: `tests/e2e/`
- Coverage: 100% of critical user journeys (login, dashboard navigation)

**This Story Testing:**
- Manual verification of acceptance criteria
- Health check endpoint curl test
- Team member setup validation (README accuracy)

**Source:** [Epic 1 Tech Spec: Test Strategy](docs/sprint-artifacts/epic-1-context.md#test-strategy)

---

### Known Issues & Limitations

**Not Implemented in This Story:**
- Database connection (Story 1.2)
- Authentication system (Story 1.3)
- UI component library (Story 1.4)
- CI/CD pipeline (Story 1.5)
- Observability infrastructure (Story 1.6)

**Potential Issues:**
1. **Port 3000 Conflict:** If another service uses port 3000, Next.js will fail to start. Solution: Kill conflicting process or set `PORT` env var.
2. **pnpm Not Found:** If pnpm not installed globally, install with `npm install -g pnpm`.
3. **Node Version Mismatch:** T3 Stack requires Node.js 20.x LTS. Use nvm to switch: `nvm use 20`.
4. **NEXTAUTH_SECRET Missing:** Dev server will warn if not set. Generate with `openssl rand -base64 32`.

---

### References

**Primary Sources:**
- [Epic 1 Technical Specification](docs/sprint-artifacts/epic-1-context.md)
- [Architecture Document: Project Initialization](docs/architecture.md#project-initialization)
- [Epics & Stories: Story E1.1](docs/sprint-artifacts/epics-and-stories.md#story-e11-project-initialization--t3-stack-setup)

**External Documentation:**
- [T3 Stack Official Guide](https://create.t3.gg/)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [pnpm Documentation](https://pnpm.io/)

**Architecture Decisions:**
- [ADR: T3 Stack Selection](docs/architecture.md#decision-summary)
- [Project Structure Standards](docs/architecture.md#project-structure)

---

## Dev Agent Record

### Context Reference

- **Story Context XML:** `docs/sprint-artifacts/1-1-project-initialization-t3-stack-setup.context.xml`
- **Generated:** 2025-11-26
- **Contains:** User story, acceptance criteria, tasks/subtasks, documentation references, code artifacts, dependencies, constraints, interfaces, testing ideas

---

### Agent Model Used

### Agent Model Used

Claude Sonnet 4.5 via GitHub Copilot

---

### Debug Log References

Session 2025-11-26: Started implementation, discovered T3 project initialized in wrong location (c:\Code\crowdiant-os instead of within workspace). Need to restart and initialize within workspace tomorrow.

---

### Completion Notes List

**Session 1 (2025-11-26) - Partial Progress:**
- ✅ T3 Stack command executed successfully with BetterAuth (newer T3 default)
- ✅ pnpm configured as package manager
- ✅ Dependencies installed (~383 packages)
- ✅ ESLint and Prettier configured and all files formatted
- ✅ .env.example updated with comprehensive foundation variables
- ✅ README.md created with full setup instructions, troubleshooting, architecture
- ❌ **ISSUE:** Project initialized in wrong location (c:\Code\crowdiant-os instead of workspace)
- ⏸️ Paused before completing Tasks 6-8 (dev server verification, health endpoint, final validation)

**Technical Debt:**
- Project needs to be reinitialized within workspace directory structure
- Once reinitialized, remaining tasks: verify dev server, create health endpoint, run final validation

**Architectural Note:**
- T3 Stack now defaults to BetterAuth instead of NextAuth.js (both acceptable for foundation)
- All configuration and documentation created is reusable for proper initialization

---

### File List

**NEW (in c:\Code\crowdiant-os - wrong location, needs recreation):**
- Full T3 Stack scaffold (58 files)
- .env.example (comprehensive)
- README.md (complete setup guide)
- pnpm-lock.yaml

**MODIFIED:**
- package.json (changed packageManager to pnpm)
- Multiple files formatted by Prettier

**DELETED:**
- None

**PENDING (needs proper workspace initialization):**
- src/app/api/health/route.ts (not yet created)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-26 | Bob (SM) | Initial story draft created from Epic 1.1 requirements |
| 2025-11-26 | Amelia (Dev) | Started implementation - T3 initialized in wrong location, paused to restart properly tomorrow |

---

## Story Status: in-progress

**Next Steps:**
1. Review story draft for completeness
2. Run `*create-story-context` to generate technical context XML
3. Mark story ready-for-dev with `*story-ready-for-dev`
4. Hand off to Amelia (dev agent) for implementation

---

_This story is part of Sprint 0 - Foundation & Platform Setup. It must be completed before any subsequent stories can begin._
