import { useEffect, useState, lazy, Suspense } from 'react';
import { storage } from '../../shared/storage';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { AuthState, StorageData, ComposeData } from '../../shared/types';
import Login from '../../components/popup/Login';
import InboxList from '../../components/popup/InboxList';
import OnboardingTour from '../../components/shared/OnboardingTour';
import ComposeModal from '../../components/shared/ComposeModal';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Loader2, Settings as SettingsIcon, PanelLeftOpen, PenSquare } from 'lucide-react';
import browser from 'webextension-polyfill';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import GlobalSearchResults from '../../components/shared/GlobalSearchResults';
import SearchInput from '../../components/shared/SearchInput';
import { t } from '../../shared/i18n';

// Lazy load heavy components for code splitting
const MessageList = lazy(() => import('../../components/popup/MessageList'));
const Settings = lazy(() => import('../../components/popup/Settings'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );
}

type View =
  | { type: 'home' }
  | { type: 'inbox', inboxId: string, email: string }
  | { type: 'settings' };

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>({ type: 'home' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StorageData['settings'] | null>(null);

  const globalSearch = useGlobalSearch();

  useEffect(() => {
    checkAuth();
    initTheme();
    checkFirstInstall();
    analytics.track('extension_opened', { view: 'popup' });
  }, []);

  const checkFirstInstall = async () => {
    const isFirst = await analytics.isFirstInstall();
    if (isFirst) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const initTheme = async () => {
    const loadedSettings = await storage.getSettings();
    setSettings(loadedSettings);
    applyTheme(loadedSettings.theme);

    // Listen for storage changes to sync theme across extension parts
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        const newValue = changes.settings.newValue as StorageData['settings'];
        if (newValue) {
          setSettings(newValue);
          applyTheme(newValue.theme);
        }
      }
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      storage.getSettings().then(s => {
        if (s.theme === 'system') applyTheme('system');
      });
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const checkAuth = async () => {
    try {
      const storedAuth = await storage.getAuth();
      setAuth(storedAuth);

      if (storedAuth.token) {
        try {
          await api.getMe();
        } catch (e) {
          await storage.clearAuth();
          setAuth({ token: null, user: null, isAuthenticated: false });
        }
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    await checkAuth();
    // Trigger push setup
    browser.runtime.sendMessage({ type: 'SETUP_PUSH' });
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    setAuth({ token: null, user: null, isAuthenticated: false });
    setCurrentView({ type: 'home' });
  };

  const openSidePanel = async () => {
    try {
      // @ts-ignore - browser.sidePanel is available in MV3 with sidePanel permission
      await browser.sidePanel.setOptions({
        enabled: true,
        path: 'entrypoints/sidepanel/index.html'
      });
      // @ts-ignore
      await browser.sidePanel.open({ windowId: (await browser.windows.getCurrent()).id });
      window.close();
    } catch (e) {
      console.error("Failed to open side panel", e);
    }
  };

  const handleSendNewMessage = async (data: ComposeData) => {
    if (!data.to || !data.subject) return;
    setComposeSending(true);
    setComposeError(null);
    try {
      await api.sendNewMessage({
        to: data.to,
        subject: data.subject,
        content: data.content
      });
      setShowCompose(false);
      analytics.track('message_composed');
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setComposeSending(false);
    }
  };

  const renderContent = () => {
    if (!auth?.isAuthenticated) {
      return <Login onSuccess={handleLoginSuccess} />;
    }

    switch (currentView.type) {
      case 'home':
        return (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2">
              <SearchInput
                value={globalSearch.query}
                onChange={globalSearch.setQuery}
                placeholder={t('searchAllMessages')}
              />
              {globalSearch.query.length >= 2 && (
                <GlobalSearchResults
                  results={globalSearch.results}
                  loading={globalSearch.loading}
                  onSelectMessage={(msg) => setCurrentView({ type: 'inbox', inboxId: msg.inboxId, email: '' })}
                />
              )}
            </div>

            {!globalSearch.query && (
              <InboxList
                onSelectInbox={(id, email) => setCurrentView({ type: 'inbox', inboxId: id, email })}
              />
            )}
          </div>
        );
      case 'inbox':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MessageList
              inboxId={currentView.inboxId}
              email={currentView.email}
              onBack={() => setCurrentView({ type: 'home' })}
            />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Settings
              onBack={() => setCurrentView({ type: 'home' })}
              onLogout={handleLogout}
              initialSettings={settings}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-[400px] min-h-[500px] bg-gray-50 dark:bg-slate-950 flex flex-col h-screen transition-colors duration-300">
      {/* Header - Glassmorphism */}
      {currentView.type === 'home' && (
        <header className="glass-morphism sticky top-0 px-4 py-3 flex justify-between items-center z-20 shrink-0 mx-2 mt-2 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary-500/20">E</div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">Ephemera</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {auth?.isAuthenticated && (
              <button
                onClick={() => setShowCompose(true)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                title="Compose"
              >
                <PenSquare className="w-4 h-4" />
              </button>
            )}
            {auth?.isAuthenticated && (
              <button
                onClick={openSidePanel}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                title="Open in Side Panel"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            {auth?.isAuthenticated && (
              <button
                onClick={() => setCurrentView({ type: 'settings' })}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto pt-2 pb-4 px-2">
        <div className="h-full">
          {renderContent()}
        </div>
      </main>

      {/* Onboarding Tour for first-time users */}
      {showOnboarding && auth?.isAuthenticated && (
        <OnboardingTour
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Compose New Email Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        mode="new"
        originalMessage={null}
        onSend={handleSendNewMessage}
        sending={composeSending}
        error={composeError}
      />
      </div>
    </ErrorBoundary>
  );
}

export default App;
