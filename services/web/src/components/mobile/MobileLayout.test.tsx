/**
 * MobileLayout Unit Tests
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { MobileLayout, type MobileTab } from "./MobileLayout";

describe("MobileLayout", () => {
    const defaultProps = {
        children: <div data-testid="content">Main Content</div>,
        activeTab: "inboxes" as MobileTab,
        onTabChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders children content", () => {
        render(<MobileLayout {...defaultProps} />);

        expect(screen.getByTestId("content")).toBeInTheDocument();
        expect(screen.getByText("Main Content")).toBeInTheDocument();
    });

    it("renders all four tabs", () => {
        render(<MobileLayout {...defaultProps} />);

        expect(screen.getByText("Inboxes")).toBeInTheDocument();
        expect(screen.getByText("Messages")).toBeInTheDocument();
        expect(screen.getByText("Search")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("calls onTabChange when tab is clicked", () => {
        render(<MobileLayout {...defaultProps} />);

        fireEvent.click(screen.getByText("Messages"));
        expect(defaultProps.onTabChange).toHaveBeenCalledWith("messages");
    });

    it("marks correct tab as active", () => {
        render(<MobileLayout {...defaultProps} activeTab="settings" />);

        const settingsButton = screen.getByText("Settings").closest("button");
        expect(settingsButton).toHaveAttribute("aria-current", "page");
    });

    it("displays unread count badge on Messages tab", () => {
        render(<MobileLayout {...defaultProps} unreadCount={10} />);

        expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("displays 99+ for large unread counts", () => {
        render(<MobileLayout {...defaultProps} unreadCount={150} />);

        expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("does not display badge when unreadCount is 0", () => {
        render(<MobileLayout {...defaultProps} unreadCount={0} />);

        expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument();
    });

    it("renders FAB when on inboxes tab", () => {
        render(<MobileLayout {...defaultProps} activeTab="inboxes" onCreateInbox={vi.fn()} />);

        expect(screen.getByLabelText("Create new inbox")).toBeInTheDocument();
    });

    it("renders FAB when on messages tab", () => {
        render(<MobileLayout {...defaultProps} activeTab="messages" onCreateInbox={vi.fn()} />);

        expect(screen.getByLabelText("Create new inbox")).toBeInTheDocument();
    });

    it("does not render FAB on search tab", () => {
        render(<MobileLayout {...defaultProps} activeTab="search" onCreateInbox={vi.fn()} />);

        expect(screen.queryByLabelText("Create new inbox")).not.toBeInTheDocument();
    });

    it("does not render FAB on settings tab", () => {
        render(<MobileLayout {...defaultProps} activeTab="settings" onCreateInbox={vi.fn()} />);

        expect(screen.queryByLabelText("Create new inbox")).not.toBeInTheDocument();
    });

    it("hides FAB when hideFab prop is true", () => {
        render(<MobileLayout {...defaultProps} activeTab="inboxes" hideFab={true} />);

        expect(screen.queryByLabelText("Create new inbox")).not.toBeInTheDocument();
    });

    it("calls onCreateInbox when FAB is clicked", () => {
        const onCreateInbox = vi.fn();
        render(<MobileLayout {...defaultProps} activeTab="inboxes" onCreateInbox={onCreateInbox} />);

        fireEvent.click(screen.getByLabelText("Create new inbox"));
        expect(onCreateInbox).toHaveBeenCalledTimes(1);
    });

    it("applies custom className to main content", () => {
        render(<MobileLayout {...defaultProps} className="custom-content-class" />);

        const main = screen.getByRole("main");
        expect(main).toHaveClass("custom-content-class");
    });

    it("has bottom padding for tab bar", () => {
        render(<MobileLayout {...defaultProps} />);

        const main = screen.getByRole("main");
        expect(main).toHaveClass("pb-16");
    });

    it("renders navigation with tablist role", () => {
        render(<MobileLayout {...defaultProps} />);

        expect(screen.getByRole("tablist")).toBeInTheDocument();
    });
});
