import { NextRequest, NextResponse } from "next/server";

// Sentry tunnel route — proxies browser error reports to Sentry ingest,
// bypassing ad blockers that block requests to *.ingest.sentry.io.
// See: https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option

const ALLOWED_SENTRY_HOSTS = [".ingest.sentry.io", ".ingest.de.sentry.io"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const envelope = await request.text();
    const header = envelope.split("\n")[0];
    const dsn = new URL(JSON.parse(header).dsn);

    const hostname = dsn.hostname;
    if (!ALLOWED_SENTRY_HOSTS.some((h) => hostname.endsWith(h))) {
      return NextResponse.json({ error: "Invalid host" }, { status: 400 });
    }

    const projectId = dsn.pathname.replace("/", "");
    const upstreamUrl = `https://${hostname}/api/${projectId}/envelope/`;
    const response = await fetch(upstreamUrl, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
    });

    return new NextResponse(response.body, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Tunnel error" }, { status: 500 });
  }
}
