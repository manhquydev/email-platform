import { useState } from 'react';
import { X, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import CustomPrefixInput from './CustomPrefixInput';
import DomainPicker from './DomainPicker';

interface CreateInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRandom: () => Promise<void>;
  onCreateCustom: (localPart: string, domainId: string) => Promise<void>;
  isCreating: boolean;
}

/**
 * Modal for creating new inboxes with random or custom prefix options.
 */
export default function CreateInboxModal({
  isOpen,
  onClose,
  onCreateRandom,
  onCreateCustom,
  isCreating,
}: CreateInboxModalProps) {
  const [mode, setMode] = useState<'random' | 'custom'>('random');
  const [customPrefix, setCustomPrefix] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedDomainName, setSelectedDomainName] = useState<string>('');

  // Validate custom prefix
  const PREFIX_REGEX = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i;
  const isValidPrefix = customPrefix.length >= 3 && PREFIX_REGEX.test(customPrefix);

  const handleCreate = async () => {
    if (mode === 'random') {
      await onCreateRandom();
    } else {
      if (!isValidPrefix || !selectedDomainId) return;
      await onCreateCustom(customPrefix, selectedDomainId);
    }
    // Reset state
    setCustomPrefix('');
    setMode('random');
  };

  const handleDomainChange = (domainId: string, domainName: string) => {
    setSelectedDomainId(domainId);
    setSelectedDomainName(domainName);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-sm mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Create New Inbox
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('random')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all',
                  mode === 'random'
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border-2 border-primary-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                )}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Random
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all',
                  mode === 'custom'
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border-2 border-primary-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>

            {/* Custom Prefix Input */}
            {mode === 'custom' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    Email Prefix
                  </label>
                  <CustomPrefixInput
                    value={customPrefix}
                    onChange={setCustomPrefix}
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    Domain
                  </label>
                  <DomainPicker
                    value={selectedDomainId}
                    onChange={handleDomainChange}
                    disabled={isCreating}
                  />
                </div>

                {/* Preview */}
                {customPrefix && isValidPrefix && selectedDomainName && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Preview
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {customPrefix}@{selectedDomainName}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Random mode info */}
            {mode === 'random' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 animate-in fade-in duration-200">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A random email address will be generated automatically.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 pt-0">
            <button
              onClick={handleCreate}
              disabled={isCreating || (mode === 'custom' && (!isValidPrefix || !selectedDomainId))}
              className={cn(
                'w-full py-3 px-4 text-sm font-bold rounded-2xl transition-all duration-300',
                'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400',
                'text-white shadow-lg shadow-primary-500/20',
                'flex items-center justify-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
                !isCreating && 'transform hover:-translate-y-0.5 active:translate-y-0'
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {mode === 'random' ? <Wand2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  Create {mode === 'random' ? 'Random' : 'Custom'} Inbox
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
