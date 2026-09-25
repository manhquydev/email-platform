import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export function useVersionCheck() {
    const [hasUpdate, setHasUpdate] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Cache-busting query param
                const response = await fetch('/version.json?t=' + new Date().getTime());
                if (!response.ok) return;

                const data = await response.json();
                const serverVersion = data.version;
                const localVersion = localStorage.getItem('app_version');

                if (localVersion && localVersion !== serverVersion) {
                    setHasUpdate(true);
                    // Show persistent toast
                    toast((t) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-semibold">Updated version available!</span>
                            <button
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition"
                                onClick={() => {
                                    localStorage.setItem('app_version', serverVersion);
                                    toast.dismiss(t.id);

                                    // Unregister old Service Workers
                                    if ('serviceWorker' in navigator) {
                                        navigator.serviceWorker.getRegistrations().then(registrations => {
                                            for (let registration of registrations) {
                                                registration.unregister();
                                            }
                                        });
                                    }

                                    // Hard Reload
                                    window.location.reload();
                                }}
                            >
                                Update Now
                            </button>
                        </div>
                    ), {
                        duration: Infinity,
                        position: 'bottom-center',
                        style: {
                            minWidth: '300px',
                            border: '1px solid #e0e7ff',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        },
                        id: 'update-toast' // Prevent duplicates
                    });
                } else {
                    // First time load or fresh update
                    if (!localVersion || localVersion !== serverVersion) {
                        localStorage.setItem('app_version', serverVersion);
                    }
                }
            } catch (error) {
                // Silently fail if version check fails (e.g. offline)
                console.debug('Failed to check version', error);
            }
        };

        // Check on mount
        checkVersion();

        // Check on visibility change (focus)
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    return { hasUpdate };
}
