import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock server/auth to avoid Next.js dependency in test environment
vi.mock("~/server/auth", () => ({ auth: async () => null }));

// Mock email to avoid sending real emails in tests
vi.mock("~/lib/email", () => ({
  sendStaffInvitation: async () => ({ id: "mock-email-id" }),
}));

import { PrismaClient, StaffRole } from "../../generated/prisma";
import { createTRPCRouter, createCallerFactory } from "../server/api/trpc";
import { userRouter } from "../server/api/routers/user";

const db = new PrismaClient();

// Build a minimal test app router
const testAppRouter = createTRPCRouter({ user: userRouter });
const createCaller = createCallerFactory(testAppRouter);

/**
 * Role-Based Access Control Tests
 *
 * Story 2.9: Verify RBAC works correctly for all roles
 *
 * Role Hierarchy (from most to least privileged):
 * 1. OWNER - Full access to all features including billing
 * 2. MANAGER - Operations access (not billing)
 * 3. SERVER - POS and assigned tables only
 * 4. KITCHEN - Kitchen Display System only
 * 5. HOST - Reservations and seating only
 * 6. CASHIER - Payment processing only
 *
 * API Response Structures:
 * - listStaff: { activeStaff: [...], pendingInvitations: [...] }
 * - inviteStaff: { success: true, invitationId: string }
 * - updateStaffRole: { success: true } (uses staffAssignmentId param)
 * - deactivateStaff: { success: true } (uses staffAssignmentId param)
 */

// Test data
let testVenue: { id: string; slug: string };
let testUsers: Record<StaffRole, { id: string; email: string }>;

// Helper to build a caller with a fake session
type TestSession = {
  user?: { id: string; email?: string; name?: string };
} | null;
function buildCaller(session: TestSession) {
  const normalized = session?.user
    ? {
        user: session.user,
        expires: new Date(Date.now() + 3600_000).toISOString(),
      }
    : null;
  const ctx = { db, session: normalized, headers: new Headers() } as const;
  return createCaller(ctx as never);
}

// Helper to create a caller with a specific user's session
function createCallerWithUser(userId: string, email: string) {
  return buildCaller({ user: { id: userId, email, name: "Test User" } });
}

// Helper to create an unauthenticated caller
function createUnauthenticatedCaller() {
  return buildCaller(null);
}

describe("Role-Based Access Control", () => {
  beforeAll(async () => {
    // Create a test venue
    testVenue = await db.venue.create({
      data: {
        name: "RBAC Test Venue",
        slug: `rbac-test-${Date.now()}`,
        timezone: "America/New_York",
        currency: "USD",
      },
    });

    // Create test users for each role
    testUsers = {} as Record<StaffRole, { id: string; email: string }>;

    for (const role of Object.values(StaffRole)) {
      const email = `${role.toLowerCase()}-${Date.now()}@test.com`;
      const user = await db.user.create({
        data: {
          email,
          name: `Test ${role}`,
          passwordHash: "test-hash",
        },
      });

      // Create staff assignment with role
      await db.staffAssignment.create({
        data: {
          userId: user.id,
          venueId: testVenue.id,
          role: role,
        },
      });

      testUsers[role] = { id: user.id, email };
    }
  });

  afterAll(async () => {
    // Clean up invitations first (foreign key)
    await db.staffInvitation.deleteMany({
      where: { venueId: testVenue.id },
    });

    // Clean up test data
    await db.staffAssignment.deleteMany({
      where: { venueId: testVenue.id },
    });

    for (const user of Object.values(testUsers)) {
      await db.user.delete({ where: { id: user.id } });
    }

    await db.venue.delete({ where: { id: testVenue.id } });
    await db.$disconnect();
  });

  describe("Authentication Requirements", () => {
    it("rejects unauthenticated access to protected endpoints", async () => {
      const caller = createUnauthenticatedCaller();

      // Attempt to list staff (protected endpoint)
      await expect(
        caller.user.listStaff({ venueId: testVenue.id }),
      ).rejects.toThrow("You must be logged in");
    });

    it("allows authenticated users to access protected endpoints", async () => {
      const { id, email } = testUsers[StaffRole.OWNER];
      const caller = createCallerWithUser(id, email);

      // Owner should be able to list staff - returns { activeStaff, pendingInvitations }
      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff).toBeDefined();
      expect(Array.isArray(result.activeStaff)).toBe(true);
    });
  });

  describe("Venue Access Control", () => {
    it("allows users with venue assignment to access venue endpoints", async () => {
      const { id, email } = testUsers[StaffRole.SERVER];
      const caller = createCallerWithUser(id, email);

      // Server should be able to access their assigned venue
      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff).toBeDefined();
    });

    it("rejects users without venue assignment", async () => {
      // Create a user with no venue assignment
      const orphanUser = await db.user.create({
        data: {
          email: `orphan-${Date.now()}@test.com`,
          name: "Orphan User",
          passwordHash: "test-hash",
        },
      });

      try {
        const caller = createCallerWithUser(orphanUser.id, orphanUser.email);

        await expect(
          caller.user.listStaff({ venueId: testVenue.id }),
        ).rejects.toThrow("You do not have access to this venue");
      } finally {
        await db.user.delete({ where: { id: orphanUser.id } });
      }
    });

    it("respects soft-deleted assignments", async () => {
      // Create a user with soft-deleted assignment
      const deletedUser = await db.user.create({
        data: {
          email: `deleted-${Date.now()}@test.com`,
          name: "Deleted User",
          passwordHash: "test-hash",
        },
      });

      await db.staffAssignment.create({
        data: {
          userId: deletedUser.id,
          venueId: testVenue.id,
          role: StaffRole.SERVER,
          deletedAt: new Date(), // Soft deleted
        },
      });

      try {
        const caller = createCallerWithUser(deletedUser.id, deletedUser.email);

        await expect(
          caller.user.listStaff({ venueId: testVenue.id }),
        ).rejects.toThrow("You do not have access to this venue");
      } finally {
        await db.staffAssignment.deleteMany({
          where: { userId: deletedUser.id },
        });
        await db.user.delete({ where: { id: deletedUser.id } });
      }
    });
  });

  describe("OWNER Role Permissions", () => {
    it("OWNER can list staff", async () => {
      const { id, email } = testUsers[StaffRole.OWNER];
      const caller = createCallerWithUser(id, email);

      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff.length).toBeGreaterThan(0);
    });

    it("OWNER can invite staff", async () => {
      const { id, email } = testUsers[StaffRole.OWNER];
      const caller = createCallerWithUser(id, email);

      const result = await caller.user.inviteStaff({
        venueId: testVenue.id,
        email: `newstaff-${Date.now()}@test.com`,
        role: "SERVER",
      });

      expect(result.success).toBe(true);
      expect(result.invitationId).toBeDefined();

      // Clean up
      await db.staffInvitation.delete({
        where: { id: result.invitationId },
      });
    });

    it("OWNER can update staff roles", async () => {
      const { id, email } = testUsers[StaffRole.OWNER];
      const caller = createCallerWithUser(id, email);

      // Get a server's assignment
      const serverAssignment = await db.staffAssignment.findFirst({
        where: {
          venueId: testVenue.id,
          role: StaffRole.SERVER,
          deletedAt: null,
        },
      });

      if (serverAssignment) {
        const result = await caller.user.updateStaffRole({
          staffAssignmentId: serverAssignment.id,
          role: "HOST",
        });

        expect(result.success).toBe(true);

        // Revert change
        await caller.user.updateStaffRole({
          staffAssignmentId: serverAssignment.id,
          role: "SERVER",
        });
      }
    });

    it("OWNER can deactivate staff", async () => {
      const { id, email } = testUsers[StaffRole.OWNER];
      const caller = createCallerWithUser(id, email);

      // Create a temporary staff member to deactivate
      const tempUser = await db.user.create({
        data: {
          email: `temp-${Date.now()}@test.com`,
          name: "Temp User",
          passwordHash: "test-hash",
        },
      });

      const tempAssignment = await db.staffAssignment.create({
        data: {
          userId: tempUser.id,
          venueId: testVenue.id,
          role: StaffRole.SERVER,
        },
      });

      try {
        const result = await caller.user.deactivateStaff({
          staffAssignmentId: tempAssignment.id,
        });

        expect(result.success).toBe(true);

        // Verify soft delete
        const deactivated = await db.staffAssignment.findUnique({
          where: { id: tempAssignment.id },
        });
        expect(deactivated?.deletedAt).not.toBeNull();
      } finally {
        await db.staffAssignment.delete({ where: { id: tempAssignment.id } });
        await db.user.delete({ where: { id: tempUser.id } });
      }
    });
  });

  describe("MANAGER Role Permissions", () => {
    it("MANAGER can list staff", async () => {
      const { id, email } = testUsers[StaffRole.MANAGER];
      const caller = createCallerWithUser(id, email);

      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff.length).toBeGreaterThan(0);
    });

    it("MANAGER can invite staff", async () => {
      const { id, email } = testUsers[StaffRole.MANAGER];
      const caller = createCallerWithUser(id, email);

      const result = await caller.user.inviteStaff({
        venueId: testVenue.id,
        email: `manager-invite-${Date.now()}@test.com`,
        role: "SERVER",
      });

      expect(result.success).toBe(true);
      expect(result.invitationId).toBeDefined();

      // Clean up
      await db.staffInvitation.delete({
        where: { id: result.invitationId },
      });
    });
  });

  describe("SERVER Role Permissions", () => {
    it("SERVER can list staff (read-only access)", async () => {
      const { id, email } = testUsers[StaffRole.SERVER];
      const caller = createCallerWithUser(id, email);

      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff).toBeDefined();
    });

    it("SERVER cannot invite staff", async () => {
      const { id, email } = testUsers[StaffRole.SERVER];
      const caller = createCallerWithUser(id, email);

      await expect(
        caller.user.inviteStaff({
          venueId: testVenue.id,
          email: `blocked-${Date.now()}@test.com`,
          role: "SERVER",
        }),
      ).rejects.toThrow("You must be an Owner or Manager to invite staff");
    });

    // Note: Future stories will add POS-specific permissions
    // SERVER should only access POS and assigned tables
  });

  describe("KITCHEN Role Permissions", () => {
    it("KITCHEN can access venue (for KDS)", async () => {
      const { id, email } = testUsers[StaffRole.KITCHEN];
      const caller = createCallerWithUser(id, email);

      // Kitchen staff should have basic venue access
      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff).toBeDefined();
    });

    // Note: Future stories will add KDS-specific permissions
  });

  describe("HOST Role Permissions", () => {
    it("HOST can access venue (for reservations)", async () => {
      const { id, email } = testUsers[StaffRole.HOST];
      const caller = createCallerWithUser(id, email);

      // Host should have basic venue access
      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff).toBeDefined();
    });

    // Note: Future stories will add reservation-specific permissions
  });

  describe("CASHIER Role Permissions", () => {
    it("CASHIER can access venue (for payments)", async () => {
      const { id, email } = testUsers[StaffRole.CASHIER];
      const caller = createCallerWithUser(id, email);

      // Cashier should have basic venue access
      const result = await caller.user.listStaff({ venueId: testVenue.id });
      expect(result.activeStaff).toBeDefined();
    });

    // Note: Future stories will add payment-specific permissions
  });

  describe("Cross-Role Restrictions", () => {
    it("non-OWNER/MANAGER cannot deactivate staff", async () => {
      const { id, email } = testUsers[StaffRole.SERVER];
      const caller = createCallerWithUser(id, email);

      // Get the host's assignment
      const hostAssignment = await db.staffAssignment.findFirst({
        where: {
          venueId: testVenue.id,
          role: StaffRole.HOST,
          deletedAt: null,
        },
      });

      if (hostAssignment) {
        await expect(
          caller.user.deactivateStaff({
            staffAssignmentId: hostAssignment.id,
          }),
        ).rejects.toThrow();
      }
    });

    it("cannot escalate own role", async () => {
      const { id, email } = testUsers[StaffRole.SERVER];
      const caller = createCallerWithUser(id, email);

      // Get server's own assignment
      const serverAssignment = await db.staffAssignment.findFirst({
        where: {
          userId: id,
          venueId: testVenue.id,
          deletedAt: null,
        },
      });

      if (serverAssignment) {
        await expect(
          caller.user.updateStaffRole({
            staffAssignmentId: serverAssignment.id,
            role: "OWNER",
          }),
        ).rejects.toThrow();
      }
    });
  });
});
