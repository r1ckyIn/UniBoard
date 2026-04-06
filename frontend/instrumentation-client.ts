import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value ?? "";
      if (/ChunkLoadError|Loading chunk/.test(message)) return null;
      if (/Failed to fetch|NetworkError|Load failed/.test(message))
        return null;
      return event;
    },
  });
}

// Instrument App Router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
