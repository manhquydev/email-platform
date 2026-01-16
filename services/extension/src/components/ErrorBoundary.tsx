import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { t } from '../shared/i18n';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Ephemera Error]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50 dark:bg-slate-950">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            {this.props.fallbackTitle || t('errorBoundary_title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4 max-w-xs">
            {t('errorBoundary_message')}
          </p>
          {this.state.error && (
            <details className="mb-4 max-w-full">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
            aria-label="Retry loading the application"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
