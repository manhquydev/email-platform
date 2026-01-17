import { useRealtimeSubscription } from "../hooks/useRealtimeContext";
import toast from "react-hot-toast";
import type { Message } from "../types";
import type { RealtimeEvent, EmailNewPayload, EmailReadPayload, EmailDeletedPayload } from "../types/realtime";

interface UseDashboardRealtimeProps {
    selectedInbox: string;
    selectedMessage: Message | null;
    loadMessages: (inboxId: string, params?: { background?: boolean }) => Promise<void>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setSelectedMessage: React.Dispatch<React.SetStateAction<Message | null>>;
}

export function useDashboardRealtime({
    selectedInbox,
    selectedMessage,
    loadMessages,
    setMessages,
    setSelectedMessage,
}: UseDashboardRealtimeProps): void {
    useRealtimeSubscription("dashboard-email-events", (event: RealtimeEvent) => {
        if (!selectedInbox) return;

        if (event.type === "email.new") {
            const payload = event.payload as unknown as EmailNewPayload;
            if (payload.inboxId === selectedInbox) {
                toast.success(`Có email mới từ ${payload.from || "Unknown"}: ${payload.subject || "(No Subject)"}`, {
                    position: "bottom-right",
                    duration: 4000
                });
                loadMessages(selectedInbox, { background: true });
            }
        } else if (event.type === "email.read") {
            const payload = event.payload as unknown as EmailReadPayload;
            setMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, isRead: payload.isRead } : m));
            if (selectedMessage?.id === payload.messageId) {
                setSelectedMessage(prev => prev ? { ...prev, isRead: payload.isRead } : null);
            }
        } else if (event.type === "email.deleted") {
            const payload = event.payload as unknown as EmailDeletedPayload;
            if (payload.inboxId === selectedInbox) {
                setMessages(prev => prev.filter(m => m.id !== payload.messageId));
                if (selectedMessage?.id === payload.messageId) {
                    setSelectedMessage(null);
                }
            }
        }
    }, [selectedInbox, selectedMessage, loadMessages]);
}

export default useDashboardRealtime;
