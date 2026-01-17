/**
 * SectionErrorBoundary - Granular error boundary for page sections
 * Catches errors in individual sections without crashing the entire page
 */

import { Component, type ReactNode } from "react";
import { Button } from "../ui/Button";

interface Props {
    children: ReactNode;
    sectionName?: string;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class SectionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[SectionErrorBoundary:${this.props.sectionName || 'unknown'}]`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center p-8 bg-nebula-surface/50 rounded-xl border border-nebula-border">
                    <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-nebula-text mb-2">
                        {this.props.sectionName ? `Lỗi tải ${this.props.sectionName}` : "Đã xảy ra lỗi"}
                    </h3>
                    <p className="text-sm text-nebula-text-muted mb-4 text-center max-w-xs">
                        Phần này gặp sự cố. Bạn có thể thử tải lại.
                    </p>
                    <Button variant="secondary" size="sm" onClick={this.handleRetry}>
                        Thử lại
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
