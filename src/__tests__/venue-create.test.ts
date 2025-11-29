import { describe, it, expect, afterAll, vi } from 'vitest';
// Mock server/auth to avoid Next.js dependency in test environment
vi.mock('~/server/auth', () => ({ auth: async () => null }));
import { PrismaClient } from '../../generated/prisma';
import { createTRPCRouter, createCallerFactory } from '../server/api/trpc';
import { venueRouter } from '../server/api/routers/venue';

const db = new PrismaClient();

// Build a minimal test app router (avoid path alias issues from full root)
const testAppRouter = createTRPCRouter({ venue: venueRouter });
const createCaller = createCallerFactory(testAppRouter);

// Helper to build a caller with a fake session
function buildCaller(session: any) {
  const ctx = { db, session, headers: new Headers() } as const;
  return createCaller(ctx);
}

describe('venue.create mutation', () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it('creates a venue and owner assignment', async () => {
    const user = await db.user.create({
      data: { email: `test-owner-${Date.now()}@ex.com` },
    });
    const caller = buildCaller({ user });
    const result = await caller.venue.create({
      name: 'Alpha Cafe',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    expect(result.success).toBe(true);
    expect(result.slug).toMatch(/^alpha-cafe/);
    const staff = await db.staffAssignment.findFirst({
      where: { userId: user.id, venueId: result.venueId },
    });
    expect(staff).not.toBeNull();
  });

  it('appends numeric suffix when slug collides', async () => {
    const user = await db.user.create({
      data: { email: `test-slug-${Date.now()}@ex.com` },
    });
    const caller = buildCaller({ user });
    // First creation
    await caller.venue.create({
      name: 'Collision Place',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    // Second creation with same name
    const second = await caller.venue.create({
      name: 'Collision Place',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    expect(second.slug).toMatch(/collision-place-2$/);
  });

  it('rejects unauthenticated creation', async () => {
    const caller = buildCaller(null);
    await expect(
      caller.venue.create({
        name: 'No Auth Venue',
        timezone: 'America/New_York',
        currency: 'USD',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
