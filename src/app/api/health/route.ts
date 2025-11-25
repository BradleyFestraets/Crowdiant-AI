export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: Date.now(),
    service: "crowdiant-os",
    environment: process.env.NODE_ENV,
  });
}
