/**
 * NotificationsSettings - Browser push and Telegram notification settings
 * Modules extracted to notifications-settings-modules/
 */
import { useAuth } from "../../context/AuthContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import {
    useNotificationsSettingsData,
    BrowserPushSection,
    AccountTelegramSection,
    InboxTelegramLinksSection
} from "./notifications-settings-modules";

export function NotificationsSettings() {
    const { token } = useAuth();
    const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

    const {
        telegramStatus,
        telegramLinkToken,
        telegramBotLink,
        telegramBusy,
        showUnlinkConfirm,
        setShowUnlinkConfirm,
        generateTelegramLink,
        toggleTelegramNotify,
        confirmUnlinkTelegram,
        copyLinkToken,
        inboxLinks,
        inboxLinksLoading,
        unlinkingId,
        unlinkInbox
    } = useNotificationsSettingsData(token);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-nebula-text mb-2 tracking-tight">Thông báo</h2>
                <p className="text-nebula-text-muted font-body">Quản lý cách bạn nhận cảnh báo và tin nhắn.</p>
            </div>

            {/* Browser Push Notifications */}
            {isSupported && (
                <BrowserPushSection
                    isSubscribed={isSubscribed}
                    pushLoading={pushLoading}
                    subscribe={subscribe}
                    unsubscribe={unsubscribe}
                />
            )}

            {/* Account Telegram Link */}
            <AccountTelegramSection
                telegramStatus={telegramStatus}
                telegramLinkToken={telegramLinkToken}
                telegramBotLink={telegramBotLink}
                telegramBusy={telegramBusy}
                showUnlinkConfirm={showUnlinkConfirm}
                setShowUnlinkConfirm={setShowUnlinkConfirm}
                generateTelegramLink={generateTelegramLink}
                toggleTelegramNotify={toggleTelegramNotify}
                confirmUnlinkTelegram={confirmUnlinkTelegram}
                copyLinkToken={copyLinkToken}
            />

            {/* Inbox Telegram Links */}
            <InboxTelegramLinksSection
                inboxLinks={inboxLinks}
                inboxLinksLoading={inboxLinksLoading}
                unlinkingId={unlinkingId}
                unlinkInbox={unlinkInbox}
            />
        </div>
    );
}
