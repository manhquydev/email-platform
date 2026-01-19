/**
 * AdminNotificationPage - Send system notifications to users
 * Modules extracted to admin-notification-modules/
 */
import { useAuth } from "../../context/AuthContext";
import { SectionHeader } from "../../components/admin/AdminUIComponents";
import {
    useNotificationForm,
    NotificationForm,
    HelpSidebar
} from "./admin-notification-modules";

export function AdminNotificationPage() {
    const { token } = useAuth();
    const {
        title, setTitle,
        message, setMessage,
        type, setType,
        targetMode, setTargetMode,
        targetUserId, setTargetUserId,
        imageUrl, setImageUrl,
        busy,
        submit,
        handleImageUpload
    } = useNotificationForm(token);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <SectionHeader
                title="Gửi Thông Báo"
                subtitle="Gửi thông báo hệ thống đến người dùng qua Web và Telegram"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <NotificationForm
                        title={title}
                        message={message}
                        type={type}
                        targetMode={targetMode}
                        targetUserId={targetUserId}
                        imageUrl={imageUrl}
                        busy={busy}
                        token={token}
                        onTitleChange={setTitle}
                        onMessageChange={setMessage}
                        onTypeChange={setType}
                        onTargetModeChange={setTargetMode}
                        onTargetUserIdChange={setTargetUserId}
                        onImageUrlChange={setImageUrl}
                        onImageUpload={handleImageUpload}
                        onSubmit={submit}
                    />
                </div>

                <div className="md:col-span-1 space-y-6">
                    <HelpSidebar />
                </div>
            </div>
        </div>
    );
}
