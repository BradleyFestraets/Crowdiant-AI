import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  venueProtectedProcedure,
} from "~/server/api/trpc";

/**
 * Venue Router
 * Handles venue access and management operations
 */
export const venueRouter = createTRPCRouter({
  /**
   * List all venues the current user has access to
   * Returns venues where user has active StaffAssignment (not soft-deleted)
   */
  listAccessible: protectedProcedure.query(async ({ ctx }) => {
    const assignments = await ctx.db.staffAssignment.findMany({
      where: {
        userId: ctx.session.user.id,
        deletedAt: null,
      },
      include: {
        venue: true,
      },
    });

    return assignments.map((a) => a.venue);
  }),

  /**
   * Get a specific venue by ID
   * Requires venue access (validated by venueProtectedProcedure middleware)
   */
  getById: venueProtectedProcedure
    .input(
      z.object({
        venueId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Middleware has already verified access via StaffAssignment
      const venue = await ctx.db.venue.findUnique({
        where: { id: input.venueId },
      });

      if (!venue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue not found",
        });
      }

      return venue;
    }),
});
