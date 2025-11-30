import { Resend } from "resend";
import { StaffInvitationEmail } from "./staff-invitation";
import { PasswordResetEmail } from "./password-reset";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendStaffInvitation(params: {
  to: string;
  venueName: string;
  inviterName: string;
  role: string;
  token: string;
}) {
  const inviteUrl = `${env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${params.token}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data, error } = await resend.emails.send({
    from: "Crowdiant <noreply@crowdiant.com>",
    to: params.to,
    subject: `You're invited to join ${params.venueName} on Crowdiant`,
    react: StaffInvitationEmail({
      venueName: params.venueName,
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl,
      expiresAt,
    }),
  });

  if (error) {
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }

  return data;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  token: string;
}) {
  const resetUrl = `${env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password/${params.token}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const { data, error } = await resend.emails.send({
    from: "Crowdiant <noreply@crowdiant.com>",
    to: params.to,
    subject: "Reset your Crowdiant password",
    react: PasswordResetEmail({
      resetUrl,
      expiresAt,
    }),
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }

  return data;
}
