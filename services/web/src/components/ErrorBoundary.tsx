/**
 * ErrorBoundary Component
 * Catches runtime errors and displays ErrorPage(500)
 * Uses window.location for navigation (works without Router context)
 */

import { Component, type ReactNode } from "react";
import { ErrorPage } from "../pages/ErrorPage";

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
                <ErrorPage
                    code={500}
                    showRetry
                    showBack={false}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}
