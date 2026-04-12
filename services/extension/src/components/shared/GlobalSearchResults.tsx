import { Message } from '../../shared/types';
import { Loader2, Mail, Calendar, ChevronRight } from 'lucide-react';
import { t } from '../../shared/i18n';
import { cn } from '../../utils/cn';

interface GlobalSearchResultsProps {
  results: Message[];
  loading: boolean;
  onSelectMessage: (msg: Message) => void;
}

export default function GlobalSearchResults({ results, loading, onSelectMessage }: GlobalSearchResultsProps) {
  const getSender = (value: string | null | undefined) => {
    if (typeof value !== 'string') return t('messageListUnknownSender');
    const normalized = value.trim();
    return normalized || t('messageListUnknownSender');
  };

  const getSenderInitial = (value: string | null | undefined) => getSender(value).charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary-500" />
        <span className="text-xs font-medium">{t('loading')}...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 opacity-60">
        <Mail className="w-8 h-8 mb-2" />
        <span className="text-xs font-medium">{t('noSearchResults')}</span>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {results.length} {t('searchResultsCount')}
      </div>
      {results.map((msg) => (
        <div
          key={msg.id}
          onClick={() => onSelectMessage(msg)}
          className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer transition-all"
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform duration-300 group-hover:scale-105",
            !msg.isRead
              ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            {getSenderInitial(msg.from)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className={cn(
                "text-xs truncate mr-2",
                !msg.isRead ? "font-bold text-slate-800 dark:text-slate-100" : "font-medium text-slate-600 dark:text-slate-400"
              )}>
                {getSender(msg.from)}
              </span>
              <span className="text-[9px] text-slate-400 shrink-0">
                {formatDate(msg.receivedAt)}
              </span>
            </div>
            <h4 className={cn(
              "text-xs truncate",
              !msg.isRead ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
            )}>
              {msg.subject || '(No Subject)'}
            </h4>
          </div>

          <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}
