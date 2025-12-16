import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export function Login() {
    const { login, token, busy } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        if (token) {
            navigate("/");
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch (err) {
            toast.error((err as Error).message || "Đăng nhập thất bại");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">Đăng nhập</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            placeholder="admin@example.com"
                            disabled={busy}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            placeholder="••••••••"
                            disabled={busy}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        disabled={busy}
                    >
                        {busy ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Chưa có tài khoản?{" "}
                    <Link to="/register" className="text-blue-600 hover:underline">
                        Đăng ký
                    </Link>
                </p>
            </div>
        </div>
    );
}
