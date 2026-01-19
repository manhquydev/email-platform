/**
 * Action handlers for MessageDetail
 */
import toast from "react-hot-toast";
import type { Message } from "../../types";
import { API_BASE } from "../../utils/api";

export function handleCopyContent(message: Message) {
    const content = message.textBody || message.htmlBody?.replace(/<[^>]*>/g, '') || '';
    navigator.clipboard.writeText(content).then(() => {
        toast.success('Đã sao chép nội dung email');
    }).catch(() => {
        toast.error('Không thể sao chép');
    });
}

export function handlePrint() {
    window.print();
}

export function handleExport(message: Message) {
    const link = document.createElement('a');
    link.href = `${API_BASE}/messages/${message.id}/export`;
    link.download = `email_${message.id.slice(0, 8)}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đang tải xuống file .eml');
}
