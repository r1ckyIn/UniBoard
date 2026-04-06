import { NextRequest, NextResponse } from "next/server";

const ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Session expired. Please sign in again.",
  403: "You don't have permission to access this resource.",
  404: "The requested resource was not found.",
  422: "The provided data could not be processed.",
  429: "Too many requests. Please try again later.",
  500: "Something went wrong. Please try again later.",
  502: "External service temporarily unavailable.",
  503: "Service temporarily unavailable.",
};

export interface ProxyOptions {
  /** Override backend path (for dynamic param routes like /courses/${id}) */
  backendPath?: string;
  /** Request body to forward (caller reads with request.text()) */
  body?: string | null;
  /** Additional headers to send to backend */
  extraHeaders?: Record<string, string>;
  /** Whether to return SSE streaming response */
  stream?: boolean;
}

export async function proxyRequest(
  request: NextRequest,
  options: ProxyOptions = {},
): Promise<NextResponse | Response> {
  const { backendPath, body, extraHeaders, stream } = options;

  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const targetUrl = `${base}${backendPath ?? url.pathname}${url.search}`;

  const headers: Record<string, string> = { ...extraHeaders };
  const auth = request.headers.get("Authorization");
  if (auth) headers["Authorization"] = auth;
  if (body != null) headers["Content-Type"] = "application/json";

  const resp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: body ?? undefined,
  });

  if (stream && resp.ok) {
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  if (!resp.ok) {
    const friendlyMessage =
      ERROR_MESSAGES[resp.status] ?? "An unexpected error occurred.";

    let code = "PROXY_ERROR";
    try {
      const errorBody = await resp.json();
      if (errorBody?.error?.code) {
        code = errorBody.error.code;
      }
    } catch {
      // Backend returned non-JSON error body -- use default code
    }

    return NextResponse.json(
      { error: { code, message: friendlyMessage } },
      { status: resp.status },
    );
  }

  if (resp.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
