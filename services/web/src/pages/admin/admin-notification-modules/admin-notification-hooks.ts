/**
 * Types and hooks for AdminNotificationPage
 */
import { useState, type FormEvent } from "react";
import { api, API_BASE } from "../../../utils/api";
import { getFriendlyErrorMessage } from "../../../utils/errorMapping";
import toast from "react-hot-toast";

export type NotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "PROMOTION";
export type TargetMode = "specific" | "all";

export interface NotificationFormState {
    title: string;
    message: string;
    type: NotificationType;
    targetMode: TargetMode;
    targetUserId: string;
    imageUrl: string;
    busy: boolean;
}

/** Hook to manage notification form state and submission */
export function useNotificationForm(token: string | null) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState<NotificationType>("INFO");
    const [targetMode, setTargetMode] = useState<TargetMode>("specific");
    const [targetUserId, setTargetUserId] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [busy, setBusy] = useState(false);

    const resetForm = () => {
        setTitle("");
        setMessage("");
        setType("INFO");
        setTargetUserId("");
        setImageUrl("");
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();

        if (targetMode === "specific" && !targetUserId) {
            toast.error("Vui lòng nhập ID người dùng");
            return;
        }

        if (!title.trim() || !message.trim()) {
            toast.error("Vui lòng nhập tiêu đề và nội dung");
            return;
        }

        setBusy(true);
        const toastId = toast.loading("Đang gửi thông báo...");

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = { title, message, type, imageUrl };

            if (targetMode === "specific") {
                payload.targetUserId = targetUserId;
            } else {
                payload.sendToAll = true;
            }

            const res = await api<{ success: boolean; count?: number }>("/notifications/admin/send", {
                method: "POST",
                token: token || undefined,
                body: payload
            });

            toast.success(`Gửi thành công cho ${res.count || 1} người dùng`, { id: toastId });
            resetForm();
        } catch (error) {
            toast.error(getFriendlyErrorMessage((error as Error).message), { id: toastId });
        } finally {
            setBusy(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const toastId = toast.loading("Đang tải ảnh lên...");
        try {
            const res = await fetch(`${API_BASE}/uploads/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setImageUrl(data.url);
            toast.success("Tải ảnh thành công", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Tải ảnh thất bại", { id: toastId });
        }
    };

    return {
        title, setTitle,
        message, setMessage,
        type, setType,
        targetMode, setTargetMode,
        targetUserId, setTargetUserId,
        imageUrl, setImageUrl,
        busy,
        submit,
        handleImageUpload
    };
}
