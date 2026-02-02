/**
 * OfflineBanner - Connection status indicator with offline mode support
 * Shows cached email status when offline
 */
import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { getCacheStats, getPendingOutboundEmails } from '../lib/offline-storage';

interface OfflineStats {
  cachedEmails: number;
  pendingOutbound: number;
}

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [stats, setStats] = useState<OfflineStats>({ cachedEmails: 0, pendingOutbound: 0 });
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Load offline stats
  const loadStats = useCallback(async () => {
    try {
      const cacheStats = await getCacheStats();
      const pending = await getPendingOutboundEmails();
      setStats({
        cachedEmails: cacheStats.emailCount,
        pendingOutbound: pending.length,
      });
    } catch (err) {
      console.error('[OfflineBanner] Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      // Show reconnected message briefly
      setTimeout(() => {
        setShowBanner(false);
        setIsReconnecting(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      loadStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setShowBanner(true);
      loadStats();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadStats]);

  // Periodic stats refresh when offline
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnline, loadStats]);

  if (!showBanner) return null;

  // Reconnected state
  if (isOnline && isReconnecting) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 px-4 py-2 bg-green-600/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-white text-sm">
          <Wifi size={16} />
          <span>Đã kết nối lại! Đang đồng bộ dữ liệu...</span>
          <RefreshCw size={14} className="animate-spin" />
        </div>
      </div>
    );
  }

  // Offline state
  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4 py-3 bg-amber-600/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <WifiOff size={18} />
            <span className="font-medium">Không có kết nối mạng</span>
          </div>

          <div className="flex items-center gap-4 text-amber-100 text-sm">
            {stats.cachedEmails > 0 && (
              <div className="flex items-center gap-1">
                <CloudOff size={14} />
                <span>{stats.cachedEmails} email đã lưu</span>
              </div>
            )}
            {stats.pendingOutbound > 0 && (
              <div className="flex items-center gap-1 text-amber-200">
                <RefreshCw size={14} />
                <span>{stats.pendingOutbound} đang chờ gửi</span>
              </div>
            )}
          </div>
        </div>

        {stats.cachedEmails > 0 && (
          <p className="text-amber-100/80 text-xs mt-1">
            Bạn có thể xem email đã lưu. Các thay đổi sẽ được đồng bộ khi có mạng.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
