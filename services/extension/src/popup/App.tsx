import React, { useEffect, useState } from 'react';
import { storage } from '../shared/storage';
import { api } from '../shared/api';
import { AuthState } from '../shared/types';
import Login from './components/Login';
import InboxList from './components/InboxList';
import { Loader2 } from 'lucide-react';

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status on load
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedAuth = await storage.getAuth();
      setAuth(storedAuth);

      // If we have a token, verify it's still valid by fetching profile
      if (storedAuth.token) {
        try {
          await api.getMe();
        } catch (e) {
          // Token invalid
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
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    setAuth({ token: null, user: null, isAuthenticated: false });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold text-xs">E</div>
          <h1 className="font-semibold text-gray-800">Ephemera</h1>
        </div>
        {auth?.isAuthenticated && (
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        {!auth?.isAuthenticated ? (
          <Login onSuccess={handleLoginSuccess} />
        ) : (
          <InboxList />
        )}
      </main>
    </div>
  );
}

export default App;
