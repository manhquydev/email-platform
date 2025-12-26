import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { ConfirmationModal } from "./ConfirmationModal";

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("ConfirmationModal", () => {
    const defaultProps = {
        isOpen: true,
        title: "Confirm Action",
        message: "Are you sure you want to do this?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    it("renders when open", () => {
        render(<ConfirmationModal {...defaultProps} />);
        expect(screen.getByText("Confirm Action")).toBeInTheDocument();
        expect(screen.getByText("Are you sure you want to do this?")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        const { container } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it("calls onConfirm when confirm button is clicked", () => {
        render(<ConfirmationModal {...defaultProps} />);
        fireEvent.click(screen.getByText("Xác nhận")); // Default label
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when cancel button is clicked", () => {
        render(<ConfirmationModal {...defaultProps} />);
        fireEvent.click(screen.getByText("Hủy")); // Default label
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("renders custom children", () => {
        render(
            <ConfirmationModal {...defaultProps}>
                <input data-testid="test-input" />
            </ConfirmationModal>
        );
        expect(screen.getByTestId("test-input")).toBeInTheDocument();
    });

    it("disables buttons and shows spinner when isLoading is true", () => {
        render(<ConfirmationModal {...defaultProps} isLoading={true} />);

        const confirmBtn = screen.getByText("Xác nhận").closest("button");
        const cancelBtn = screen.getByText("Hủy");

        expect(confirmBtn).toBeDisabled();
        expect(cancelBtn).toBeDisabled();

        // Check for spinner (SVG)
        expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("uses custom labels", () => {
        render(
            <ConfirmationModal
                {...defaultProps}
                confirmLabel="Yes, Delete"
                cancelLabel="No, Wait"
            />
        );
        expect(screen.getByText("Yes, Delete")).toBeInTheDocument();
        expect(screen.getByText("No, Wait")).toBeInTheDocument();
    });
});
