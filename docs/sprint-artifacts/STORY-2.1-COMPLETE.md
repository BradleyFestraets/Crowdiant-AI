# Story 2.1 — Venue Registration & Onboarding — COMPLETE

**Completed:** 2025-11-30  
**Epic:** User & Venue Management (Epic 2)  
**Status:** Review  
**Developer:** BMad Master Agent

---

## Summary

Implemented venue registration flow enabling restaurant owners to create venues with automatic slug generation, uniqueness validation, and OWNER role assignment. All acceptance criteria met with full test coverage.

---

## Acceptance Criteria Status

- [x] **AC1:** Venue registration page `/register/venue` exists with required form fields
- [x] **AC2:** Slug generated from venue name; uniqueness enforced with numeric suffix on collision
- [x] **AC3:** Authenticated creator automatically assigned OWNER role (StaffAssignment)
- [x] **AC4:** Venue persisted with name, slug, timezone, currency
- [x] **AC5:** Redirect to venue dashboard after successful creation
- [x] **AC6:** Success confirmation message displayed post-creation

---

## Implementation Details

### Files Created

1. **`src/lib/slug.ts`**
   - `generateBaseSlug()`: Sanitizes venue names into URL-safe slugs (lowercase, alphanumeric + hyphens, max 48 chars)
   - `generateUniqueSlug()`: Async uniqueness check with suffix generation (helper for future use)

2. **`src/__tests__/slug.test.ts`**
   - Unit tests: sanitization, whitespace collapse, truncation
   - 3/3 passing

3. **`src/__tests__/venue-create.test.ts`**
   - Integration tests: venue creation, slug collision handling, unauthorized access
   - 3/3 passing
   - Uses local Docker Postgres (vitest.config.ts DATABASE_URL override)

4. **`vitest.config.ts`**
   - Path alias resolution (`~` → `src`)
   - Test DATABASE_URL override for local Postgres
   - Avoids Prisma Accelerate API consumption during tests

5. **`docs/sprint-artifacts/2-1-venue-registration-onboarding.md`**
   - Story specification document

6. **`docs/sprint-artifacts/2-1-venue-registration-onboarding.context.xml`**
   - Technical context for implementation

### Files Modified

1. **`src/server/api/routers/venue.ts`**
   - Refactored slug generation to use `generateBaseSlug()` utility
   - Wrapped venue + staff assignment creation in `$transaction` for atomicity
   - Ensures owner assignment failure rolls back venue creation

2. **`src/app/register/venue/page.tsx`**
   - Already existed; confirmed functional with tRPC integration
   - Form validates name, timezone, currency
   - Redirects to `/dashboard/{slug}` on success

3. **`package.json`**
   - Added `vitest` devDependency (^2.1.4)
   - Added `test` script: `vitest run`
   - Added `test:watch` script: `vitest`

4. **`docs/sprint-artifacts/sprint-status.yaml`**
   - Updated story status: `backlog` → `drafted` → `ready-for-dev` → `in-progress` → `review`

---

## Technical Decisions

### Transaction-Based Creation
Used Prisma `$transaction` to ensure atomic venue + staff assignment creation. If owner assignment fails, venue creation rolls back (prevents orphaned venues).

### Slug Collision Strategy
- Generate base slug from venue name
- Check uniqueness via `venue.findUnique({ where: { slug } })`
- Append numeric suffix (`-2`, `-3`, etc.) up to 10 attempts
- Throw `CONFLICT` error if still not unique after 10 tries

### Test Environment Isolation
- Production `.env` uses Prisma Accelerate (remote, pooled)
- Tests override `DATABASE_URL` in `vitest.config.ts` to use local Docker Postgres
- Avoids API key exposure, cost, and data pollution
- Test database already running: `crowdiant-postgres` container on `localhost:5432`

---

## Test Results

```
✓ src/__tests__/slug.test.ts (3)
  ✓ generateBaseSlug (3)
    ✓ sanitizes and lowercases name
    ✓ collapses whitespace and hyphens
    ✓ truncates to maxLength

✓ src/__tests__/venue-create.test.ts (3)
  ✓ venue.create mutation (3)
    ✓ creates a venue and owner assignment
    ✓ appends numeric suffix when slug collides
    ✓ rejects unauthenticated creation

Test Files  2 passed (2)
Tests       6 passed (6)
Duration    2.39s
```

---

## Known Limitations & Future Work

### Current Implementation
- Manual timezone input (accepts any string matching zod schema)
- Currency validated as 3-char uppercase but no ISO 4217 enforcement
- Slug collision limited to 10 attempts (low risk for typical usage)

### Recommended Enhancements (Future Stories)
1. **Timezone Selector Component** (Epic 2 UI polish)
   - Dropdown with IANA timezone list
   - Auto-detect from browser
   
2. **Currency Validation** (Epic 3: Stripe integration)
   - Validate against Stripe-supported currencies
   - Add currency symbol display

3. **Slug Customization** (Epic 2 polish)
   - Allow manual slug override
   - Real-time availability check

4. **Venue Verification** (Epic 2 or 3)
   - Email/phone verification before activation
   - Business documentation upload

5. **Address Autocomplete** (Epic 2 or 8)
   - Google Places API integration
   - Validate physical location

---

## Dependencies Installed

- `vitest@^2.1.4` (devDependency)

---

## Migration Notes

No database migrations required. Story uses existing schema from Epic 1:
- `Venue` model (id, name, slug, timezone, currency, timestamps)
- `StaffAssignment` model (id, userId, venueId, role, timestamps)
- `StaffRole` enum (OWNER, MANAGER, SERVER, KITCHEN, HOST, CASHIER)

---

## Code Quality

- ✅ TypeScript strict mode (no `any` types except test mocks)
- ✅ ESLint passing
- ✅ Prettier formatted
- ✅ All tests passing
- ✅ No console errors in dev server
- ✅ tRPC types inferred correctly

---

## Next Steps

1. **Move to Done:** After code review approval, update `sprint-status.yaml` to `done`
2. **Story 2.2:** Staff Invitation & Management
   - Requires email sending (Resend API or SMTP)
   - Invitation token model (PasswordResetToken pattern)
3. **Story 2.3:** Login page implementation
   - NextAuth credentials flow already configured
   - Needs UI components + session redirect

---

## Lessons Learned

### What Went Well
- Atomic transactions prevented partial state
- Local test DB isolated from production
- Vitest setup straightforward with path aliases
- Slug utility reusable for future features (Menu items, etc.)

### Challenges Encountered
- Initial path alias resolution in tests (resolved with vitest.config.ts)
- Prisma Accelerate API key errors in tests (resolved with DATABASE_URL override)
- Next.js dependency in test environment (resolved with `vi.mock('~/server/auth')`)

### Improvements for Next Story
- Add test database seeding utilities
- Create factory functions for test data (users, venues)
- Consider `@faker-js/faker` for realistic test data
- Add test cleanup hooks (truncate tables after each suite)

---

## BMAD Workflow Compliance

- [x] Story context XML created
- [x] Status transitions logged in sprint-status.yaml
- [x] All acceptance criteria verified
- [x] Tests passing before review
- [x] Completion artifact produced (this file)
- [x] Technical debt documented

**Story 2.1 ready for review and merge.**
