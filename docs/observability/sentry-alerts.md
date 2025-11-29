# Sentry Alerts (Initial Rules)

Configure the following alerts in Sentry:

- Critical API Errors
  - Query: `event.type:error AND (message:*payment* OR message:*auth*)`
  - Threshold: 3 errors in 5 minutes
  - Actions: Notify Slack `#oncall`, Email `ops@crowdiant.com`

- High Error Rate
  - Query: `event.type:error`
  - Threshold: Error rate > 5% over 10 minutes
  - Actions: Notify Slack `#oncall`

- Performance Degradation (Enable later)
  - Transaction: `trpc/*` and `api/*`
  - Threshold: p95 > 1500ms for 10 minutes
  - Actions: Notify Slack `#oncall`

Notes:
- Performance alerts are deferred until Epics 3 & 4 where key flows are implemented.
- Keep DSN configured in both server and client bundles.
