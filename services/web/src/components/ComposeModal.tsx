import { useState } from "react";
import type { Inbox } from "../types";
import { api } from "../utils/api";

type Props = {
    token: string;
    inboxes: Inbox[];
    onClose: () => void;
};

export function ComposeModal({ token, inboxes, onClose }: Props) {
    const [composeFrom, setComposeFrom] = useState("");
    const [composeTo, setComposeTo] = useState("");
    const [composeSubject, setComposeSubject] = useState("");
    const [composeBody, setComposeBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleCompose = async () => {
        if (!composeFrom || !composeTo || !composeSubject) return;
        setBusy(true);
        setError("");
        try {
            await api("/messages/outbound", {
                method: "POST",
                token,
                body: {
                    from: composeFrom,
                    to: composeTo,
                    subject: composeSubject,
                    text: composeBody,
                },
            });
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h3>Soạn thư mới</h3>
                {error && <div className="danger small">{error}</div>}
                <label className="label">
                    Từ (Sender)
                    <select value={composeFrom} onChange={(e) => setComposeFrom(e.target.value)}>
                        <option value="">Chọn địa chỉ gửi</option>
                        {inboxes.map((i) => (
                            <option key={i.id} value={`${i.localPart}@${i.domain?.name}`}>
                                {i.localPart}@{i.domain?.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="label">
                    Đến (Recipient)
                    <input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" />
                </label>
                <label className="label">
                    Chủ đề
                    <input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Hello there" />
                </label>
                <label className="label">
                    Nội dung
                    <textarea
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        rows={5}
                        style={{ width: "100%", padding: "0.5rem" }}
                    />
                </label>
                <div className="row" style={{ justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                    <button onClick={onClose} disabled={busy} type="button" style={{ background: "#ccc", color: "#333" }}>
                        Hủy
                    </button>
                    <button onClick={handleCompose} disabled={busy || !composeFrom} type="button">
                        {busy ? "Đang gửi..." : "Gửi thư"}
                    </button>
                </div>
            </div>
        </div>
    );
}
