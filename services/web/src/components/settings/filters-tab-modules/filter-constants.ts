/**
 * Types and constants for FiltersTab
 */
import type { FilterField, FilterOperator, FilterActionType } from "../../../types";

export const FIELD_OPTIONS: { value: FilterField; label: string }[] = [
    { value: "FROM", label: "Người gửi (From)" },
    { value: "TO", label: "Người nhận (To)" },
    { value: "SUBJECT", label: "Tiêu đề (Subject)" },
    { value: "BODY", label: "Nội dung (Body)" },
    { value: "HAS_ATTACHMENT", label: "Có đính kèm" },
];

export const OPERATOR_OPTIONS: { value: FilterOperator; label: string }[] = [
    { value: "CONTAINS", label: "Chứa" },
    { value: "NOT_CONTAINS", label: "Không chứa" },
    { value: "EQUALS", label: "Bằng chính xác" },
    { value: "NOT_EQUALS", label: "Không bằng" },
    { value: "STARTS_WITH", label: "Bắt đầu bằng" },
    { value: "ENDS_WITH", label: "Kết thúc bằng" },
    { value: "REGEX", label: "Biểu thức chính quy (Regex)" },
];

export const ACTION_OPTIONS: { value: FilterActionType; label: string }[] = [
    { value: "MOVE_TO_FOLDER", label: "Di chuyển tới thư mục" },
    { value: "ADD_LABEL", label: "Gán nhãn" },
    { value: "REMOVE_LABEL", label: "Gỡ nhãn" },
    { value: "MARK_READ", label: "Đánh dấu đã đọc" },
    { value: "MARK_SPAM", label: "Đánh dấu Spam" },
    { value: "DELETE", label: "Xóa email" },
    { value: "FORWARD", label: "Chuyển tiếp tới" },
];
