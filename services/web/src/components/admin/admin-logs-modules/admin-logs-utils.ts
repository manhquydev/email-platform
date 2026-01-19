/**
 * Types and constants for AdminLogs
 */

export interface AuditLog {
    id: string;
    action: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
    user: { email: string } | null;
}

export interface AdminLogsProps {
    token: string;
}

export const PAGE_SIZE = 50;

/** Action labels for display */
export const ACTION_LABELS: Record<string, string> = {
    USER_REGISTERED: "Đăng ký tài khoản",
    EMAIL_VERIFIED: "Xác thực email",
    LOGIN: "Đăng nhập",
    PASSWORD_CHANGED: "Đổi mật khẩu",
    USER_UPDATED: "Cập nhật user",
    DOMAIN_CREATED: "Tạo domain",
    DOMAIN_VERIFIED: "Xác thực domain",
    DOMAIN_DELETED: "Xóa domain",
    INBOX_CREATED: "Tạo inbox",
    PUBLIC_INBOX_CREATED: "Tạo inbox công khai",
    MESSAGE_DELETED: "Xóa email",
    RULE_CREATED: "Tạo quy tắc",
    RULE_DELETED: "Xóa quy tắc",
    ABUSE_REPORTED: "Báo cáo vi phạm",
    ABUSE_REPORT_UPDATED: "Cập nhật báo cáo",
};

export const AVAILABLE_ACTIONS = Object.keys(ACTION_LABELS);
