import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// Dynamic CSP: include Railway backend domain from env var (per D-06)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = apiUrl ? new URL(apiUrl).origin : "";

// Allow non-hosted Supabase origins (e.g. local `supabase start` at 127.0.0.1:54321).
// The default CSP only whitelists *.supabase.co; when NEXT_PUBLIC_SUPABASE_URL points
// elsewhere (local dev, self-hosted), append that origin + its ws(s) variant.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseIsHosted =
  !supabaseOrigin || /\.supabase\.co$/i.test(new URL(supabaseUrl!).hostname);
const supabaseExtraOrigins = supabaseIsHosted
  ? []
  : [
      supabaseOrigin,
      supabaseOrigin.replace(/^http(s?):/, (_, s) => (s ? "wss:" : "ws:")),
    ];

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  ...supabaseExtraOrigins,
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
  // Phase 38.2: restore v14 router cache behaviour for dynamic routes. Next.js
  // 15.0.0 changed the default staleTimes.dynamic from 30s to 0s, which
  // defeats the client router cache for auth-gated pages (cookies()/headers()
  // make every dashboard page dynamic). Setting to 30s gives zero-latency
  // sidebar revisits within the cache window. See 38.2-RESEARCH.md R1/R6.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
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
