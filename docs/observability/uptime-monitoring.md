# Uptime Monitoring

This project exposes health endpoints for monitoring:
- `GET /api/health` – application heartbeat
- `GET /api/health/db` – database connectivity
- `GET /api/metrics` – in-memory metrics snapshot (MVP)

## Vercel Monitoring

- Enable Vercel Monitoring in project settings.
- Configure checks to poll `https://<deployment>/api/health` every 60s.
- Add alert for non-200 response sustained for 3 minutes.

## BetterStack (Optional)

If using BetterStack:
- Create monitor for `/api/health` and `/api/health/db`.
- Set regions close to deployment.
- Alerts: Slack channel `#oncall` and email `ops@crowdiant.com`.
- Escalation: page on-call if downtime > 10 minutes.

## Notes

- Health endpoints return 200 or 503 as appropriate.
- Metrics endpoint is MVP; will be replaced with Prometheus in future epics.
