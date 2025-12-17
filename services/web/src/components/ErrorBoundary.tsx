import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-4">
                    <div className="bg-surface border border-border rounded-lg p-8 max-w-md text-center">
                        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-xl font-semibold mb-2">Đã xảy ra lỗi</h2>
                        <p className="text-muted text-sm mb-4">
                            {this.state.error?.message || "Không thể tải trang. Vui lòng thử lại."}
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                            >
                                Thử lại
                            </button>
                            <button
                                onClick={() => window.location.href = "/"}
                                className="px-4 py-2 border border-border rounded-md hover:bg-bg"
                            >
                                Về trang chủ
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
