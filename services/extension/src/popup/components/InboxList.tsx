import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { Inbox } from '../../shared/types';
import { storage } from '../../shared/storage';
import { Plus, Copy, RefreshCw, Loader2, Mail, Clock, Sparkles, ExternalLink, CalendarPlus, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { CONFIG } from '../../shared/config';

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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expired';

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

      // Set stats for limit indicator
      const tier = response.user.tier || 'FREE';
      const limit = tier === 'FREE' ? 5 : (tier === 'STARTER' ? 20 : 100); // Mirroring TIER_LIMITS
      setStats({
        totalInboxes: response.stats.totalInboxes,
        limit
      });

      // Sync to storage for content script using standardized helper
      await storage.setInboxes(response.inboxes);
    } catch (err: any) {
      setError(err.message || 'Failed to load inboxes');
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
    } catch (err: any) {
      setError(err.message || 'Failed to create inbox');
    } finally {
      setCreating(false);
    }
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
    } catch (err: any) {
      setError(err.message || 'Failed to update inbox');
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
    } catch (err: any) {
      setError(err.message || 'Failed to extend inbox');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteInbox = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inbox?')) return;
    setUpdatingId(id);
    try {
      await api.deleteInbox(id);
      setInboxes(prev => prev.filter(i => i.id !== id));

      // Sync to storage
      const dashboard = await api.getDashboard();
      await storage.setInboxes(dashboard.inboxes);
    } catch (err: any) {
      setError(err.message || 'Failed to delete inbox');
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (loading && inboxes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700">Active Inboxes</h2>
          {stats && (
            <p className="text-[10px] text-gray-500">
              Usage: <span className={cn(
                "font-medium",
                stats.totalInboxes >= stats.limit ? "text-red-500" : "text-primary-600"
              )}>{stats.totalInboxes}/{stats.limit}</span>
            </p>
          )}
        </div>
        <button
          onClick={fetchInboxes}
          className="text-gray-400 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={handleCreateInbox}
        disabled={creating}
        className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
      >
        {creating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Create Random Email
      </button>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {inboxes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No inboxes yet</p>
          </div>
        ) : (
          inboxes.map((inbox) => (
            <div
              key={inbox.id}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium text-gray-900 truncate" title={`${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}`}>
                    {inbox.localPart}
                    <span className="text-gray-500 font-normal">@{typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <span>{inbox._count?.messages || 0} messages</span>
                    {inbox.expiresAt && (
                      <span className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                        (new Date(inbox.expiresAt).getTime() - now) < 300000
                          ? "bg-red-50 text-red-600 animate-pulse"
                          : "bg-blue-50 text-blue-600"
                      )}>
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeLeft(inbox.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const domainName = typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name;
                      copyToClipboard(`${inbox.localPart}@${domainName}`);
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    title="Copy Address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleTogglePermanent(inbox)}
                    disabled={updatingId === inbox.id}
                    className={cn(
                      "p-1.5 rounded-md transition-colors disabled:opacity-50",
                      !inbox.expiresAt
                        ? "text-amber-500 hover:bg-amber-50"
                        : "text-purple-500 hover:bg-purple-50"
                    )}
                    title={!inbox.expiresAt ? "Switch to Temporary (24h)" : "Make Permanent"}
                  >
                    {updatingId === inbox.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : !inbox.expiresAt ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {inbox.expiresAt && (
                    <button
                      onClick={() => handleExtendInbox(inbox)}
                      disabled={updatingId === inbox.id}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                      title="Extend +10m"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteInbox(inbox.id)}
                    disabled={updatingId === inbox.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    title="Delete Inbox"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                 <button
                   onClick={() => {
                     const domainName = typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name;
                     onSelectInbox(inbox.id, `${inbox.localPart}@${domainName}`);
                   }}
                   className="flex-1 text-xs py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-center transition-colors"
                 >
                   View Messages
                 </button>
                 <a
                   href={`${CONFIG.WEB_URL}/inbox/${inbox.id}`}
                   target="_blank"
                   rel="noreferrer"
                   className="flex-1 text-xs py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-center transition-colors flex items-center justify-center gap-1"
                 >
                   Open <ExternalLink className="w-3 h-3" />
                 </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
