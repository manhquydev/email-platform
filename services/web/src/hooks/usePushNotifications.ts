import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../utils/push-subscription';
import toast from 'react-hot-toast';

export function usePushNotifications() {
    const { token } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check support
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            // Check initial status
            isPushSubscribed().then(setIsSubscribed).finally(() => setIsLoading(false));

            // Listen for subscription changes from service worker
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGE' && token) {
                    console.log('[Push Hook]: Received subscription change, re-syncing...');
                    subscribeToPush(token).then(success => {
                        if (success) setIsSubscribed(true);
                    });
                }
            };

            navigator.serviceWorker.addEventListener('message', handleMessage);
            return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
        } else {
            setIsLoading(false);
        }
    }, [token]);

    const subscribe = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const success = await subscribeToPush(token);
            if (success) {
                setIsSubscribed(true);
                toast.success('Đã bật thông báo trình duyệt');
            } else {
                toast.error('Không thể bật thông báo. Vui lòng kiểm tra quyền trình duyệt.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi đăng ký thông báo');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    const unsubscribe = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const success = await unsubscribeFromPush(token);
            if (success) {
                setIsSubscribed(false);
                toast.success('Đã tắt thông báo trình duyệt');
            } else {
                toast.error('Không thể tắt thông báo');
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi hủy đăng ký thông báo');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    return {
        isSupported,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe
    };
}
