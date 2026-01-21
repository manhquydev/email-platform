/**
 * BottomTabItem Unit Tests
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { BottomTabItem } from "./BottomTabItem";

describe("BottomTabItem", () => {
    const mockIcon = <svg data-testid="test-icon" />;
    const defaultProps = {
        id: "test-tab",
        label: "Test",
        icon: mockIcon,
        isActive: false,
        onClick: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders label and icon", () => {
        render(<BottomTabItem {...defaultProps} />);

        expect(screen.getByText("Test")).toBeInTheDocument();
        expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
        render(<BottomTabItem {...defaultProps} />);

        fireEvent.click(screen.getByRole("button"));
        expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it("sets aria-current when active", () => {
        render(<BottomTabItem {...defaultProps} isActive={true} />);

        expect(screen.getByRole("button")).toHaveAttribute("aria-current", "page");
    });

    it("does not set aria-current when inactive", () => {
        render(<BottomTabItem {...defaultProps} isActive={false} />);

        expect(screen.getByRole("button")).not.toHaveAttribute("aria-current");
    });

    it("displays badge when provided and > 0", () => {
        render(<BottomTabItem {...defaultProps} badge={5} />);

        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByLabelText("5 unread")).toBeInTheDocument();
    });

    it("does not display badge when 0", () => {
        render(<BottomTabItem {...defaultProps} badge={0} />);

        expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument();
    });

    it("does not display badge when undefined", () => {
        render(<BottomTabItem {...defaultProps} badge={undefined} />);

        expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument();
    });

    it("displays 99+ when badge exceeds 99", () => {
        render(<BottomTabItem {...defaultProps} badge={150} />);

        expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("displays exact count when badge is 99", () => {
        render(<BottomTabItem {...defaultProps} badge={99} />);

        expect(screen.getByText("99")).toBeInTheDocument();
    });

    it("has minimum touch target size (48px)", () => {
        render(<BottomTabItem {...defaultProps} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("min-h-[48px]");
        expect(button).toHaveClass("min-w-[64px]");
    });

    it("applies active styling when isActive is true", () => {
        render(<BottomTabItem {...defaultProps} isActive={true} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("text-v3-accent-primary");
    });

    it("applies inactive styling when isActive is false", () => {
        render(<BottomTabItem {...defaultProps} isActive={false} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("text-v3-text-muted");
    });
});
