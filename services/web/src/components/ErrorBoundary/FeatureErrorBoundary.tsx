/**
 * FeatureErrorBoundary - Error boundary for major features/modules
 * Provides more detailed error info and recovery options
 */

import { Component, type ReactNode } from "react";
import { Button } from "../ui/Button";

interface Props {
    children: ReactNode;
    featureName?: string;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class FeatureErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[FeatureErrorBoundary:${this.props.featureName || 'unknown'}]`, error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    handleGoBack = () => {
        window.history.back();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-nebula-surface rounded-2xl border border-nebula-border m-4">
                    <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-nebula-text mb-2">
                        {this.props.featureName ? `${this.props.featureName} gặp lỗi` : "Tính năng gặp lỗi"}
                    </h2>
                    <p className="text-sm text-nebula-text-muted mb-6 text-center max-w-md">
                        Đã xảy ra lỗi không mong muốn. Vui lòng thử lại hoặc quay lại trang trước.
                    </p>
                    {this.state.error && (
                        <details className="mb-6 w-full max-w-md">
                            <summary className="text-xs text-nebula-text-muted cursor-pointer hover:text-nebula-text">
                                Chi tiết lỗi
                            </summary>
                            <pre className="mt-2 p-3 bg-nebula-elevated rounded-lg text-xs text-danger overflow-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}
                    <div className="flex gap-3">
                        <Button variant="ghost" size="sm" onClick={this.handleGoBack}>
                            Quay lại
                        </Button>
                        <Button variant="primary" size="sm" onClick={this.handleRetry}>
                            Thử lại
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
