
import { useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface VersionData {
    version: string;
    buildTime: string;
}

const CHECK_INTERVAL = 60 * 1000; // Check every minute
const VERSION_URL = '/version.json';

export const VersionCheck = () => {
    const currentVersionRef = useRef<string | null>(null);

    const checkVersion = useCallback(async () => {
        try {
            const response = await fetch(`${VERSION_URL}?t=${Date.now()}`);
            if (!response.ok) return;

            const data: VersionData = await response.json();

            if (!currentVersionRef.current) {
                // Initial load
                currentVersionRef.current = data.version;
            } else if (currentVersionRef.current !== data.version) {
                // Version mismatch - update available
                toast(
                    (t) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-medium">
                                Phiên bản mới đã sẵn sàng!
                            </span>
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    window.location.reload();
                                }}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                            >
                                Cập nhật ngay
                            </button>
                        </div>
                    ),
                    {
                        duration: Infinity,
                        position: 'bottom-right',
                        id: 'version-update-toast', // Prevent duplicates
                        icon: '🚀',
                    }
                );
            }
        } catch {
            // Silently fail for version check
        }
    }, []);

    useEffect(() => {
        // Check on mount
        checkVersion();

        // Check on interval
        const interval = setInterval(checkVersion, CHECK_INTERVAL);

        // Check on visibility change (when user comes back to the tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkVersion]);

    return null; // Headless component
};
