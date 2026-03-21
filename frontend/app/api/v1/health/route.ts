import { NextResponse } from "next/server";

/**
 * Health check endpoint — no auth required, no simulated errors, no delay.
 * Returns system status and upstream service health checks.
 */
export async function GET() {
  return NextResponse.json(
    {
      data: {
        status: "healthy" as const,
        version: "1.0.0",
        checks: {
          database: "ok" as const,
          canvas_api: "ok" as const,
          ed_api: "ok" as const,
          cognito: "ok" as const,
        },
        timestamp: new Date().toISOString(),
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 },
  );
}
