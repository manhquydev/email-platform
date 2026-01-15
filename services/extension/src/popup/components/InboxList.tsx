import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { Inbox } from '../../shared/types';
import { Plus, Copy, Trash2, RefreshCw, Loader2, Mail } from 'lucide-react';

export default function InboxList() {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInboxes = async () => {
    setLoading(true);
    try {
      const response = await api.getInboxes();
      setInboxes(response.data);
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
      const newInbox = await api.createRandomInbox();
      // Add to list immediately
      setInboxes([newInbox, ...inboxes]);
      // Also copy to clipboard
      await copyToClipboard(`${newInbox.localPart}@${newInbox.domain.name}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create inbox');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Ideally show toast
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
        <h2 className="text-sm font-semibold text-gray-700">Active Inboxes</h2>
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
                  <p className="text-sm font-medium text-gray-900 truncate" title={`${inbox.localPart}@${inbox.domain.name}`}>
                    {inbox.localPart}
                    <span className="text-gray-500 font-normal">@{inbox.domain.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inbox._count?.messages || 0} messages
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyToClipboard(`${inbox.localPart}@${inbox.domain.name}`)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    title="Copy Address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                 <button
                   onClick={() => onSelectInbox(inbox.id, inbox.address)}
                   className="flex-1 text-xs py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-center transition-colors"
                 >
                   View Messages
                 </button>
                 <a
                   href={`https://manhquy.click/inbox/${inbox.id}`}
                   target="_blank"
                   rel="noreferrer"
                   className="flex-1 text-xs py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-center transition-colors"
                 >
                   Open in Web
                 </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
