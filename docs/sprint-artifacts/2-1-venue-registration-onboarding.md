# Story 2.1 — Venue Registration & Onboarding

Story Status: drafted
Epic: User & Venue Management (Epic 2)
Sprint: 1

## Objective
Enable restaurant owners to create and configure a venue, generating a unique slug and establishing initial ownership so they can begin using the platform.

## Scope
- Venue registration page `/register/venue`
- Input fields: name, address (optional initial), timezone, currency
- Slug generation and uniqueness validation
- Owner user association (StaffAssignment with role OWNER)
- Redirect to venue dashboard post-creation
- Success confirmation messaging

## Deliverables
- `src/server/api/routers/venue.ts` (`create` mutation) — slug generation & owner assignment
- `src/app/register/venue/page.tsx` (to be implemented)
- VenueRegistrationForm component (to be implemented)
- Validation utilities for slug uniqueness (server-side)
- Updated `docs/sprint-artifacts/sprint-status.yaml` on progression

## Non-Goals
- Staff invitation workflow (Story 2.2)
- Multi-venue switching (Story 2.5)
- Payment/Stripe onboarding (Epic 3)
- Advanced auditing/logging (basic logging only if needed)

## Acceptance Criteria
- Owner can complete full registration flow
- Venue appears in database with correct data (name, slug, timezone, currency)
- Slug is unique; collisions resolved via numeric suffix
- Owner StaffAssignment record exists with role OWNER
- Redirect to venue dashboard after successful creation
- Success confirmation message displayed

## Implementation Notes
- Slug generation: lowercase, alphanumeric + hyphen, collapse repeats, max length 48; append `-N` for collisions.
- Use protectedProcedure (must be authenticated) for `venue.create`.
- Assign OWNER role immediately after venue creation inside the same transaction scope.
- Timezone default can fall back to `America/New_York` if not provided; currency default `USD`.
- Consider optimistic UI while waiting for creation response (future enhancement).

## Testing & QA
- Unit test slug utility (basic → slug, collision suffixing).
- Integration test `venue.create` with authenticated user creates venue + staff assignment.
- Duplicate venue name by same or different users still results in unique slug.
- Unauthorized (no session) call returns UNAUTHORIZED.

## Risks
- Race condition on slug generation if very high concurrency (low risk for early stage).
- Missing timezone validation could allow invalid entries — rely on zod schema & later enrichment.
- Owner assignment failure would orphan venue; ensure error surfaces and venue not partially created.

## Tracking
- On promotion to ready-for-dev: update `sprint-status.yaml` (2-1-venue-registration-onboarding: ready-for-dev).
- On completion: mark story done and create `STORY-2.1-COMPLETE.md` summarizing implementation notes.
