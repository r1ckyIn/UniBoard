import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// Dynamic CSP: include Railway backend domain from env var (per D-06)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = apiUrl ? new URL(apiUrl).origin : "";

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://*.ingest.sentry.io",
  apiHost,
]
  .filter(Boolean)
  .join(" ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Emit source maps for production client bundles so DevTools Performance
  // traces and React profiles resolve minified names back to source files.
  // Repo is public; revealing source paths carries no secret risk.
  productionBrowserSourceMaps: true,
  // Forward Vercel system env var to the client bundle.
  // VERCEL_GIT_COMMIT_SHA is exposed server-side automatically, but Next.js
  // only embeds NEXT_PUBLIC_* into the browser. This mapping runs at build
  // time so each deployment gets its own immutable SHA string.
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

// Sentry plugin composition: Sentry outermost, then nextIntl (per D-02)
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    // Keep .map files on the CDN so DevTools in the browser can resolve
    // minified stack frames and Performance trace entries to source names.
    // Sentry still uploads its own copy for server-side symbolication.
    deleteSourcemapsAfterUpload: false,
  },
});
