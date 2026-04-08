import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "./Settings";

const mockApi = vi.fn();

vi.mock("../context/AuthContext", () => ({
    useAuth: () => ({ token: "test-token" }),
}));

vi.mock("../utils/api", () => ({
    api: (...args: unknown[]) => mockApi(...args),
}));

vi.mock("../components/settings/GeneralSettings", () => ({
    GeneralSettings: () => <div>general-tab</div>,
}));

vi.mock("../components/settings/SecuritySettings", () => ({
    SecuritySettings: () => <div>security-tab</div>,
}));

vi.mock("../components/settings/SubscriptionSettings", () => ({
    SubscriptionSettings: () => <div>subscription-tab</div>,
}));

vi.mock("../components/settings/NotificationsSettings", () => ({
    NotificationsSettings: () => <div>notifications-tab</div>,
}));

vi.mock("../components/settings/DeveloperSettings", () => ({
    DeveloperSettings: () => <div>developer-tab</div>,
}));

vi.mock("../components/settings/FiltersTab", () => ({
    FiltersTab: () => <div>filters-tab</div>,
}));

vi.mock("../components/settings/LabelsTab", () => ({
    LabelsTab: () => <div>labels-tab</div>,
}));

vi.mock("../components/settings/TeamSettings", () => ({
    TeamSettings: () => <div>teams-tab</div>,
}));

vi.mock("../components/settings/RetentionSettings", () => ({
    RetentionSettings: () => <div>retention-tab</div>,
}));

vi.mock("../components/settings/SettingsTabs", () => ({
    SettingsTabs: () => <div>settings-tabs</div>,
}));

vi.mock("./settings-modules/referral-section", () => ({
    ReferralSection: () => <div>referral-tab</div>,
}));

function RouteProbe() {
    const location = useLocation();
    return <div data-testid="route">{`${location.pathname}${location.search}`}</div>;
}

function renderSettingsAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="/settings"
                    element={
                        <>
                            <Settings />
                            <RouteProbe />
                        </>
                    }
                />
                <Route
                    path="/my-domains"
                    element={
                        <>
                            <div>my-domains-page</div>
                            <RouteProbe />
                        </>
                    }
                />
            </Routes>
        </MemoryRouter>
    );
}

describe("Settings tab normalization", () => {
    beforeEach(() => {
        mockApi.mockImplementation((url: string) => {
            if (url === "/auth/me") {
                return Promise.resolve({
                    user: {
                        id: "u1",
                        email: "test@example.com",
                        role: "USER",
                        createdAt: new Date().toISOString(),
                        tier: "FREE",
                        emailVerified: null,
                        twoFactorEnabled: false,
                        _count: { domains: 0, inboxes: 0 },
                        usage: { domains: 0, inboxes: 0, storage: 0 },
                        limits: { domains: 1, inboxes: 1, storageGB: 1, dailyEmails: 100 },
                    },
                });
            }
            if (url === "/inboxes") {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({});
        });

        Object.defineProperty(window.HTMLElement.prototype, "scrollTo", {
            configurable: true,
            value: vi.fn(),
        });
    });

    it("normalizes billing tab to subscription", async () => {
        renderSettingsAt("/settings?tab=billing");

        await waitFor(() => {
            expect(screen.getByText("subscription-tab")).toBeInTheDocument();
        });

        expect(screen.getByTestId("route")).toHaveTextContent("/settings?tab=subscription");
    });

    it("redirects invalid tab to general", async () => {
        renderSettingsAt("/settings?tab=legacy-invalid");

        await waitFor(() => {
            expect(screen.getByText("general-tab")).toBeInTheDocument();
        });

        expect(screen.getByTestId("route")).toHaveTextContent("/settings?tab=general");
    });

    it("redirects legacy domains tab to /my-domains", async () => {
        renderSettingsAt("/settings?tab=domains");

        await waitFor(() => {
            expect(screen.getByText("my-domains-page")).toBeInTheDocument();
        });

        expect(screen.getByTestId("route")).toHaveTextContent("/my-domains");
    });
});
