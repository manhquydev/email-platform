import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, Reply, Forward } from 'lucide-react';
import { Message, ComposeData } from '../../shared/types';
import { t } from '../../shared/i18n';
import { cn } from '../../utils/cn';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reply' | 'forward';
  originalMessage: Message | null;
  onSend: (data: ComposeData) => Promise<void>;
  sending: boolean;
  error?: string | null;
}

export default function ComposeModal({
  isOpen,
  onClose,
  mode,
  originalMessage,
  onSend,
  sending,
  error
}: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTo('');
      setContent('');
    }
  }, [isOpen, originalMessage]);

  if (!isOpen || !originalMessage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSend({ to: mode === 'forward' ? to : undefined, content });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            {mode === 'reply' ? (
              <Reply className="w-4 h-4 text-primary-500" />
            ) : (
              <Forward className="w-4 h-4 text-primary-500" />
            )}
            <h3 className="font-bold text-slate-800 dark:text-slate-100">
              {mode === 'reply' ? t('reply') : t('forward')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-3">
            {mode === 'forward' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t('to')}
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <span className="font-bold block mb-1">Original Message:</span>
              <div className="truncate opacity-75">{originalMessage.subject}</div>
              <div className="truncate opacity-50 text-[10px]">From: {originalMessage.from}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t('composeBody')}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={5}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all resize-none"
                placeholder="Type your message..."
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? t('sending') : t('send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
