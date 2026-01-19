/**
 * NotificationCenter - Real-time notification dropdown with bell icon
 * Modules extracted to notification-center-modules/
 */
import { createPortal } from 'react-dom';
import {
    useNotificationCenter,
    TriggerButton,
    NotificationDropdown
} from "./notification-center-modules";

export function NotificationCenter() {
    const {
        notifications,
        unreadCount,
        isOpen,
        position,
        buttonRef,
        dropdownRef,
        handleToggle,
        markAsRead,
        markAllAsRead
    } = useNotificationCenter();

    const dropdown = isOpen && (
        <NotificationDropdown
            dropdownRef={dropdownRef}
            position={position}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
        />
    );

    return (
        <>
            <TriggerButton
                buttonRef={buttonRef}
                unreadCount={unreadCount}
                onClick={handleToggle}
            />
            {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
        </>
    );
}
