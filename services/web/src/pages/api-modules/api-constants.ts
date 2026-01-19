/**
 * Constants and helpers for API page
 */

/** API endpoint definition */
export interface Endpoint {
    method: string;
    path: string;
    description: string;
    color: string;
}

/** List of API endpoints */
export const ENDPOINTS: Endpoint[] = [
    { method: "POST", path: "/inboxes", description: "Tạo inbox mới với domain tùy chọn", color: "green" },
    { method: "GET", path: "/inboxes", description: "Liệt kê tất cả inbox của bạn", color: "blue" },
    { method: "GET", path: "/inboxes/:id/messages", description: "Lấy danh sách email trong inbox", color: "blue" },
    { method: "GET", path: "/messages/:id", description: "Đọc nội dung chi tiết email (HTML/Text)", color: "blue" },
    { method: "DELETE", path: "/messages/:id", description: "Xóa một email", color: "red" },
    { method: "GET", path: "/domains", description: "Liệt kê domain đã cấu hình", color: "blue" },
    { method: "POST", path: "/webhooks", description: "Tạo webhook nhận thông báo email", color: "green" },
    { method: "GET", path: "/api-keys", description: "Quản lý API key của bạn", color: "blue" },
    { method: "GET", path: "/attachments/:id/download", description: "Tải file đính kèm", color: "blue" }
];

/** Get CSS classes for HTTP method badge */
export function getMethodColor(color: string): string {
    switch (color) {
        case "green": return "bg-green-500/20 text-green-400";
        case "blue": return "bg-blue-500/20 text-blue-400";
        case "red": return "bg-red-500/20 text-red-400";
        case "yellow": return "bg-yellow-500/20 text-yellow-400";
        default: return "bg-slate-500/20 text-slate-400";
    }
}
