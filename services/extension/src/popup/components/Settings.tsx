import React, { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, ExternalLink, Shield, CreditCard } from 'lucide-react';
import { api } from '../../shared/api';
import { User } from '../../shared/types';
import { storage } from '../../shared/storage';

interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
}

export default function Settings({ onBack, onLogout }: SettingsProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const auth = await storage.getAuth();
    if (auth?.user) {
      setUser(auth.user);
    } else {
      const profile = await api.getMe();
      setUser(profile.user);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-gray-800">Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {user?.role}
                </span>
                {user?.tier && (
                  <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded flex items-center gap-1">
                    <CreditCard className="w-2.5 h-2.5" />
                    {user.tier}
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href="https://manhquy.click/dashboard/settings"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
          >
            Manage Account <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Links Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Links</h3>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            <a
              href="https://manhquy.click/dashboard"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              Go to Dashboard
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>
            <a
              href="https://manhquy.click/privacy"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              Privacy Policy
              <Shield className="w-3.5 h-3.5 text-gray-400" />
            </a>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <div className="text-center text-xs text-gray-400 mt-8">
          Ephemera Extension v0.1.0
        </div>
      </div>
    </div>
  );
}
