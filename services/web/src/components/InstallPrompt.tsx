/**
 * InstallPrompt - PWA install prompt with iOS detection
 * Shows custom install button after user engagement
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after user engagement (e.g., scrolled, clicked)
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show after engagement
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 10000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  const handleShowIOSInstructions = useCallback(() => {
    setShowIOSInstructions(true);
  }, []);

  if (dismissed || !showPrompt) return null;

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-white">Cài đặt Ephemera</h3>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-white">Nhấn nút Share</p>
                <div className="flex items-center gap-2 mt-1">
                  <Share size={20} className="text-blue-400" />
                  <span className="text-sm">ở thanh công cụ Safari</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-white">Chọn "Add to Home Screen"</p>
                <div className="flex items-center gap-2 mt-1">
                  <Plus size={20} className="text-blue-400" />
                  <span className="text-sm">Thêm vào Màn hình chính</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-white">Nhấn "Add"</p>
                <span className="text-sm">Ứng dụng sẽ xuất hiện trên màn hình</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowIOSInstructions(false)}
            className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    );
  }

  // Install Banner
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Download size={24} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">Cài đặt Ephemera</h3>
            <p className="text-sm text-gray-400">
              Truy cập nhanh hơn, nhận thông báo và sử dụng offline
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-4 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Để sau
          </button>

          {isIOS ? (
            <button
              onClick={handleShowIOSInstructions}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Share size={16} />
              Hướng dẫn
            </button>
          ) : (
            <button
              onClick={handleInstall}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Cài đặt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
