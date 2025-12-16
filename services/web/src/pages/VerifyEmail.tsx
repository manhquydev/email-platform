import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import { Loading } from "../components/Loading";

export function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [message, setMessage] = useState("");
    const processedRef = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No verification token provided.");
            return;
        }

        if (processedRef.current) return;
        processedRef.current = true;

        const verify = async () => {
            try {
                await api<{ ok: boolean; message: string }>("/auth/verify-email", {
                    method: "POST",
                    body: { token },
                });
                setStatus("success");
            } catch (err) {
                setStatus("error");
                setMessage((err as Error).toString());
            }
        };

        verify();
    }, [token]);

    if (status === "verifying") {
        return <Loading fullScreen message="Verifying your email..." />;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg text-center">
                {status === "success" ? (
                    <>
                        <div className="mb-4 text-green-500">
                            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="mb-4 text-2xl font-bold text-gray-800">Email Verified!</h1>
                        <p className="mb-6 text-gray-600">Your email has been successfully verified. You can now login to your account.</p>
                        <Link
                            to="/login"
                            className="inline-block w-full rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                        >
                            Go to Login
                        </Link>
                    </>
                ) : (
                    <>
                        <div className="mb-4 text-red-500">
                            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="mb-4 text-2xl font-bold text-gray-800">Verification Failed</h1>
                        <p className="mb-6 text-gray-600">{message}</p>
                        <Link
                            to="/login"
                            className="inline-block w-full rounded bg-gray-600 px-4 py-2 font-bold text-white hover:bg-gray-700"
                        >
                            Back to Login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
