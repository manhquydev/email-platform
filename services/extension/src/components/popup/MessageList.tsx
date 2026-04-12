import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../../shared/api';
import { analytics } from '../../shared/analytics';
import { Message } from '../../shared/types';
import { ArrowLeft, Loader2, Calendar, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '../../utils/cn';
import SearchInput from '../shared/SearchInput';
import browser from 'webextension-polyfill';

interface MessageListProps {
  inboxId: string;
  email: string;
  onBack: () => void;
}

export default function MessageList({ inboxId, email, onBack }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [fromCache, setFromCache] = useState(false);
  const tr = (key: string, fallback: string, substitutions?: string[]) => {
    const value = browser.i18n.getMessage(key, substitutions);
    return value || fallback;
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter((msg) =>
      msg.subject?.toLowerCase().includes(query) ||
      (msg.from || '').toLowerCase().includes(query) ||
      msg.textBody?.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [inboxId]);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchMessages(); // Refresh when back online
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [inboxId]);

  const handleSelectMessage = (msg: Message) => {
    analytics.track('message_viewed', { messageId: msg.id });
    setSelectedMessage(msg);
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.getMessagesWithCache(inboxId);
      setMessages(response.data);
      setFromCache(response.fromCache);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tr('messageListLoadFailed', 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSender = (value: string | null | undefined) => {
    const sender = typeof value === 'string' ? value.trim() : '';
    return sender || tr('messageListUnknownSender', 'Unknown sender');
  };

  const getSenderInitial = (value: string | null | undefined) => getSender(value).charAt(0).toUpperCase();

  if (selectedMessage) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="glass-morphism sticky top-0 flex items-center gap-3 p-3 z-20 border border-white/20 dark:border-slate-800/50 rounded-2xl mx-1 mt-1">
          <button
            onClick={() => setSelectedMessage(null)}
            aria-label={tr('goBackToMessageList', 'Go back to message list')}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate uppercase tracking-widest">
              {selectedMessage.subject || tr('messageListNoSubject', '(No Subject)')}
            </h3>
            <p className="text-[10px] text-slate-500 truncate">{getSender(selectedMessage.from)}</p>
          </div>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-4 pt-4">
          <div className="card-material p-4 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                {getSenderInitial(selectedMessage.from)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{getSender(selectedMessage.from)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px]">
                  <Calendar className="w-2.5 h-2.5" />
                  {formatDate(selectedMessage.receivedAt)}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

            <div className="prose prose-sm max-w-none dark:prose-invert">
              {selectedMessage.htmlBody ? (
                <div
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedMessage.htmlBody) }}
                  className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                  {selectedMessage.textBody}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 p-2 space-y-4">
      <div className="glass-morphism sticky top-0 flex items-center gap-3 p-3 z-20 border border-white/20 dark:border-slate-800/50 rounded-2xl">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate uppercase tracking-widest">{email}</h2>
            {isOffline && (
              <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                {tr('messageListOffline', 'OFFLINE')}
              </span>
            )}
            {fromCache && !isOffline && (
              <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                {tr('messageListCached', 'cached')}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            {searchQuery
              ? tr('messageListCountFiltered', '$1 of $2 messages', [String(filteredMessages.length), String(messages.length)])
              : tr('messageListCountAll', '$1 messages', [String(messages.length)])}
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="p-2 text-slate-400 hover:text-primary-500 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Search input - only show when messages exist */}
      {messages.length > 0 && (
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={tr('messageListSearchPlaceholder', 'Search messages...')}
          className="px-1"
        />
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-2xl border border-red-100 dark:border-red-800/30 backdrop-blur-sm mx-2">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-xs mx-2">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 opacity-50" />
            <p className="text-sm text-slate-400 font-medium mb-2">{tr('messageListEmptyTitle', 'Your inbox is empty')}</p>
            <p className="text-xs text-slate-400/70 mb-3">{tr('messageListEmptyHint', 'Messages will appear here when received')}</p>
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-all"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              {tr('messageListCheckMessages', 'Check for messages')}
            </button>
          </div>
        ) : filteredMessages.length === 0 && searchQuery ? (
          <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-xs mx-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-50" />
            <p className="text-sm text-slate-400 font-medium">{tr('messageListNoMatching', 'No matching messages')}</p>
            <p className="text-xs text-slate-400/70 mt-1">{tr('messageListNoMatchingHint', 'Try a different search term')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={cn(
                  "card-material group p-3.5 cursor-pointer flex gap-4 items-center transition-all duration-300",
                  !msg.isRead && "border-l-4 border-l-primary-500 pl-2.5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-transform duration-300 group-hover:scale-105",
                  !msg.isRead
                    ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                )}>
                  {getSenderInitial(msg.from)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={cn(
                      "text-xs truncate mr-2",
                      !msg.isRead ? "font-bold text-slate-800 dark:text-slate-100" : "font-medium text-slate-600 dark:text-slate-400"
                    )}>
                      {getSender(msg.from)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase whitespace-nowrap">
                      {formatDate(msg.receivedAt)}
                    </span>
                  </div>
                  <h4 className={cn(
                    "text-xs truncate",
                    !msg.isRead ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                  )}>
                    {msg.subject || tr('messageListNoSubject', '(No Subject)')}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1">
                    {msg.textBody ? msg.textBody.substring(0, 70) : tr('messageListEllipsis', '...')}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

