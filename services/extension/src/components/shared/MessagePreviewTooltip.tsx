import React, { useState, useRef } from 'react';
import { api } from '../../shared/api';
import { Message } from '../../shared/types';
import { t } from '../../shared/i18n';
import { Loader2 } from 'lucide-react';

interface MessagePreviewTooltipProps {
  inboxId: string;
  children: React.ReactNode;
}

export default function MessagePreviewTooltip({ inboxId, children }: MessagePreviewTooltipProps) {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const fetchedRef = useRef(false);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(async () => {
      setShow(true);
      if (!fetchedRef.current && !message) {
        setLoading(true);
        try {
          const response = await api.getMessages(inboxId, 1);
          if (response.data[0]) {
            setMessage(response.data[0]);
          }
          fetchedRef.current = true;
        } catch (e) {
          // Ignore error
        } finally {
          setLoading(false);
        }
      }
    }, 500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  return (
    <div className="relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl p-3 w-64 border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-slate-100 dark:border-slate-700 rotate-45"></div>

          {loading ? (
            <div className="flex items-center justify-center py-2 text-slate-400 gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px]">{t('loadingPreview')}...</span>
            </div>
          ) : message ? (
            <>
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate flex-1">{message.from}</p>
                <span className="text-[9px] text-slate-400 ml-2">
                  {new Date(message.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium mb-1">
                {message.subject || '(No Subject)'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                {message.textBody?.slice(0, 100) || '...'}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-1">{t('noMessages')}</p>
          )}
        </div>
      )}
    </div>
  );
}
