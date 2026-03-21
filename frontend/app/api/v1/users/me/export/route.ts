import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";

export async function GET(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  return mockResponse({
    download_url: "https://s3.example.com/export/usr_001/data-export-20260321.zip",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  });
}
