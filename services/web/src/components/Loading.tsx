

interface LoadingProps {
    fullScreen?: boolean;
    message?: string;
    className?: string;
}

export function Loading({ fullScreen = false, message, className = "" }: LoadingProps) {
    if (fullScreen) {
        return (
            <div
                className="overlay"
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(255, 255, 255, 0.8)",
                    display: "flex",
                    placeItems: "center",
                    placeContent: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(2px)",
                }}
            >
                <div style={{ textAlign: "center", color: "#666" }}>
                    <div className="spinner" style={{ marginBottom: "1rem" }}></div>
                    {message && <div>{message}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className={`loading-inline ${className}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#888" }}>
            <div className="spinner small"></div>
            {message && <span>{message}</span>}
        </div>
    );
}
