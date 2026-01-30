import { useEffect, useState } from 'react';
import { storage } from '../../shared/storage';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { AuthState, StorageData } from '../../shared/types';
import Login from '../../components/popup/Login';
import InboxList from '../../components/popup/InboxList';
import MessageList from '../../components/popup/MessageList';
import Settings from '../../components/popup/Settings';
import OtpBanner from '../../components/shared/OtpBanner';
import { Loader2, Settings as SettingsIcon, Zap, Globe, ChevronRight } from 'lucide-react';
import browser from 'webextension-polyfill';

type View =
  | { type: 'home' }
  | { type: 'inbox', inboxId: string, email: string }
  | { type: 'settings' };

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>({ type: 'home' });
  const [activeTab, setActiveTab] = useState<{ url: string; title: string; domain: string } | null>(null);

  useEffect(() => {
    checkAuth();
    updateActiveTab();
    initTheme();
    analytics.track('extension_opened', { view: 'sidepanel' });

    // Listen for tab changes
    const tabListener = () => updateActiveTab();
    browser.tabs.onActivated.addListener(tabListener);
    browser.tabs.onUpdated.addListener(tabListener);

    return () => {
      browser.tabs.onActivated.removeListener(tabListener);
      browser.tabs.onUpdated.removeListener(tabListener);
    };
  }, []);

  const initTheme = async () => {
    const settings = await storage.getSettings();
    applyTheme(settings.theme);

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        const newValue = changes.settings.newValue as StorageData['settings'];
        if (newValue) {
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

  const updateActiveTab = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        setActiveTab({
          url: tab.url,
          title: tab.title || '',
          domain: url.hostname.replace('www.', '')
        });
      }
    } catch (e) {
      console.error("Failed to get active tab", e);
    }
  };

  const handleGenerateForSite = async () => {
    if (!activeTab?.domain) return;
    try {
      // In a real implementation, we might pass the domain as a tag
      await api.createQuickInbox();
      analytics.track('inbox_created_quick', { domain: activeTab.domain, context: 'sidepanel_context_button' });
      // Refresh inbox list (handled by storage sync or message passing)
      browser.runtime.sendMessage({ type: 'GET_INBOXES' });
    } catch (e) {
      console.error("Quick action failed", e);
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
    browser.runtime.sendMessage({ type: 'SETUP_PUSH' });
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    setAuth({ token: null, user: null, isAuthenticated: false });
    setCurrentView({ type: 'home' });
  };

  const renderContent = () => {
    if (!auth?.isAuthenticated) {
      return <Login onSuccess={handleLoginSuccess} />;
    }

    switch (currentView.type) {
      case 'home':
        return (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <OtpBanner />
            {/* Quick Actions Section */}
            {activeTab && (
              <div className="px-3 pt-3">
                <div className="card-material p-4 border-l-4 border-l-primary-500 overflow-hidden relative group">
                  <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                    <Zap className="w-24 h-24 rotate-12" />
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400 relative z-10">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Context Intelligence</span>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <button
                      onClick={handleGenerateForSite}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all group border border-slate-100 dark:border-slate-800 hover:border-primary-100 dark:hover:border-primary-900/30 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 group-hover:border-primary-200 dark:group-hover:border-primary-800 transition-colors">
                           <Globe className="w-4 h-4 text-slate-400 group-hover:text-primary-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary-700 dark:group-hover:text-primary-400">Generate for {activeTab.domain}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{activeTab.title}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1">
              <InboxList
                onSelectInbox={(id, email) => setCurrentView({ type: 'inbox', inboxId: id, email })}
              />
            </div>
          </div>
        );
      case 'inbox':
        return (
          <MessageList
            inboxId={currentView.inboxId}
            email={currentView.email}
            onBack={() => setCurrentView({ type: 'home' })}
          />
        );
      case 'settings':
        return (
          <Settings
            onBack={() => setCurrentView({ type: 'home' })}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col h-screen transition-colors duration-300">
      {/* Header - Glassmorphism */}
      {currentView.type === 'home' && (
        <header className="glass-morphism sticky top-0 px-4 py-3 flex justify-between items-center z-20 shrink-0 mx-2 mt-2 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-primary-500/20">E</div>
            <h1 className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-sm">Ephemera</h1>
          </div>
          {auth?.isAuthenticated && (
            <button
              onClick={() => setCurrentView({ type: 'settings' })}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}
        </header>
      )}

      <main className="flex-1 overflow-y-auto pt-2 pb-4 px-1">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
