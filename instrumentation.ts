import * as Sentry from "@sentry/nextjs";

// Unified Sentry initialization replacing legacy sentry.*.config files.
// This consolidates client, server, and edge runtime configuration to remove deprecation warnings.
// DSN resolution prefers env vars; falls back to previously hard-coded DSN so telemetry is not lost.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "https://d26a98c0f5fc31f439784862ac05a916@o4510447705718784.ingest.us.sentry.io/4510447795372032";

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    enableLogs: true,
    sendDefaultPii: true,
  });
}

export const onRequestError = Sentry.captureRequestError;
