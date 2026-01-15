import { useEffect, useState } from 'react';
import { storage } from '../../shared/storage';
import { api } from '../../shared/api';
import { AuthState } from '../../shared/types';
import Login from '../../components/popup/Login';
import InboxList from '../../components/popup/InboxList';
import MessageList from '../../components/popup/MessageList';
import Settings from '../../components/popup/Settings';
import { Loader2, Settings as SettingsIcon, PanelLeftOpen } from 'lucide-react';

type View =
  | { type: 'home' }
  | { type: 'inbox', inboxId: string, email: string }
  | { type: 'settings' };

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>({ type: 'home' });

  useEffect(() => {
    checkAuth();
  }, []);

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
    chrome.runtime.sendMessage({ type: 'SETUP_PUSH' });
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    setAuth({ token: null, user: null, isAuthenticated: false });
    setCurrentView({ type: 'home' });
  };

  const openSidePanel = async () => {
    try {
      // @ts-ignore - chrome.sidePanel is available in MV3 with sidePanel permission
      await chrome.sidePanel.setPanelOptions({
        enabled: true,
        path: 'entrypoints/sidepanel/index.html'
      });
      // @ts-ignore
      await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      window.close();
    } catch (e) {
      console.error("Failed to open side panel", e);
    }
  };

  const renderContent = () => {
    if (!auth?.isAuthenticated) {
      return <Login onSuccess={handleLoginSuccess} />;
    }

    switch (currentView.type) {
      case 'home':
        return (
          <InboxList
            onSelectInbox={(id, email) => setCurrentView({ type: 'inbox', inboxId: id, email })}
          />
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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 flex flex-col h-screen">
      {/* Header - Only show on Home view to avoid double headers in sub-views */}
      {currentView.type === 'home' && (
        <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold text-xs">E</div>
            <h1 className="font-semibold text-gray-800">Ephemera</h1>
          </div>
          <div className="flex items-center gap-1">
            {auth?.isAuthenticated && (
              <button
                onClick={openSidePanel}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Open in Side Panel"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            {auth?.isAuthenticated && (
              <button
                onClick={() => setCurrentView({ type: 'settings' })}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
