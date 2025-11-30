import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sendStaffInvitation } from "~/lib/email";
import type { StaffRole } from "generated/prisma";

export const userRouter = createTRPCRouter({
  inviteStaff: protectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        email: z.string().email(),
        role: z.enum([
          "OWNER",
          "MANAGER",
          "SERVER",
          "KITCHEN",
          "HOST",
          "CASHIER",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const staffAssignment = await ctx.db.staffAssignment.findFirst({
        where: {
          userId: ctx.session.user.id,
          venueId: input.venueId,
          deletedAt: null,
          role: { in: ["OWNER", "MANAGER"] },
        },
        include: { venue: true },
      });

      if (!staffAssignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an Owner or Manager to invite staff",
        });
      }

      const existingStaff = await ctx.db.staffAssignment.findFirst({
        where: {
          venueId: input.venueId,
          deletedAt: null,
          user: { email: input.email },
        },
      });

      if (existingStaff) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This user is already a staff member at this venue",
        });
      }

      const existingInvitation = await ctx.db.staffInvitation.findFirst({
        where: {
          venueId: input.venueId,
          email: input.email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email",
        });
      }

      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await ctx.db.staffInvitation.create({
        data: {
          venueId: input.venueId,
          email: input.email,
          role: input.role as StaffRole,
          token,
          expiresAt,
          invitedById: ctx.session.user.id,
        },
      });

      try {
        await sendStaffInvitation({
          to: input.email,
          venueName: staffAssignment.venue.name,
          inviterName: ctx.session.user.name ?? "A team member",
          role: input.role,
          token,
        });
      } catch {
        await ctx.db.staffInvitation.delete({ where: { id: invitation.id } });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation email",
        });
      }

      return { success: true, invitationId: invitation.id };
    }),

  listStaff: protectedProcedure
    .input(z.object({ venueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const hasAccess = await ctx.db.staffAssignment.findFirst({
        where: {
          userId: ctx.session.user.id,
          venueId: input.venueId,
          deletedAt: null,
        },
      });

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this venue",
        });
      }

      const activeStaff = await ctx.db.staffAssignment.findMany({
        where: { venueId: input.venueId, deletedAt: null },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const pendingInvitations = await ctx.db.staffInvitation.findMany({
        where: {
          venueId: input.venueId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        activeStaff: activeStaff.map((staff) => ({
          id: staff.id,
          user: staff.user,
          role: staff.role,
          createdAt: staff.createdAt,
        })),
        pendingInvitations: pendingInvitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        })),
      };
    }),

  updateStaffRole: protectedProcedure
    .input(
      z.object({
        staffAssignmentId: z.string(),
        role: z.enum([
          "OWNER",
          "MANAGER",
          "SERVER",
          "KITCHEN",
          "HOST",
          "CASHIER",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetStaff = await ctx.db.staffAssignment.findUnique({
        where: { id: input.staffAssignmentId },
        include: { venue: true },
      });

      if (!targetStaff || targetStaff.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff assignment not found",
        });
      }

      const callerStaff = await ctx.db.staffAssignment.findFirst({
        where: {
          userId: ctx.session.user.id,
          venueId: targetStaff.venueId,
          deletedAt: null,
          role: { in: ["OWNER", "MANAGER"] },
        },
      });

      if (!callerStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an Owner or Manager to update roles",
        });
      }

      if (targetStaff.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      if (callerStaff.role === "MANAGER" && targetStaff.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Managers cannot change Owner roles",
        });
      }

      if (callerStaff.role === "MANAGER" && input.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Managers cannot promote staff to Owner",
        });
      }

      const updated = await ctx.db.staffAssignment.update({
        where: { id: input.staffAssignmentId },
        data: { role: input.role as StaffRole },
      });

      return { success: true, staffAssignment: updated };
    }),

  deactivateStaff: protectedProcedure
    .input(z.object({ staffAssignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetStaff = await ctx.db.staffAssignment.findUnique({
        where: { id: input.staffAssignmentId },
      });

      if (!targetStaff || targetStaff.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff assignment not found",
        });
      }

      const callerStaff = await ctx.db.staffAssignment.findFirst({
        where: {
          userId: ctx.session.user.id,
          venueId: targetStaff.venueId,
          deletedAt: null,
          role: { in: ["OWNER", "MANAGER"] },
        },
      });

      if (!callerStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an Owner or Manager to deactivate staff",
        });
      }

      if (targetStaff.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate yourself",
        });
      }

      if (targetStaff.role === "OWNER") {
        const ownerCount = await ctx.db.staffAssignment.count({
          where: {
            venueId: targetStaff.venueId,
            role: "OWNER",
            deletedAt: null,
          },
        });

        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot deactivate the last Owner",
          });
        }
      }

      await ctx.db.staffAssignment.update({
        where: { id: input.staffAssignmentId },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  acceptInvitation: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.staffInvitation.findUnique({
        where: { token: input.token },
        include: { venue: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invitation token",
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been used",
        });
      }

      let user = await ctx.db.user.findUnique({
        where: { email: invitation.email },
      });

      if (!user) {
        const passwordHash = await bcrypt.hash(input.password, 10);
        user = await ctx.db.user.create({
          data: {
            email: invitation.email,
            name: input.name,
            passwordHash,
          },
        });
      }

      await ctx.db.staffAssignment.create({
        data: {
          userId: user.id,
          venueId: invitation.venueId,
          role: invitation.role,
        },
      });

      await ctx.db.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { success: true, venueSlug: invitation.venue.slug };
    }),
});
