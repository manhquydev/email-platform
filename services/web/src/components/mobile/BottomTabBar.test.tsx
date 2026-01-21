/**
 * BottomTabBar Unit Tests
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { BottomTabBar, type TabItem } from "./BottomTabBar";

describe("BottomTabBar", () => {
    const mockTabs: TabItem[] = [
        { id: "inbox", label: "Inbox", icon: <svg data-testid="inbox-icon" /> },
        { id: "messages", label: "Messages", icon: <svg data-testid="messages-icon" />, badge: 5 },
        { id: "settings", label: "Settings", icon: <svg data-testid="settings-icon" /> },
    ];

    const defaultProps = {
        tabs: mockTabs,
        activeTab: "inbox",
        onTabChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders all tabs", () => {
        render(<BottomTabBar {...defaultProps} />);

        expect(screen.getByText("Inbox")).toBeInTheDocument();
        expect(screen.getByText("Messages")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders with tablist role", () => {
        render(<BottomTabBar {...defaultProps} />);

        expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("has accessible label", () => {
        render(<BottomTabBar {...defaultProps} />);

        expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Main navigation");
    });

    it("marks active tab correctly", () => {
        render(<BottomTabBar {...defaultProps} activeTab="messages" />);

        const buttons = screen.getAllByRole("button");
        const messagesButton = buttons.find(btn => btn.textContent?.includes("Messages"));

        expect(messagesButton).toHaveAttribute("aria-current", "page");
    });

    it("calls onTabChange with correct id when tab clicked", () => {
        render(<BottomTabBar {...defaultProps} />);

        fireEvent.click(screen.getByText("Messages"));
        expect(defaultProps.onTabChange).toHaveBeenCalledWith("messages");
    });

    it("displays badge on tab with badge prop", () => {
        render(<BottomTabBar {...defaultProps} />);

        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("applies custom className", () => {
        render(<BottomTabBar {...defaultProps} className="custom-class" />);

        expect(screen.getByRole("tablist")).toHaveClass("custom-class");
    });

    it("is fixed at bottom", () => {
        render(<BottomTabBar {...defaultProps} />);

        const nav = screen.getByRole("tablist");
        expect(nav).toHaveClass("fixed");
        expect(nav).toHaveClass("bottom-0");
    });

    it("has safe area bottom padding", () => {
        render(<BottomTabBar {...defaultProps} />);

        expect(screen.getByRole("tablist")).toHaveClass("safe-area-bottom");
    });

    it("renders correct number of tabs", () => {
        render(<BottomTabBar {...defaultProps} />);

        const buttons = screen.getAllByRole("button");
        expect(buttons).toHaveLength(3);
    });

    it("switches active state correctly on tab change", () => {
        const { rerender } = render(<BottomTabBar {...defaultProps} activeTab="inbox" />);

        // Initial state - inbox active
        let buttons = screen.getAllByRole("button");
        expect(buttons[0]).toHaveAttribute("aria-current", "page");
        expect(buttons[1]).not.toHaveAttribute("aria-current");

        // Change to messages
        rerender(<BottomTabBar {...defaultProps} activeTab="messages" />);

        buttons = screen.getAllByRole("button");
        expect(buttons[0]).not.toHaveAttribute("aria-current");
        expect(buttons[1]).toHaveAttribute("aria-current", "page");
    });
});
