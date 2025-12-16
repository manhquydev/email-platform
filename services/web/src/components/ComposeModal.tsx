import { useState } from "react";
import type { Inbox } from "../types";
import { api } from "../utils/api";
import { Editor } from "./Editor";

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
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleCompose = async () => {
        if (!composeFrom || !composeTo || !composeSubject) return;
        setBusy(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("from", composeFrom);
            formData.append("to", composeTo);
            formData.append("subject", composeSubject);
            formData.append("text", composeBody); // Fallback text
            formData.append("html", composeBody); // Send HTML

            files.forEach(f => {
                formData.append("attachments", f);
            });

            await api("/messages/outbound", {
                method: "POST",
                token,
                body: formData,
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
            <div className="modal" style={{ width: "800px", maxWidth: "95vw" }}>
                <h3>Soạn thư mới</h3>
                {error && <div className="danger small">{error}</div>}
                <div className="row">
                    <div style={{ flex: 1 }}>
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
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="label">
                            Đến (Recipient)
                            <input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" />
                        </label>
                    </div>
                </div>

                <label className="label">
                    Chủ đề
                    <input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Hello there" />
                </label>

                <label className="label" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "300px" }}>
                    Nội dung
                    <Editor
                        value={composeBody}
                        onChange={setComposeBody}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                        placeholder="Soạn nội dung email..."
                    />
                </label>

                <label className="label">
                    Đính kèm tệp
                    <input
                        type="file"
                        multiple
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        style={{ display: 'block', marginTop: '0.5rem' }}
                    />
                    {files.length > 0 && <div className="small muted">{files.length} tệp đã chọn</div>}
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
