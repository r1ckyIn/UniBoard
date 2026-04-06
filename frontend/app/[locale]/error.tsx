'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorBoundary');

  useEffect(() => {
    Sentry.captureException(error);
    console.error('[UniBoard Error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center max-w-md mx-auto p-8">
        <h2 className="font-serif text-2xl font-bold text-text-1 mb-3">
          {t('title')}
        </h2>
        <p className="text-text-2 mb-6">{t('description')}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-orange text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          {t('retry')}
        </button>
      </div>
    </div>
  );
}
