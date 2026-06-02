import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { Inbox } from '../../shared/types';
import { storage } from '../../shared/storage';
import { t } from '../../shared/i18n';
import { Plus, Copy, RefreshCw, Loader2, Mail, Clock, Sparkles, ExternalLink, CalendarPlus, Trash2, QrCode, Pin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CONFIG } from '../../shared/config';
import CreateInboxModal from '../shared/CreateInboxModal';
import QRCodeModal from '../shared/QRCodeModal';
import { InboxSkeleton } from '../shared/Skeleton';
import CountdownRing from '../shared/CountdownRing';
import { usePinnedInboxes } from '../../hooks/usePinnedInboxes';
import browser from 'webextension-polyfill';

interface InboxListProps {
  onSelectInbox: (id: string, email: string) => void;
}

export default function InboxList({ onSelectInbox }: InboxListProps) {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalInboxes: number; limit: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [qrEmail, setQrEmail] = useState<string | null>(null);
  const msg = (key: string, fallback: string, substitutions?: string[]) => {
    const value = browser.i18n.getMessage(key, substitutions);
    return value || fallback;
  };

  const { isPinned, togglePin } = usePinnedInboxes();

  // Sort inboxes: pinned first, then by creation date
  const sortedInboxes = [...inboxes].sort((a, b) => {
    const aPinned = isPinned(a.id);
    const bPinned = isPinned(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return t('expired');

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const fetchInboxes = async () => {
    setLoading(true);
    try {
      const response = await api.getDashboard();
      const mappedInboxes: Inbox[] = response.inboxes.map(inbox => ({
        id: inbox.id,
        localPart: inbox.localPart,
        domainId: '',
        domain: { id: '', name: inbox.domain, isPublic: true },
        ownerId: '',
        createdAt: inbox.createdAt,
        expiresAt: inbox.expiresAt,
        _count: { messages: inbox.unreadCount }
      }));
      setInboxes(mappedInboxes);

      const limit = typeof response.stats.inboxLimit === 'number'
        ? response.stats.inboxLimit
        : mappedInboxes.length;
      setStats({
        totalInboxes: response.stats.totalInboxes,
        limit
      });

      // Sync to storage for content script using standardized helper
      await storage.setInboxes(response.inboxes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : msg('inboxListLoadFailed', 'Failed to load inboxes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxes();
  }, []);

  const handleCreateInbox = async () => {
    setCreating(true);
    try {
      const response = await api.createQuickInbox();
      if (response.success && response.inbox) {
        analytics.track('inbox_created_manual');
        const newInboxData = response.inbox;
        const newInbox: Inbox = {
          id: newInboxData.id,
          localPart: newInboxData.localPart,
          domainId: '',
          domain: { id: '', name: newInboxData.domain?.name || newInboxData.domain, isPublic: true },
          ownerId: '',
          createdAt: newInboxData.createdAt,
          expiresAt: newInboxData.expiresAt,
          _count: { messages: 0 }
        };
        setInboxes([newInbox, ...inboxes]);

        // Sync full list to storage
        const dashboard = await api.getDashboard();
        await storage.setInboxes(dashboard.inboxes);

        // Also copy to clipboard if enabled
        const settings = await storage.getSettings();
        const email = newInboxData.address || `${newInboxData.localPart}@${newInboxData.domain?.name || newInboxData.domain}`;
        if (settings.autoCopy) {
          await copyToClipboard(email);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : msg('inboxListCreateFailed', 'Failed to create inbox'));
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const handleCreateCustomInbox = async (localPart: string, domainId: string) => {
    setCreating(true);
    try {
      const response = await api.createCustomInbox(localPart, domainId);
      if (response.success && response.inbox) {
        analytics.track('inbox_created_custom', { localPart });
        const newInboxData = response.inbox;
        const newInbox: Inbox = {
          id: newInboxData.id,
          localPart: newInboxData.localPart,
          domainId: '',
          domain: { id: '', name: newInboxData.domain?.name || newInboxData.domain, isPublic: true },
          ownerId: '',
          createdAt: newInboxData.createdAt,
          expiresAt: newInboxData.expiresAt,
          _count: { messages: 0 }
        };
        setInboxes([newInbox, ...inboxes]);

        // Sync full list to storage
        const dashboard = await api.getDashboard();
        await storage.setInboxes(dashboard.inboxes);

        // Also copy to clipboard if enabled
        const settings = await storage.getSettings();
        const email = newInboxData.address || `${newInboxData.localPart}@${newInboxData.domain?.name || newInboxData.domain}`;
        if (settings.autoCopy) {
          await copyToClipboard(email);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : msg('inboxListCreateFailed', 'Failed to create inbox'));
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const handleSelectInbox = (id: string, email: string) => {
    analytics.track('message_viewed', { context: 'inbox_list_item' });
    onSelectInbox(id, email);
  };

  const handleTogglePermanent = async (inbox: Inbox) => {
    setUpdatingId(inbox.id);
    try {
      const isPermanent = !inbox.expiresAt;
      const newExpiresAt = isPermanent
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      await api.updateInbox(inbox.id, { expiresAt: newExpiresAt });

      setInboxes(prev => prev.map(i =>
        i.id === inbox.id ? { ...i, expiresAt: newExpiresAt } : i
      ));

      // Sync to storage
      const dashboard = await api.getDashboard();
      await storage.setInboxes(dashboard.inboxes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : msg('inboxListUpdateFailed', 'Failed to update inbox'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExtendInbox = async (inbox: Inbox) => {
    if (!inbox.expiresAt) return;
    setUpdatingId(inbox.id);
    try {
      const currentExpires = new Date(inbox.expiresAt).getTime();
      const newExpiresAt = new Date(currentExpires + 10 * 60 * 1000).toISOString();

      await api.updateInbox(inbox.id, { expiresAt: newExpiresAt });

      setInboxes(prev => prev.map(i =>
        i.id === inbox.id ? { ...i, expiresAt: newExpiresAt } : i
      ));

      // Sync to storage
      const dashboard = await api.getDashboard();
      await storage.setInboxes(dashboard.inboxes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : msg('inboxListExtendFailed', 'Failed to extend inbox'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteInbox = async (id: string) => {
    if (!window.confirm(msg('inboxListDeleteConfirm', 'Are you sure you want to delete this inbox?'))) return;
    setUpdatingId(id);
    try {
      await api.deleteInbox(id);
      setInboxes(prev => prev.filter(i => i.id !== id));

      // Sync to storage
      const dashboard = await api.getDashboard();
      await storage.setInboxes(dashboard.inboxes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : msg('inboxListDeleteFailed', 'Failed to delete inbox'));
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (loading && inboxes.length === 0) {
    return (
      <div className="p-4 space-y-4" role="status" aria-label={msg('inboxListLoadingAria', 'Loading inboxes')}>
        <div className="flex justify-between items-center px-1">
          <div className="flex flex-col">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('activeInboxes')}</h2>
          </div>
        </div>
        <div className="space-y-3">
          <InboxSkeleton />
          <InboxSkeleton />
          <InboxSkeleton />
        </div>
        <span className="sr-only">{msg('inboxListLoadingSrOnly', 'Loading your inboxes, please wait...')}</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('activeInboxes')}</h2>
          {stats && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {msg('inboxListUsage', 'Usage:')} <span className={cn(
                "font-bold",
                stats.limit > 0 && stats.totalInboxes >= stats.limit ? "text-red-500" : "text-primary-500"
              )}>{stats.totalInboxes}/{stats.limit < 0 ? '∞' : stats.limit}</span>
            </p>
          )}
        </div>
        <button
          onClick={fetchInboxes}
          className="text-slate-400 hover:text-primary-500 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
          title={t('refresh')}
          aria-label={msg('inboxListRefreshAria', 'Refresh inbox list')}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <button
        onClick={() => setShowCreateModal(true)}
        disabled={creating}
        className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-2xl shadow-lg shadow-primary-500/20 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
      >
        <Plus className="w-4 h-4 stroke-[3px]" />
        {t('createNewInbox')}
      </button>

      <CreateInboxModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRandom={handleCreateInbox}
        onCreateCustom={handleCreateCustomInbox}
        isCreating={creating}
      />

      <QRCodeModal
        isOpen={!!qrEmail}
        onClose={() => setQrEmail(null)}
        email={qrEmail || ''}
      />

      {error && (
        <div className="p-3 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-800/30 backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {inboxes.length === 0 ? (
          <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-xs">
            <Mail className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 opacity-50" />
            <p className="text-sm text-slate-400 font-medium mb-3">{t('noInboxes')}</p>
            <button
              onClick={handleCreateInbox}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('createFirstInbox')}
            </button>
          </div>
        ) : (
          sortedInboxes.map((inbox) => (
            <div
              key={inbox.id}
              className={cn(
                "card-material group p-3.5",
                isPinned(inbox.id) && "ring-1 ring-primary-200 dark:ring-primary-800/50"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1" title={`${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}`}>
                    {inbox.localPart}
                    <span className="text-slate-400 dark:text-slate-500 font-medium">@{typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <Mail className="w-3 h-3" />
                      {inbox._count?.messages || 0}
                    </span>
                    {inbox.expiresAt && (
                      <div className="flex items-center gap-1.5" title={msg('inboxListExpiresIn', 'Expires in $1', [formatTimeLeft(inbox.expiresAt) || ''])}>
                        <CountdownRing expiresAt={inbox.expiresAt} size={20} strokeWidth={2.5} />
                        <span className={cn(
                          "text-[9px] font-bold tabular-nums tracking-tight",
                           (new Date(inbox.expiresAt).getTime() - now) < 300000
                            ? "text-red-500 animate-pulse"
                            : "text-slate-400 dark:text-slate-500"
                        )}>
                          {formatTimeLeft(inbox.expiresAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => {
                      const domainName = typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name;
                      copyToClipboard(`${inbox.localPart}@${domainName}`, inbox.id);
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-200",
                      copiedId === inbox.id ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    )}
                    title={msg('inboxListCopyAddress', 'Copy Address')}
                    aria-label={msg('inboxListCopyAddressAria', 'Copy email address to clipboard')}
                  >
                    {copiedId === inbox.id ? (
                      <span className="text-[9px] font-black uppercase">{t('copied')}</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const domainName = typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name;
                      setQrEmail(`${inbox.localPart}@${domainName}`);
                    }}
                    className="p-2 rounded-xl transition-all duration-200 text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    title={msg('inboxListShowQr', 'Show QR Code')}
                    aria-label={msg('inboxListShowQrAria', 'Show QR code for this email')}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePin(inbox.id)}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-200",
                      isPinned(inbox.id)
                        ? "text-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    )}
                    title={isPinned(inbox.id) ? t('unpinInbox') : t('pinInbox')}
                    aria-label={isPinned(inbox.id) ? msg('inboxListUnpinAria', 'Unpin inbox') : msg('inboxListPinAria', 'Pin inbox')}
                  >
                    <Pin className={cn("w-3.5 h-3.5", isPinned(inbox.id) && "fill-current")} />
                  </button>
                  <button
                    onClick={() => handleTogglePermanent(inbox)}
                    disabled={updatingId === inbox.id}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-200 disabled:opacity-50",
                      !inbox.expiresAt
                        ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        : "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    )}
                    title={!inbox.expiresAt ? msg('inboxListSwitchTemporary', 'Switch to Temporary (24h)') : msg('inboxListMakePermanent', 'Make Permanent')}
                    aria-label={!inbox.expiresAt ? msg('inboxListSwitchTemporaryAria', 'Switch inbox to temporary mode') : msg('inboxListMakePermanentAria', 'Make inbox permanent')}
                  >
                    {updatingId === inbox.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : !inbox.expiresAt ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                 <button
                   onClick={() => {
                     const domainName = typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name;
                     handleSelectInbox(inbox.id, `${inbox.localPart}@${domainName}`);
                   }}
                   className="flex-1 text-[11px] font-bold py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-700 rounded-xl text-center transition-all duration-200 shadow-sm"
                 >
                   {t('viewMessages')}
                 </button>
                 <a
                   href={`${CONFIG.WEB_URL}/inbox/${inbox.id}`}
                   target="_blank"
                   rel="noreferrer"
                   className="flex-1 text-[11px] font-bold py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-100 dark:border-slate-700 rounded-xl text-center transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
                 >
                   {t('dashboard')} <ExternalLink className="w-3 h-3" />
                 </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
