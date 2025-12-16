import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders login form when no token", async () => {
    render(<App />);
    const loginTexts = await screen.findAllByText(/Đăng nhập/i);
    expect(loginTexts[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng nhập/i })).toBeInTheDocument();
  });
});
