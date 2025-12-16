import { useState, type FormEvent } from "react";

export function LoginForm({
    onSubmit,
    busy,
}: {
    onSubmit: (email: string, password: string) => Promise<void>;
    busy: boolean;
}) {
    const [email, setEmail] = useState("admin@example.com");
    const [password, setPassword] = useState("changeme");

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        await onSubmit(email, password);
    };

    return (
        <form onSubmit={submit} className="stack" style={{ gap: "0.75rem" }}>
            <label className="label">
                Email
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    aria-label="Email"
                />
            </label>
            <label className="label">
                Mật khẩu
                <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    aria-label="Password"
                />
            </label>
            <button type="submit" disabled={busy}>
                {busy ? "Đang xử lý..." : "Đăng nhập"}
            </button>
        </form>
    );
}
