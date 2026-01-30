import { useState } from 'react';
import { api } from '../shared/api';
import { Message, ComposeData } from '../shared/types';
import { t } from '../shared/i18n';

export function useCompose() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'reply' | 'forward'>('reply');
  const [originalMessage, setOriginalMessage] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openReply = (message: Message) => {
    setMode('reply');
    setOriginalMessage(message);
    setIsOpen(true);
    setError(null);
  };

  const openForward = (message: Message) => {
    setMode('forward');
    setOriginalMessage(message);
    setIsOpen(true);
    setError(null);
  };

  const close = () => {
    setIsOpen(false);
    setOriginalMessage(null);
    setSending(false);
    setError(null);
  };

  const send = async (data: ComposeData) => {
    if (!originalMessage) return;

    setSending(true);
    setError(null);

    try {
      if (mode === 'reply') {
        await api.sendReply(originalMessage.id, { content: data.content });
      } else {
        if (!data.to) throw new Error(t('to') + ' is required');
        await api.forwardMessage(originalMessage.id, {
          to: data.to,
          content: data.content
        });
      }
      close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return {
    isOpen,
    mode,
    originalMessage,
    sending,
    error,
    openReply,
    openForward,
    send,
    close
  };
}
