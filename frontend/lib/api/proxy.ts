import { NextRequest, NextResponse } from "next/server";

/**
 * Backend URL resolved from environment variable with local fallback.
 * Uses NEXT_PUBLIC_API_URL since this runs server-side in Route Handlers.
 */
function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/**
 * User-friendly error messages mapped by HTTP status code.
 * These replace raw backend error messages to avoid leaking internals.
 */
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

/**
 * Options for customizing the proxy request behavior.
 */
export interface ProxyOptions {
  /** Override backend path (for dynamic param routes like /courses/${id}) */
  backendPath?: string;
  /** HTTP method override */
  method?: string;
  /** Request body to forward (caller reads with request.text()) */
  body?: string | null;
  /** Additional headers to send to backend */
  extraHeaders?: Record<string, string>;
  /** Whether to return SSE streaming response */
  stream?: boolean;
}

/**
 * Shared BFF proxy utility. Forwards an incoming Next.js Route Handler
 * request to the Python FastAPI backend, handling:
 * - URL construction with query parameter passthrough
 * - Authorization header forwarding (Supabase JWT)
 * - Structured error transformation with user-friendly messages
 * - 204 No Content responses (no JSON parse)
 * - SSE streaming passthrough for AI features
 *
 * @param request - Incoming NextRequest from Route Handler
 * @param options - Optional proxy configuration
 * @returns NextResponse (JSON) or raw Response (SSE stream)
 */
export async function proxyRequest(
  request: NextRequest,
  options: ProxyOptions = {},
): Promise<NextResponse | Response> {
  const { backendPath, method, body, extraHeaders, stream } = options;

  // Build target URL: backend base + path + query string
  const url = new URL(request.url);
  const targetPath = backendPath ?? url.pathname;
  const targetUrl = `${getBackendUrl()}${targetPath}${url.search}`;

  // Build headers: always forward Authorization
  const headers: Record<string, string> = {
    Authorization: request.headers.get("Authorization") || "",
    ...extraHeaders,
  };

  // Only set Content-Type for requests with a body
  if (body != null) {
    headers["Content-Type"] = "application/json";
  }

  // Forward request to backend
  const resp = await fetch(targetUrl, {
    method: method ?? request.method,
    headers,
    body: body ?? undefined,
  });

  // SSE streaming passthrough
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

  // Error responses: transform to user-friendly messages
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

  // 204 No Content: return empty response
  if (resp.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  // Standard JSON response passthrough
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
