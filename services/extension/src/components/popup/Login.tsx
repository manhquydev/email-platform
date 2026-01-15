import React, { useState } from 'react';
import { api } from '../../shared/api';
import { CONFIG } from '../../shared/config';
import { Loader2, ShieldCheck, UserCircle } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(email, password);
      if (res.requires2FA && res.tempToken) {
        setRequires2FA(true);
        setTempToken(res.tempToken);
      } else {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.verify2FA(tempToken, twoFactorCode);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.createAnonymousInbox();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create anonymous inbox');
    } finally {
      setIsLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Two-Factor Auth</h2>
            <p className="text-sm text-gray-500">Enter the 6-digit code from your app</p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-3 border border-gray-300 rounded-md text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="000000"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length < 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => setRequires2FA(false)}
              className="w-full text-xs text-gray-500 hover:text-gray-700"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-sm text-gray-500">Sign in to manage your disposable emails</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-50 px-2 text-gray-500">Or continue as</span>
          </div>
        </div>

        <button
          onClick={handleAnonymous}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCircle className="w-5 h-5" />}
          Anonymous Mode
        </button>

        <div className="text-center text-xs text-gray-500">
          Don't have an account? <a href={`${CONFIG.WEB_URL}/register`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
}
