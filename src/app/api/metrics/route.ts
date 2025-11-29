import { NextResponse } from "next/server";
import { metrics } from "@/server/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = metrics.getMetricsSnapshot();
    return NextResponse.json({ status: "ok", metrics: snapshot });
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
