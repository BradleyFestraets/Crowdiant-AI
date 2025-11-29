import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { StaffRole } from "../../../../generated/prisma";

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
   * Create a new venue and assign current user as OWNER.
   * Generates a unique slug from name; appends numeric suffix if collision.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        timezone: z.string().min(3).max(50),
        currency: z.string().length(3).toUpperCase(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Generate slug
      const baseSlug = input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 48);

      let slug = baseSlug || "venue";
      let attempt = 1;
      while (
        await ctx.db.venue.findUnique({
          where: { slug },
          select: { id: true },
        })
      ) {
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
        if (attempt > 10) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Unable to generate unique venue slug",
          });
        }
      }

      const venue = await ctx.db.venue.create({
        data: {
          name: input.name,
          slug,
          timezone: input.timezone,
          currency: input.currency.toUpperCase(),
        },
      });

      await ctx.db.staffAssignment.create({
        data: {
          userId: ctx.session.user.id,
          venueId: venue.id,
          role: StaffRole.OWNER,
        },
      });

      return { success: true, venueId: venue.id, slug: venue.slug };
    }),
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
