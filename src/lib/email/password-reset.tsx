import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
  expiresAt: Date;
}

export function PasswordResetEmail({
  resetUrl,
  expiresAt,
}: PasswordResetEmailProps) {
  const formattedExpiry = expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Html>
      <Head />
      <Preview>Reset your Crowdiant password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset Your Password</Heading>

          <Text style={paragraph}>
            We received a request to reset your password for your Crowdiant
            account.
          </Text>

          <Text style={paragraph}>
            Click the button below to set a new password. This link will expire
            on {formattedExpiry}.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>

          <Text style={paragraph}>
            If you didn&apos;t request this password reset, you can safely
            ignore this email. Your password will remain unchanged.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If the button doesn&apos;t work, copy and paste this URL into your
            browser:
          </Text>
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent by Crowdiant. If you have questions, please
            contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  textAlign: "center" as const,
  margin: "0 0 30px",
  color: "#1a1a1a",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
  margin: "0 0 20px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "30px 0",
};

const footer = {
  fontSize: "12px",
  color: "#8898aa",
  margin: "0 0 10px",
};

const link = {
  fontSize: "12px",
  color: "#2563eb",
  wordBreak: "break-all" as const,
};
