import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const gitSha = process.env.VERCEL_GIT_COMMIT_SHA;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    release: gitSha ? `uniboard-web@${gitSha.slice(0, 8)}` : undefined,
  });
}
