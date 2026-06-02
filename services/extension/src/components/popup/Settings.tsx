import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogOut, ExternalLink, Shield, Bell, BellOff, Loader2, Copy, Sparkles, User as UserIcon, Sun, Moon, Monitor, ChevronRight, Share2, Check, Download, Upload } from 'lucide-react';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { User, StorageData } from '../../shared/types';
import { storage } from '../../shared/storage';
import { CONFIG } from '../../shared/config';
import { cn } from '../../utils/cn';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../shared/push-subscription';
import { t } from '../../shared/i18n';
import {
  formatOpenAiCredentialsAsTxt,
  parseOpenAiCredentialsFromTxt,
  summarizeOpenAiCredentials,
} from '../../shared/openai-auth-automation-export';
import {
  formatFireworksFlow3CredentialsAsTxt,
  summarizeFireworksFlow3Credentials,
} from '../../shared/fireworks-flow3-automation-export';
import browser from 'webextension-polyfill';

interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
  initialSettings?: StorageData['settings'] | null;
}

export default function Settings({ onBack, onLogout, initialSettings }: SettingsProps) {
  const AUTOMATION_STATE_KEY = 'openai_auth_automation_state';
  const FIREWORKS_FLOW3_STATE_KEY = 'fireworks_flow3_automation_state';
  const AUTOMATION_MAX_CREDENTIALS = 500;
  const [user, setUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoCopy, setAutoCopy] = useState(initialSettings?.autoCopy ?? true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialSettings?.theme || 'system');
  const [defaultInboxLifetime, setDefaultInboxLifetime] = useState<'temporary' | 'permanent'>(
    initialSettings?.defaultInboxLifetime || 'temporary'
  );
  const [automationExpiryHours, setAutomationExpiryHours] = useState<number>(
    initialSettings?.automationExpiryHours || 2
  );
  const [allowedAutomationDomainIds, setAllowedAutomationDomainIds] = useState<string[]>(
    initialSettings?.automationAllowedDomainIds || []
  );
  const [domains, setDomains] = useState<Array<{ id: string; name: string; isPublic: boolean }>>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [automationExportSummary, setAutomationExportSummary] = useState({ total: 0, ready: 0, used: 0 });
  const [automationExportBusy, setAutomationExportBusy] = useState(false);
  const [automationImportBusy, setAutomationImportBusy] = useState(false);
  const [automationImportMessage, setAutomationImportMessage] = useState('');
  const [fireworksExportSummary, setFireworksExportSummary] = useState({ total: 0, withApiKey: 0, withoutApiKey: 0 });
  const [fireworksExportBusy, setFireworksExportBusy] = useState(false);
  const automationImportInputRef = useRef<HTMLInputElement | null>(null);
  const isTemporaryInboxDefault = defaultInboxLifetime === 'temporary';
  const msg = (key: string, fallback: string, substitutions?: string[]) => {
    const value = browser.i18n.getMessage(key, substitutions);
    return value || fallback;
  };
  const toErrorText = (error: unknown): string => (
    error instanceof Error ? error.message : String(error ?? '')
  );
  const isUnauthorizedError = (error: unknown): boolean => /\bunauthorized\b|401/i.test(toErrorText(error));
  const isRouteMissingError = (error: unknown): boolean => /\broute not found\b|\bnot found\b|404/i.test(toErrorText(error));
  const enabledStateLabel = msg('settingsStateEnabled', 'enabled');
  const disabledStateLabel = msg('settingsStateDisabled', 'disabled');

  useEffect(() => {
    loadUser();
    checkNotificationStatus();
    loadDomains();
    loadAutomationExportSummary();
    loadFireworksExportSummary();
    // Only load settings from storage if not provided via props
    if (!initialSettings) {
      loadSettings();
    }
  }, []);

  const loadSettings = async () => {
    const settings = await storage.getSettings();
    setAutoCopy(settings.autoCopy);
    setTheme(settings.theme || 'system');
    setDefaultInboxLifetime(settings.defaultInboxLifetime || 'temporary');
    setAutomationExpiryHours(settings.automationExpiryHours || 2);
    setAllowedAutomationDomainIds(settings.automationAllowedDomainIds || []);
  };

  const loadDomains = async () => {
    setDomainsLoading(true);
    try {
      const auth = await storage.getAuth();
      if (!auth?.token) {
        setDomains([]);
        return;
      }
      const response = await api.getDomains();
      setDomains(Array.isArray(response.domains) ? response.domains : []);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await storage.clearAuth();
        onLogout();
        return;
      }
      if (!isRouteMissingError(error)) {
        console.warn('[Settings] Failed to load domains:', error);
      }
      setDomains([]);
    } finally {
      setDomainsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const auth = await storage.getAuth();
      if (auth?.user) {
        setUser(auth.user);
      }

      if (!auth?.token) return;
      if (auth?.user) return;

      const profile = await api.getMe();
      setUser(profile.user);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await storage.clearAuth();
        onLogout();
        return;
      }
      console.warn('[Settings] Failed to load user profile:', error);
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

  const updateDefaultInboxLifetime = async (value: 'temporary' | 'permanent') => {
    setDefaultInboxLifetime(value);
    await storage.updateSettings({ defaultInboxLifetime: value });
    analytics.track('settings_updated', { setting: 'defaultInboxLifetime', value });
  };

  const updateAutomationExpiryHours = async (value: number) => {
    if (!isTemporaryInboxDefault) return;
    setAutomationExpiryHours(value);
    await storage.updateSettings({ automationExpiryHours: value });
    analytics.track('settings_updated', { setting: 'automationExpiryHours', value });
  };

  const toggleAutomationDomain = async (domainId: string) => {
    const current = new Set(allowedAutomationDomainIds);
    if (current.has(domainId)) {
      current.delete(domainId);
    } else {
      current.add(domainId);
    }
    const next = Array.from(current);
    setAllowedAutomationDomainIds(next);
    await storage.updateSettings({ automationAllowedDomainIds: next });
    analytics.track('settings_updated', { setting: 'automationAllowedDomains', count: next.length });
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
          title: msg('settingsShareTitle', 'Ephemera - Disposable Email'),
          text: msg('settingsShareText', 'Check out Ephemera for disposable email addresses!'),
          url: referralUrl,
        });
        analytics.track('referral_shared', { method: 'native_share' });
      }
    }
  };

  const buildCredentialFingerprint = (record: any): string => {
    const email = String(record?.email || '').trim().toLowerCase();
    const password = String(record?.password || '').trim();
    const createdAt = Number.isFinite(record?.createdAt) ? Number(record.createdAt) : 0;
    if (!email || !password) return '';
    return `${email}|${password}|${createdAt}`;
  };

  const normalizeImportedRecord = (record: any): any => {
    const email = String(record?.email || '').trim();
    const password = String(record?.password || '').trim();
    if (!email || !password) return null;
    const createdAt = Number.isFinite(record?.createdAt) ? Number(record.createdAt) : Date.now();
    const flow2UsedAt = Number.isFinite(record?.flow2UsedAt) ? Number(record.flow2UsedAt) : undefined;
    const status = record?.status === 'used' || flow2UsedAt ? 'used' : 'ready';
    return {
      ...record,
      email,
      password,
      createdAt,
      flow2UsedAt,
      status,
    };
  };

  const mergeImportedCredentials = (existing: any[], imported: any[]) => {
    const map = new Map<string, any>();
    let importedCount = 0;
    let duplicateCount = 0;

    const upsert = (item: any, source: 'existing' | 'imported') => {
      const normalized = normalizeImportedRecord(item);
      if (!normalized) return;

      const key = buildCredentialFingerprint(normalized);
      if (!key) return;

      const current = map.get(key);
      if (!current) {
        map.set(key, normalized);
        if (source === 'imported') importedCount += 1;
        return;
      }

      if (source === 'imported') duplicateCount += 1;
      current.flow1CompletedAt = current.flow1CompletedAt || normalized.flow1CompletedAt;
      current.flow2UsedAt = current.flow2UsedAt || normalized.flow2UsedAt;
      current.status = current.status === 'used' || normalized.status === 'used' || current.flow2UsedAt ? 'used' : 'ready';
      if (!current.id && normalized.id) current.id = normalized.id;
      if (!current.inboxId && normalized.inboxId) current.inboxId = normalized.inboxId;
      if (!current.inboxToken && normalized.inboxToken) current.inboxToken = normalized.inboxToken;
    };

    existing.forEach((item) => upsert(item, 'existing'));
    imported.forEach((item) => upsert(item, 'imported'));

    const records = Array.from(map.values())
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .slice(-AUTOMATION_MAX_CREDENTIALS);

    return { records, importedCount, duplicateCount };
  };

  const loadAutomationExportSummary = async () => {
    try {
      const result = await browser.storage.local.get(AUTOMATION_STATE_KEY);
      const state = (result[AUTOMATION_STATE_KEY] as { credentials?: any[] } | undefined) || {};
      const summary = summarizeOpenAiCredentials(state.credentials || []);
      setAutomationExportSummary(summary);
    } catch {
      setAutomationExportSummary({ total: 0, ready: 0, used: 0 });
    }
  };

  const loadFireworksExportSummary = async () => {
    try {
      const result = await browser.storage.local.get(FIREWORKS_FLOW3_STATE_KEY);
      const state = (result[FIREWORKS_FLOW3_STATE_KEY] as { credentials?: any[] } | undefined) || {};
      const summary = summarizeFireworksFlow3Credentials(state.credentials || []);
      setFireworksExportSummary(summary);
    } catch {
      setFireworksExportSummary({ total: 0, withApiKey: 0, withoutApiKey: 0 });
    }
  };

  const handleDownloadAutomationSession = async () => {
    setAutomationExportBusy(true);
    try {
      const result = await browser.storage.local.get(AUTOMATION_STATE_KEY);
      const state = (result[AUTOMATION_STATE_KEY] as { credentials?: any[] } | undefined) || {};
      const records = Array.isArray(state.credentials) ? state.credentials : [];
      const txt = formatOpenAiCredentialsAsTxt(records, Date.now());
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `ephemera-openai-flow-session-${stamp}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      analytics.track('settings_updated', {
        setting: 'openaiFlowSessionExport',
        count: records.length,
      });
      await loadAutomationExportSummary();
    } catch (error) {
      console.error('[Settings] Failed to export OpenAI flow session:', error);
    } finally {
      setAutomationExportBusy(false);
    }
  };

  const handleDownloadFireworksFlow3Session = async () => {
    setFireworksExportBusy(true);
    try {
      const result = await browser.storage.local.get(FIREWORKS_FLOW3_STATE_KEY);
      const state = (result[FIREWORKS_FLOW3_STATE_KEY] as { credentials?: any[] } | undefined) || {};
      const records = Array.isArray(state.credentials) ? state.credentials : [];
      const txt = formatFireworksFlow3CredentialsAsTxt(records, Date.now());
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `ephemera-fireworks-flow3-session-${stamp}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      analytics.track('settings_updated', {
        setting: 'fireworksFlow3SessionExport',
        count: records.length,
      });
      await loadFireworksExportSummary();
    } catch (error) {
      console.error('[Settings] Failed to export Fireworks Flow 3 session:', error);
    } finally {
      setFireworksExportBusy(false);
    }
  };

  const handleOpenAutomationImport = () => {
    automationImportInputRef.current?.click();
  };

  const handleAutomationImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAutomationImportBusy(true);
    setAutomationImportMessage('');

    try {
      const text = await file.text();
      const importedRecords = parseOpenAiCredentialsFromTxt(text);
      if (importedRecords.length === 0) {
        setAutomationImportMessage(msg('settingsAutomationImportEmpty', 'No valid credential rows found in this TXT file.'));
        return;
      }

      const result = await browser.storage.local.get(AUTOMATION_STATE_KEY);
      const state = (result[AUTOMATION_STATE_KEY] as { credentials?: any[]; [key: string]: any } | undefined) || {};
      const existingRecords = Array.isArray(state.credentials) ? state.credentials : [];
      const merged = mergeImportedCredentials(existingRecords, importedRecords);

      await browser.storage.local.set({
        [AUTOMATION_STATE_KEY]: {
          ...state,
          credentials: merged.records,
          updatedAt: Date.now(),
        },
      });

      setAutomationImportMessage(msg(
        'settingsAutomationImportDone',
        'Imported $1 new row(s), skipped $2 duplicate row(s).',
        [String(merged.importedCount), String(merged.duplicateCount)],
      ));
      analytics.track('settings_updated', {
        setting: 'openaiFlowSessionImport',
        imported: merged.importedCount,
        duplicates: merged.duplicateCount,
        totalAfter: merged.records.length,
      });
      await loadAutomationExportSummary();
    } catch (error) {
      console.error('[Settings] Failed to import OpenAI flow session:', error);
      setAutomationImportMessage(msg('settingsAutomationImportFailed', 'Import failed. Please verify TXT format and try again.'));
    } finally {
      event.target.value = '';
      setAutomationImportBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 p-2 space-y-4">
      <div className="glass-morphism sticky top-0 flex items-center gap-3 p-3 z-20 border border-white/20 dark:border-slate-800/50 rounded-2xl">
        <button
          onClick={onBack}
          aria-label={msg('goBackToInboxList', 'Go back to inbox list')}
          className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <h2 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-widest">{t('settings')}</h2>
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
                  {user?.role || msg('settingsRoleUser', 'User')}
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
              {msg('settingsManageAccount', 'Manage Account')}
              <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            {msg('settingsAppearance', 'Appearance')}
          </h3>
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {[
              { id: 'light', icon: Sun, label: msg('settingsThemeLight', 'Light') },
              { id: 'dark', icon: Moon, label: msg('settingsThemeDark', 'Dark') },
              { id: 'system', icon: Monitor, label: msg('settingsThemeSystem', 'System') }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => updateTheme(item.id as any)}
                aria-pressed={theme === item.id}
                aria-label={msg('settingsThemeAria', '$1 theme$2', [
                  item.label,
                  theme === item.id ? msg('settingsThemeSelectedSuffix', ' (selected)') : '',
                ])}
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
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            {msg('settingsPreferences', 'Preferences')}
          </h3>

          <div className="space-y-2">
            <button
              onClick={toggleNotifications}
              disabled={notifLoading}
              aria-pressed={notificationsEnabled}
              aria-label={msg('settingsPushNotificationsAria', 'Push notifications $1. Click to toggle.', [
                notificationsEnabled ? enabledStateLabel : disabledStateLabel,
              ])}
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
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{msg('settingsPushNotifications', 'Push Notifications')}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{msg('settingsPushNotificationsHint', 'Get alerted for new messages')}</p>
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
              aria-label={msg('settingsAutoCopyAria', 'Auto-copy address $1. Click to toggle.', [
                autoCopy ? enabledStateLabel : disabledStateLabel,
              ])}
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
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{msg('settingsAutoCopyAddress', 'Auto-copy Address')}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{msg('settingsAutoCopyHint', 'Copy on creation')}</p>
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

            <div className="w-full card-material p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{msg('settingsDefaultInboxType', 'Default Inbox Type')}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{msg('settingsDefaultInboxTypeHint', 'Applied when extension creates inbox')}</p>
                </div>
              </div>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => updateDefaultInboxLifetime('temporary')}
                  aria-pressed={defaultInboxLifetime === 'temporary'}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-bold transition-all duration-200",
                    defaultInboxLifetime === 'temporary'
                      ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {msg('settingsInboxTypeTemporary', 'Temporary (24h)')}
                </button>
                <button
                  onClick={() => updateDefaultInboxLifetime('permanent')}
                  aria-pressed={defaultInboxLifetime === 'permanent'}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-bold transition-all duration-200",
                    defaultInboxLifetime === 'permanent'
                      ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {msg('settingsInboxTypePermanent', 'Permanent')}
                </button>
              </div>
            </div>

            <div className="w-full card-material p-4 space-y-3">
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{msg('settingsAutomationConfig', 'OpenAI Automation & Quick Create')}</p>
                <p className="text-[10px] text-slate-400 font-medium">{msg('settingsAutomationConfigHint', 'Allowed domains apply to automation and quick inbox actions')}</p>
              </div>

              <label className="flex items-center justify-between gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <span>{msg('settingsAutomationExpiry', 'Automation inbox expiry')}</span>
                <select
                  value={String(automationExpiryHours)}
                  onChange={(event) => updateAutomationExpiryHours(Number(event.target.value))}
                  disabled={!isTemporaryInboxDefault}
                  className={cn(
                    "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200",
                    !isTemporaryInboxDefault && "cursor-not-allowed opacity-60"
                  )}
                  aria-label={msg('settingsAutomationExpiryAria', 'Select automation inbox expiry in hours')}
                >
                  {[1, 2, 6, 12, 24].map((hours) => (
                    <option key={hours} value={String(hours)}>
                      {hours}h
                    </option>
                  ))}
                </select>
              </label>
              {!isTemporaryInboxDefault && (
                <p className="text-[10px] text-slate-400">
                  {msg('settingsAutomationExpiryDisabledHint', 'Set to Permanent so this expiry option is disabled')}
                </p>
              )}

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {msg('settingsAutomationDomains', 'Allowed Domains')}
                </p>
                {domainsLoading && (
                  <p className="text-[11px] text-slate-400">{msg('settingsAutomationDomainsLoading', 'Loading domains...')}</p>
                )}
                {!domainsLoading && domains.length === 0 && (
                  <p className="text-[11px] text-slate-400">{msg('settingsAutomationDomainsEmpty', 'No domains available')}</p>
                )}
                {!domainsLoading && domains.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {domains.map((domain) => {
                      const checked = allowedAutomationDomainIds.includes(domain.id);
                      return (
                        <label
                          key={domain.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-200"
                        >
                          <span className="font-medium">@{domain.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAutomationDomain(domain.id)}
                            aria-label={msg('settingsAutomationDomainAria', 'Allow domain $1 for automation', [domain.name])}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-slate-400">
                  {allowedAutomationDomainIds.length === 0
                    ? msg('settingsAutomationDomainsAll', 'No domain selected = use all domains')
                    : msg('settingsAutomationDomainsCount', '$1 domain(s) selected', [String(allowedAutomationDomainIds.length)])}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {msg('settingsAutomationExportTitle', 'OpenAI Flow Session Data')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {msg('settingsAutomationExportHint', 'Download generated email/password history as TXT')}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {msg('settingsAutomationExportSummary', 'Total: $1 • Ready: $2 • Used: $3', [
                    String(automationExportSummary.total),
                    String(automationExportSummary.ready),
                    String(automationExportSummary.used),
                  ])}
                </p>
                <button
                  onClick={handleDownloadAutomationSession}
                  disabled={automationExportBusy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {automationExportBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {automationExportBusy
                    ? msg('settingsAutomationExportDownloading', 'Preparing file...')
                    : msg('settingsAutomationExportDownload', 'Download TXT Session Data')}
                </button>
                <input
                  ref={automationImportInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleAutomationImportFileChange}
                  className="hidden"
                />
                <button
                  onClick={handleOpenAutomationImport}
                  disabled={automationImportBusy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {automationImportBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {automationImportBusy
                    ? msg('settingsAutomationImportProcessing', 'Importing...')
                    : msg('settingsAutomationImportUpload', 'Import TXT Session Data')}
                </button>
                {automationImportMessage && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{automationImportMessage}</p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {msg('settingsFireworksFlow3ExportTitle', 'Fireworks Flow 3 Session Data')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {msg('settingsFireworksFlow3ExportHint', 'Download email/password/api key history as TXT')}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {msg('settingsFireworksFlow3ExportSummary', 'Total: $1 • With API Key: $2 • Without API Key: $3', [
                      String(fireworksExportSummary.total),
                      String(fireworksExportSummary.withApiKey),
                      String(fireworksExportSummary.withoutApiKey),
                    ])}
                  </p>
                  <button
                    onClick={handleDownloadFireworksFlow3Session}
                    disabled={fireworksExportBusy}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-primary-300 dark:hover:border-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {fireworksExportBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {fireworksExportBusy
                      ? msg('settingsFireworksFlow3ExportDownloading', 'Preparing file...')
                      : msg('settingsFireworksFlow3ExportDownload', 'Download Flow 3 TXT Data')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share & Invite */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            {msg('settingsShareInvite', 'Share & Invite')}
          </h3>
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
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{msg('settingsShareEphemera', 'Share Ephemera')}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {referralCopied ? msg('settingsLinkCopied', 'Link copied!') : msg('settingsInviteFriends', 'Invite friends to try Ephemera')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Support & Legal */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
            {msg('settingsSupportLegal', 'Support & Legal')}
          </h3>
          <div className="card-material divide-y divide-slate-50 dark:divide-slate-800/50 overflow-hidden">
            <a
              href={`${CONFIG.WEB_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{msg('settingsMainDashboard', 'Main Dashboard')}</span>
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
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{msg('settingsPrivacyTerms', 'Privacy & Terms')}</span>
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
          <span className="text-xs font-bold uppercase tracking-wider">{msg('settingsSignOut', 'Sign Out')}</span>
        </button>

        <div className="text-center pt-4">
          <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">Ephemera Engine v0.1.0</p>
        </div>
      </div>
    </div>
  );
}

