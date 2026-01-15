import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { Message } from '../../shared/types';
import { ArrowLeft, Loader2, Calendar, User, FileText } from 'lucide-react';

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

  useEffect(() => {
    fetchMessages();
  }, [inboxId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.getMessages(inboxId);
      setMessages(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
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

  if (selectedMessage) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-2 p-3 border-b border-gray-100">
          <button
            onClick={() => setSelectedMessage(null)}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-sm truncate flex-1">{selectedMessage.subject}</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span className="font-medium text-gray-700">From:</span> {selectedMessage.from}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span className="font-medium text-gray-700">Received:</span> {formatDate(selectedMessage.receivedAt)}
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            {selectedMessage.htmlBody ? (
              <div
                dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }}
                className="text-sm text-gray-800"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                {selectedMessage.textBody}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-sm text-gray-900 truncate">{email}</h2>
          <p className="text-xs text-gray-500">{messages.length} messages</p>
        </div>
        <button
          onClick={fetchMessages}
          className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary-600"
        >
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && messages.length === 0 ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-600 text-sm">{error}</div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 p-8">
          <FileText className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 bg-white">
          {messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
              className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${!msg.isRead ? 'bg-blue-50/50' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm truncate flex-1 mr-2 ${!msg.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {msg.from}
                </span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {formatDate(msg.receivedAt)}
                </span>
              </div>
              <p className={`text-xs truncate ${!msg.isRead ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                {msg.subject || '(No Subject)'}
              </p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {msg.textBody ? msg.textBody.substring(0, 60) : '...'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
