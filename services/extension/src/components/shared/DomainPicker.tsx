import { useState, useEffect } from 'react';
import { ChevronDown, Globe, Loader2 } from 'lucide-react';
import { api } from '../../shared/api';
import { storage } from '../../shared/storage';
import { cn } from '../../utils/cn';

interface Domain {
  id: string;
  name: string;
  isPublic: boolean;
}

interface DomainPickerProps {
  value: string | null;
  onChange: (domainId: string, domainName: string) => void;
  disabled?: boolean;
  className?: string;
}

const DOMAIN_CACHE_KEY = 'cachedDomains';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Domain picker dropdown component.
 * Fetches available domains from API with 24h cache.
 */
export default function DomainPicker({
  value,
  onChange,
  disabled = false,
  className,
}: DomainPickerProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedDomain = domains.find((d) => d.id === value);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = await storage.get('cachedDomains' as any);
      if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setDomains(cached.domains);
        if (!value && cached.domains.length > 0) {
          onChange(cached.domains[0].id, cached.domains[0].name);
        }
        setLoading(false);
        return;
      }

      // Fetch from API
      const response = await api.getDomains();
      const fetchedDomains = response.domains || [];
      setDomains(fetchedDomains);

      // Cache the result
      await storage.set('cachedDomains' as any, {
        domains: fetchedDomains,
        timestamp: Date.now(),
      });

      // Auto-select first domain if none selected
      if (!value && fetchedDomains.length > 0) {
        onChange(fetchedDomains[0].id, fetchedDomains[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch domains:', err);
      setError('Failed to load domains');
      // Fallback: use a default domain
      const fallbackDomains = [{ id: 'default', name: 'ephemera.email', isPublic: true }];
      setDomains(fallbackDomains);
      if (!value) {
        onChange(fallbackDomains[0].id, fallbackDomains[0].name);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (domain: Domain) => {
    onChange(domain.id, domain.name);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 text-xs text-slate-400', className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading domains...
      </div>
    );
  }

  if (domains.length <= 1) {
    // Single domain, just display it
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 text-xs', className)}>
        <Globe className="w-3 h-3 text-slate-400" />
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          @{selectedDomain?.name || domains[0]?.name || 'ephemera.email'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs',
          'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm',
          'border border-slate-200 dark:border-slate-700 rounded-xl',
          'text-slate-700 dark:text-slate-200',
          'hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'border-primary-500 ring-2 ring-primary-500/20'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select email domain"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-3 h-3 text-slate-400" />
          <span className="font-medium">@{selectedDomain?.name || 'Select domain'}</span>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown menu */}
          <div
            className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
            role="listbox"
          >
            {domains.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleSelect(domain)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs text-left',
                  'hover:bg-primary-50 dark:hover:bg-primary-900/20',
                  'transition-colors duration-150',
                  domain.id === value && 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                )}
                role="option"
                aria-selected={domain.id === value}
              >
                <Globe className="w-3 h-3 text-slate-400" />
                <span className="font-medium">@{domain.name}</span>
                {domain.isPublic && (
                  <span className="ml-auto text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    Public
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
