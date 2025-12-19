export const ERROR_MAPPINGS: Record<string, string> = {
    // Auth
    "User not found": "Không tìm thấy người dùng",
    "Invalid password": "Mật khẩu không chính xác",
    "User already exists": "Người dùng đã tồn tại",
    "Email not verified": "Email chưa được xác thực",
    "Account disabled": "Tài khoản đã bị vô hiệu hóa",
    "Invalid 2FA code": "Mã xác thực 2 lớp không đúng",
    "2FA not enabled": "Xác thực 2 lớp chưa được kích hoạt",
    "Token expired": "Phiên đăng nhập đã hết hạn",
    "Invalid token": "Token không hợp lệ",

    // Domain/Inbox
    "Domain not found": "Không tìm thấy tên miền",
    "Inbox not found": "Không tìm thấy hộp thư",
    "Domain already exists": "Tên miền đã tồn tại",
    "Inbox already exists": "Hộp thư đã tồn tại",
    "Quota exceeded": "Đã vượt quá giới hạn dung lượng",
    "Domain verification failed": "Xác thực tên miền thất bại",

    // General
    "Internal server error": "Lỗi máy chủ nội bộ",
    "Bad request": "Yêu cầu không hợp lệ",
    "Unauthorized": "Không có quyền truy cập",
    "Forbidden": "Bị từ chối truy cập",
    "Not found": "Không tìm thấy dữ liệu",
    "Method not allowed": "Phương thức không được hỗ trợ",
    "Conflict": "Dữ liệu bị xung đột",
    "Payload too large": "Dữ liệu gửi lên quá lớn",
    "Too many requests": "Gửi quá nhiều yêu cầu, vui lòng thử lại sau",

    // Validation
    "Validation error": "Lỗi dữ liệu đầu vào",
    "Invalid email": "Email không hợp lệ",
    "Weak password": "Mật khẩu quá yếu",

    // System
    "Service unavailable": "Dịch vụ tạm thời gián đoạn",
    "Gateway timeout": "Hết thời gian chờ phản hồi",
    "Network error": "Lỗi kết nối mạng",
};

export function getFriendlyErrorMessage(errorMsg: string): string {
    if (!errorMsg) return "Đã có lỗi xảy ra";

    // Check for exact match
    if (ERROR_MAPPINGS[errorMsg]) {
        return ERROR_MAPPINGS[errorMsg];
    }

    // Check for partial matches or specific patterns
    for (const [key, value] of Object.entries(ERROR_MAPPINGS)) {
        if (errorMsg.includes(key)) {
            return value;
        }
    }

    // Return original if no mapping found (fallback)
    return errorMsg;
}
