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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus("error");
             
            setMessage("No verification token provided");
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
        <div className="flex min-h-screen items-center justify-center bg-[var(--nebula-void)] p-4">
            <div className="w-full max-w-md rounded-2xl bg-[var(--nebula-surface)] border border-[var(--nebula-border)] p-6 shadow-lg text-center">
                {status === "success" ? (
                    <>
                        <div className="mb-4 text-green-500">
                            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="mb-4 text-2xl font-bold text-[var(--nebula-text)]">Email Verified!</h1>
                        <p className="mb-6 text-[var(--nebula-text-secondary)]">Your email has been successfully verified. You can now login to your account.</p>
                        <Link
                            to="/login"
                            className="inline-block w-full rounded-xl bg-[var(--nebula-violet)] px-4 py-3 font-bold text-white hover:bg-[var(--nebula-violet-dark)] transition-colors"
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
                        <h1 className="mb-4 text-2xl font-bold text-[var(--nebula-text)]">Verification Failed</h1>
                        <p className="mb-6 text-[var(--nebula-text-secondary)]">{message}</p>
                        <Link
                            to="/login"
                            className="inline-block w-full rounded-xl bg-[var(--nebula-elevated)] border border-[var(--nebula-border)] px-4 py-3 font-bold text-[var(--nebula-text)] hover:bg-[var(--nebula-border)] transition-colors"
                        >
                            Back to Login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
