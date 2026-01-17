/**
 * ErrorPage Component
 * Reusable error page for 404, 403, 500, 503 errors
 * Uses i18n translations and custom SVG illustrations
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useClarity } from '../hooks/useClarity';
import {
  Error404Illustration,
  Error403Illustration,
  Error500Illustration,
  Error503Illustration,
} from '../components/illustrations';

type ErrorCode = 404 | 403 | 500 | 503;

interface ErrorPageProps {
  code: ErrorCode;
  title?: string;
  description?: string;
  showRetry?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  showSupport?: boolean;
  onRetry?: () => void;
}

// Map error codes to illustrations and accent colors
const errorConfig = {
  404: {
    Illustration: Error404Illustration,
    accentClass: 'text-warning',
    bgClass: 'bg-warning/10',
  },
  403: {
    Illustration: Error403Illustration,
    accentClass: 'text-danger',
    bgClass: 'bg-danger/10',
  },
  500: {
    Illustration: Error500Illustration,
    accentClass: 'text-danger',
    bgClass: 'bg-danger/10',
  },
  503: {
    Illustration: Error503Illustration,
    accentClass: 'text-warning',
    bgClass: 'bg-warning/10',
  },
};

export function ErrorPage({
  code,
  title,
  description,
  showRetry,
  showHome = true,
  showBack = true,
  showSupport = true,
  onRetry,
}: ErrorPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track, setTag } = useClarity();

  // Track error page view on mount
  useEffect(() => {
    track(`error_page_${code}`);
    setTag('error_code', String(code));
  }, [code, track, setTag]);

  // Default showRetry based on error type (server errors should show retry)
  const shouldShowRetry = showRetry ?? (code === 500 || code === 503);

  const config = errorConfig[code];
  const { Illustration } = config;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  const handleSupport = () => {
    navigate('/support');
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="neo-glass-card p-8 md:p-12 text-center max-w-md w-full">
        {/* Illustration */}
        <div className={`mx-auto mb-6 ${config.accentClass}`}>
          <Illustration size={180} />
        </div>

        {/* Error Code Badge */}
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${config.bgClass} ${config.accentClass}`}>
          {code}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold mb-3 text-[var(--color-text-main)]">
          {title || t(`errors.${code}.title`)}
        </h1>

        {/* Description */}
        <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">
          {description || t(`errors.${code}.message`)}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBack && (
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={t('common.back')}
            >
              {t('common.back')}
            </button>
          )}

          {showHome && (
            <button
              onClick={handleHome}
              className="px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={t('common.home')}
            >
              {t('common.home')}
            </button>
          )}

          {shouldShowRetry && (
            <button
              onClick={handleRetry}
              className="px-5 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={t('common.retry')}
            >
              {t('common.retry')}
            </button>
          )}

          {showSupport && (
            <button
              onClick={handleSupport}
              className="px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={t('common.support')}
            >
              {t('common.support')}
            </button>
          )}
        </div>

        {/* Help Text Link */}
        {showSupport && (
          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            {t('common.needHelp')}{' '}
            <button
              onClick={handleSupport}
              className="text-primary hover:underline focus:outline-none"
            >
              {t('common.contactSupport')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
