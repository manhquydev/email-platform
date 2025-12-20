import { render, screen } from "@testing-library/react";
import App from "./App";
import { vi } from "vitest";

// Mock IntersectionObserver which is often used in animations/lazy loading but missing in jsdom
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe.skip("App", () => {
  it("renders landing page at root", async () => {
    window.history.pushState({}, 'Home', '/');
    render(<App />);
    // Wait for loading to finish and landing page to appear
    const brand = await screen.findByText("Ephemera", {}, { timeout: 4000 });
    expect(brand).toBeInTheDocument();
  });
});
