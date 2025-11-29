import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/server/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = getMetricsSnapshot();
    return NextResponse.json({ status: "ok", metrics: snapshot });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
