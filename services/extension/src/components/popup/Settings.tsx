import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, ExternalLink, Shield, CreditCard, Bell, BellOff, Loader2, Copy, Sparkles, User as UserIcon, Sun, Moon, Monitor, ChevronRight, Share2, Check } from 'lucide-react';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { User } from '../../shared/types';
import { storage } from '../../shared/storage';
import { CONFIG } from '../../shared/config';
import { cn } from '../../utils/cn';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../shared/push-subscription';

interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
}

export default function Settings({ onBack, onLogout }: SettingsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notifLoading, setNotifLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    loadUser();
    checkNotificationStatus();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await storage.getSettings();
    setAutoCopy(settings.autoCopy);
    setTheme(settings.theme || 'system');
  };

  const loadUser = async () => {
    const auth = await storage.getAuth();
    if (auth?.user) {
      setUser(auth.user);
    } else {
      const profile = await api.getMe();
      setUser(profile.user);
    }
  };

  const checkNotificationStatus = async () => {
      const isSubscribed = await isPushSubscribed();
      setNotificationsEnabled(isSubscribed);
  };

  const toggleNotifications = async () => {
      setNotifLoading(true);
      try {
          if (notificationsEnabled) {
              await unsubscribeFromPush();
              setNotificationsEnabled(false);
              analytics.track('settings_updated', { setting: 'notifications', enabled: false });
          } else {
              const success = await subscribeToPush();
              if (success) {
                  setNotificationsEnabled(true);
                  analytics.track('settings_updated', { setting: 'notifications', enabled: true });
              }
          }
      } catch (e) {
          console.error('Failed to toggle notifications', e);
      } finally {
          setNotifLoading(false);
      }
  };

  const toggleAutoCopy = async () => {
    const newVal = !autoCopy;
    setAutoCopy(newVal);
    await storage.updateSettings({ autoCopy: newVal });
    analytics.track('settings_updated', { setting: 'autoCopy', enabled: newVal });
  };

  const updateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    await storage.updateSettings({ theme: newTheme });
    analytics.track('theme_changed', { theme: newTheme });
  };

  const handleLogout = () => {
    analytics.track('logout');
    onLogout();
  };

  const handleShareReferral = async () => {
    const referralUrl = `${CONFIG.WEB_URL}?ref=extension&utm_source=extension&utm_medium=share&utm_campaign=referral`;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setReferralCopied(true);
      analytics.track('referral_shared', { method: 'copy' });
      setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      // Fallback: open share dialog if available
      if (navigator.share) {
        await navigator.share({
          title: 'Ephemera - Disposable Email',
          text: 'Check out Ephemera for disposable email addresses!',
          url: referralUrl,
        });
        analytics.track('referral_shared', { method: 'native_share' });
      }
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 p-2 space-y-4">
      <div className="glass-morphism sticky top-0 flex items-center gap-3 p-3 z-20 border border-white/20 dark:border-slate-800/50 rounded-2xl">
        <button
          onClick={onBack}
          aria-label="Go back to inbox list"
          className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <h2 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-widest">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pb-6 px-1">
        {/* Profile Card */}
        <div className="card-material p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <UserIcon className="w-16 h-16" />
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-500/20">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-black uppercase tracking-tight px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                  {user?.role || 'User'}
                </span>
                {user?.tier && (
                  <span className="text-[10px] font-black uppercase tracking-tight px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {user.tier}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/50">
            <a
              href={`${CONFIG.WEB_URL}/dashboard/settings`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1.5 transition-colors group/link"
            >
              Manage Account
              <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Appearance</h3>
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'light', icon: Sun, label: 'Light' },
              { id: 'dark', icon: Moon, label: 'Dark' },
              { id: 'system', icon: Monitor, label: 'System' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => updateTheme(item.id as any)}
                aria-pressed={theme === item.id}
                aria-label={`${item.label} theme${theme === item.id ? ' (selected)' : ''}`}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300",
                  theme === item.id
                    ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preferences</h3>

          <div className="space-y-2">
            <button
              onClick={toggleNotifications}
              disabled={notifLoading}
              aria-pressed={notificationsEnabled}
              aria-label={`Push notifications ${notificationsEnabled ? 'enabled' : 'disabled'}. Click to toggle.`}
              className="w-full card-material p-4 flex items-center justify-between group hover:border-primary-200 dark:hover:border-primary-900/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  notificationsEnabled
                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500"
                )}>
                  {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Push Notifications</p>
                  <p className="text-[10px] text-slate-400 font-medium">Get alerted for new messages</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {notifLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                <div className={cn(
                  "w-10 h-5 rounded-full transition-all duration-300 relative p-1",
                  notificationsEnabled ? "bg-primary-500" : "bg-slate-200 dark:bg-slate-800"
                )}>
                  <div className={cn(
                    "w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                    notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  )} />
                </div>
              </div>
            </button>

            <button
              onClick={toggleAutoCopy}
              aria-pressed={autoCopy}
              aria-label={`Auto-copy address ${autoCopy ? 'enabled' : 'disabled'}. Click to toggle.`}
              className="w-full card-material p-4 flex items-center justify-between group hover:border-primary-200 dark:hover:border-primary-900/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  autoCopy
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500"
                )}>
                  <Copy className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Auto-copy Address</p>
                  <p className="text-[10px] text-slate-400 font-medium">Copy on creation</p>
                </div>
              </div>
              <div className={cn(
                "w-10 h-5 rounded-full transition-all duration-300 relative p-1",
                autoCopy ? "bg-primary-500" : "bg-slate-200 dark:bg-slate-800"
              )}>
                <div className={cn(
                  "w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                  autoCopy ? "translate-x-5" : "translate-x-0"
                )} />
              </div>
            </button>
          </div>
        </div>

        {/* Share & Invite */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Share & Invite</h3>
          <button
            onClick={handleShareReferral}
            className="w-full card-material p-4 flex items-center justify-between group hover:border-primary-200 dark:hover:border-primary-900/50"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                referralCopied
                  ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  : "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              )}>
                {referralCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Share Ephemera</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {referralCopied ? 'Link copied!' : 'Invite friends to try Ephemera'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Support & Legal */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Support & Legal</h3>
          <div className="card-material divide-y divide-slate-50 dark:divide-slate-800/50 overflow-hidden">
            <a
              href={`${CONFIG.WEB_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Main Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href={`${CONFIG.WEB_URL}/privacy`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Privacy & Terms</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* Danger Zone */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 card-material border-red-50 dark:border-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
        </button>

        <div className="text-center pt-4">
          <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">Ephemera Engine v0.1.0</p>
        </div>
      </div>
    </div>
  );
}

