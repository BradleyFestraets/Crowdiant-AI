import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Section,
  Hr,
} from "@react-email/components";

interface StaffInvitationEmailProps {
  venueName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export function StaffInvitationEmail({
  venueName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: StaffInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Text style={heading}>
              You&apos;ve been invited to join {venueName}
            </Text>
            <Text style={paragraph}>
              {inviterName} has invited you to join <strong>{venueName}</strong>{" "}
              as a <strong>{role}</strong>.
            </Text>
            <Text style={paragraph}>
              Click the button below to accept your invitation and create your
              account.
            </Text>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              This invitation expires on{" "}
              {expiresAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              .
            </Text>
            <Text style={footer}>
              If you didn&apos;t expect this invitation, you can safely ignore
              this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#484848",
  marginBottom: "16px",
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
  marginTop: "24px",
  marginBottom: "24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  marginTop: "12px",
};
