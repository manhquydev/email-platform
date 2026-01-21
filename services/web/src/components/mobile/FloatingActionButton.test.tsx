/**
 * FloatingActionButton Unit Tests
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { FloatingActionButton } from "./FloatingActionButton";

describe("FloatingActionButton", () => {
    const defaultProps = {
        onClick: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders with default plus icon", () => {
        render(<FloatingActionButton {...defaultProps} />);

        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
        // Default icon should be SVG
        expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
        render(<FloatingActionButton {...defaultProps} />);

        fireEvent.click(screen.getByRole("button"));
        expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it("has default aria-label of 'Create'", () => {
        render(<FloatingActionButton {...defaultProps} />);

        expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Create");
    });

    it("uses custom label for aria-label", () => {
        render(<FloatingActionButton {...defaultProps} label="Add Inbox" />);

        expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Add Inbox");
    });

    it("renders custom icon when provided", () => {
        const customIcon = <span data-testid="custom-icon">+</span>;
        render(<FloatingActionButton {...defaultProps} icon={customIcon} />);

        expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("is positioned fixed at bottom right", () => {
        render(<FloatingActionButton {...defaultProps} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("fixed");
        expect(button).toHaveClass("right-4");
        expect(button).toHaveClass("bottom-20");
    });

    it("has correct size (56px / w-14 h-14)", () => {
        render(<FloatingActionButton {...defaultProps} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("w-14");
        expect(button).toHaveClass("h-14");
    });

    it("is round (rounded-full)", () => {
        render(<FloatingActionButton {...defaultProps} />);

        expect(screen.getByRole("button")).toHaveClass("rounded-full");
    });

    it("applies hidden styles when hidden prop is true", () => {
        render(<FloatingActionButton {...defaultProps} hidden={true} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("translate-y-24");
        expect(button).toHaveClass("opacity-0");
        expect(button).toHaveClass("pointer-events-none");
    });

    it("does not apply hidden styles when hidden prop is false", () => {
        render(<FloatingActionButton {...defaultProps} hidden={false} />);

        const button = screen.getByRole("button");
        expect(button).not.toHaveClass("translate-y-24");
        expect(button).not.toHaveClass("opacity-0");
    });

    it("applies custom className", () => {
        render(<FloatingActionButton {...defaultProps} className="my-custom-class" />);

        expect(screen.getByRole("button")).toHaveClass("my-custom-class");
    });

    it("has z-index for layering above content", () => {
        render(<FloatingActionButton {...defaultProps} />);

        expect(screen.getByRole("button")).toHaveClass("z-40");
    });

    it("has shadow for elevation", () => {
        render(<FloatingActionButton {...defaultProps} />);

        expect(screen.getByRole("button")).toHaveClass("shadow-lg");
    });
});
