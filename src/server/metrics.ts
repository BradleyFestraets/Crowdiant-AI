// Simple in-memory metrics collection (MVP placeholder)
// Future: replace with Prometheus client or hosted metrics provider.

export type ApiCallMetric = {
  endpoint: string;
  durationMs: number;
  status: number;
  timestamp: number;
};

export type ErrorMetric = {
  endpoint?: string;
  message: string;
  code?: string;
  timestamp: number;
};

const apiCalls: ApiCallMetric[] = [];
const errors: ErrorMetric[] = [];

export function recordApiCall(
  endpoint: string,
  durationMs: number,
  status: number,
) {
  apiCalls.push({ endpoint, durationMs, status, timestamp: Date.now() });
  // Keep memory bounded
  if (apiCalls.length > 5000) apiCalls.shift();
}

export function recordError(message: string, endpoint?: string, code?: string) {
  errors.push({ message, endpoint, code, timestamp: Date.now() });
  if (errors.length > 2000) errors.shift();
}

export function getMetricsSnapshot() {
  const lastMinuteCutoff = Date.now() - 60_000;
  const recentCalls = apiCalls.filter((m) => m.timestamp >= lastMinuteCutoff);
  const avgLatency =
    recentCalls.reduce((sum, m) => sum + m.durationMs, 0) /
    (recentCalls.length || 1);
  const errorRate =
    recentCalls.filter((m) => m.status >= 500).length /
    (recentCalls.length || 1);
  return {
    counts: {
      apiCalls: apiCalls.length,
      errors: errors.length,
    },
    recent: {
      callsLastMinute: recentCalls.length,
      avgLatencyMs: Math.round(avgLatency),
      errorRate: Number(errorRate.toFixed(3)),
    },
  };
}
