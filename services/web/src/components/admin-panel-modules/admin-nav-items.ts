/**
 * Navigation items configuration for AdminPanel
 */
import { adminIcons, type NavItem, type SidebarCounts } from "./types.tsx";

export function getNavItems(counts: SidebarCounts): NavItem[] {
    return [
        { id: "dashboard", label: "Tổng quan", path: "/admin", icon: adminIcons.dashboard, end: true },
        { id: "users", label: "Người dùng", path: "/admin/users", icon: adminIcons.users, badge: counts.totalUsers },
        { id: "packages", label: "Gói cước", path: "/admin/packages", icon: adminIcons.creditCard },
        { id: "codes", label: "Mã đổi thưởng", path: "/admin/codes", icon: adminIcons.ticket },
        { id: "orders", label: "Đơn hàng", path: "/admin/orders", icon: adminIcons.receipt },
        { id: "inboxes", label: "Hộp thư", path: "/admin/inboxes", icon: adminIcons.inbox },
        { id: "emails", label: "Email", path: "/admin/emails", icon: adminIcons.email },
        { id: "rules", label: "Quy tắc bảo vệ", path: "/admin/rules", icon: adminIcons.shield },
        { id: "domains", label: "Tên miền", path: "/admin/domains", icon: adminIcons.globe, badge: counts.totalDomains },
        { id: "reports", label: "Báo cáo", path: "/admin/reports", icon: adminIcons.flag, badge: counts.openReports },
        { id: "logs", label: "Nhật ký", path: "/admin/logs", icon: adminIcons.clock },
        { id: "system", label: "Hệ thống", path: "/admin/system", icon: adminIcons.server },
        { id: "notifications", label: "Thông báo", path: "/admin/notifications", icon: adminIcons.notifications },
        { id: "analytics", label: "Analytics", path: "/admin/analytics", icon: adminIcons.analytics },
        { id: "telegram", label: "Telegram", path: "/admin/telegram", icon: adminIcons.telegram },
        { id: "settings", label: "Cài đặt", path: "/admin/settings", icon: adminIcons.cog },
        { id: "backup", label: "Backup", path: "/admin/backup", icon: adminIcons.backup },
    ];
}
