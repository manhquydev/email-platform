import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ErrorPage } from "./ErrorPage";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

// Mock i18n
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                "errors.404.title": "Page Not Found",
                "errors.404.message": "The page you're looking for doesn't exist.",
                "errors.403.title": "Access Denied",
                "errors.403.message": "You don't have permission to access this page.",
                "errors.500.title": "Server Error",
                "errors.500.message": "An unexpected error occurred.",
                "errors.503.title": "Under Maintenance",
                "errors.503.message": "The system is currently under maintenance.",
                "common.back": "Go Back",
                "common.home": "Home",
                "common.retry": "Try Again",
                "common.support": "Support",
                "common.needHelp": "Need help?",
                "common.contactSupport": "Contact Support",
            };
            return translations[key] || key;
        },
    }),
}));

// Mock useClarity
vi.mock("../hooks/useClarity", () => ({
    useClarity: () => ({
        track: vi.fn(),
        setTag: vi.fn(),
    }),
}));

// Mock illustrations
vi.mock("../components/illustrations", () => ({
    Error404Illustration: () => <div data-testid="illustration-404">404 Illustration</div>,
    Error403Illustration: () => <div data-testid="illustration-403">403 Illustration</div>,
    Error500Illustration: () => <div data-testid="illustration-500">500 Illustration</div>,
    Error503Illustration: () => <div data-testid="illustration-503">503 Illustration</div>,
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe("ErrorPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("404 Error", () => {
        it("renders 404 page with correct content", () => {
            renderWithRouter(<ErrorPage code={404} />);

            expect(screen.getByTestId("illustration-404")).toBeInTheDocument();
            expect(screen.getByText("404")).toBeInTheDocument();
            expect(screen.getByText("Page Not Found")).toBeInTheDocument();
            expect(screen.getByText("The page you're looking for doesn't exist.")).toBeInTheDocument();
        });

        it("shows back and home buttons by default", () => {
            renderWithRouter(<ErrorPage code={404} />);

            expect(screen.getByText("Go Back")).toBeInTheDocument();
            expect(screen.getByText("Home")).toBeInTheDocument();
        });

        it("does not show retry button for 404", () => {
            renderWithRouter(<ErrorPage code={404} />);

            expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
        });
    });

    describe("403 Error", () => {
        it("renders 403 page with correct content", () => {
            renderWithRouter(<ErrorPage code={403} />);

            expect(screen.getByTestId("illustration-403")).toBeInTheDocument();
            expect(screen.getByText("403")).toBeInTheDocument();
            expect(screen.getByText("Access Denied")).toBeInTheDocument();
        });
    });

    describe("500 Error", () => {
        it("renders 500 page with correct content", () => {
            renderWithRouter(<ErrorPage code={500} />);

            expect(screen.getByTestId("illustration-500")).toBeInTheDocument();
            expect(screen.getByText("500")).toBeInTheDocument();
            expect(screen.getByText("Server Error")).toBeInTheDocument();
        });

        it("shows retry button for 500 errors", () => {
            renderWithRouter(<ErrorPage code={500} />);

            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });
    });

    describe("503 Error", () => {
        it("renders 503 page with correct content", () => {
            renderWithRouter(<ErrorPage code={503} />);

            expect(screen.getByTestId("illustration-503")).toBeInTheDocument();
            expect(screen.getByText("503")).toBeInTheDocument();
            expect(screen.getByText("Under Maintenance")).toBeInTheDocument();
        });

        it("shows retry button for 503 errors", () => {
            renderWithRouter(<ErrorPage code={503} />);

            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });
    });

    describe("Custom props", () => {
        it("renders custom title and description", () => {
            renderWithRouter(
                <ErrorPage
                    code={404}
                    title="Custom Title"
                    description="Custom description text"
                />
            );

            expect(screen.getByText("Custom Title")).toBeInTheDocument();
            expect(screen.getByText("Custom description text")).toBeInTheDocument();
        });

        it("hides back button when showBack is false", () => {
            renderWithRouter(<ErrorPage code={404} showBack={false} />);

            expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
            expect(screen.getByText("Home")).toBeInTheDocument();
        });

        it("hides home button when showHome is false", () => {
            renderWithRouter(<ErrorPage code={404} showHome={false} />);

            expect(screen.getByText("Go Back")).toBeInTheDocument();
            expect(screen.queryByText("Home")).not.toBeInTheDocument();
        });

        it("forces retry button when showRetry is true", () => {
            renderWithRouter(<ErrorPage code={404} showRetry={true} />);

            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });
    });

    describe("Support link", () => {
        it("shows support button by default", () => {
            renderWithRouter(<ErrorPage code={404} />);

            expect(screen.getByText("Support")).toBeInTheDocument();
        });

        it("shows help text with contact support link by default", () => {
            renderWithRouter(<ErrorPage code={404} />);

            expect(screen.getByText("Need help?")).toBeInTheDocument();
            expect(screen.getByText("Contact Support")).toBeInTheDocument();
        });

        it("hides support button when showSupport is false", () => {
            renderWithRouter(<ErrorPage code={404} showSupport={false} />);

            expect(screen.queryByText("Support")).not.toBeInTheDocument();
            expect(screen.queryByText("Need help?")).not.toBeInTheDocument();
            expect(screen.queryByText("Contact Support")).not.toBeInTheDocument();
        });

        it("shows support elements on all error types", () => {
            const codes = [403, 500, 503] as const;

            codes.forEach((code) => {
                const { unmount } = renderWithRouter(<ErrorPage code={code} />);
                expect(screen.getByText("Support")).toBeInTheDocument();
                expect(screen.getByText("Contact Support")).toBeInTheDocument();
                unmount();
            });
        });
    });
});
