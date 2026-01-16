import React, { useState } from 'react';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { CONFIG } from '../../shared/config';
import { t } from '../../shared/i18n';
import { Loader2, ShieldCheck, UserCircle, Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

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
        analytics.track('login_success', { method: 'password' });
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('loginFailed'));
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
      analytics.track('login_success', { method: '2fa' });
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
      analytics.track('inbox_created_anonymous');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create anonymous inbox');
    } finally {
      setIsLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-xs space-y-8">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-primary-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('securityCheck')}</h2>
            <p className="text-xs text-slate-500 font-medium">Enter the verification code from your authenticator app</p>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-6">
            <div className="relative group">
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-center text-3xl font-black tracking-[0.4em] focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all text-slate-800 dark:text-white"
                placeholder="000000"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-800/30 backdrop-blur-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length < 6}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-2xl shadow-lg shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('verifyAndContinue')}
            </button>

            <button
              type="button"
              onClick={() => setRequires2FA(false)}
              className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
            >
              {t('backToLogin')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-primary-500/30 mb-6">E</div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t('extName').split(' - ')[0]}</h2>
          <p className="text-xs text-slate-500 font-medium">Your gateway to instant, secure digital identities</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('emailAddress')}</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all dark:text-white"
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('password')}</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] rounded-xl border border-red-100 dark:border-red-800/30 backdrop-blur-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl shadow-slate-900/10 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {t('signIn')}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-1 border-t border-slate-100 dark:border-slate-800"></div>
          <span className="px-3 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">{t('secureEntry')}</span>
          <div className="flex-1 border-t border-slate-100 dark:border-slate-800"></div>
        </div>

        <button
          onClick={handleAnonymous}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 group"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-500 group-hover:animate-pulse" />
          )}
          {t('goAnonymous')}
        </button>

        <p className="text-center text-[11px] text-slate-400 font-medium">
          {t('newToEphemera')} <a href={`${CONFIG.WEB_URL}/register`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 font-bold hover:underline">{t('createAccount')}</a>
        </p>
      </div>
    </div>
  );
}

