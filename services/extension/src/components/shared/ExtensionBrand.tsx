import browser from 'webextension-polyfill';
import { t } from '../../shared/i18n';
import { cn } from '../../utils/cn';

interface ExtensionBrandProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showName?: boolean;
}

/**
 * Shared extension brand renderer with real packaged logo asset.
 */
export default function ExtensionBrand({
  className,
  iconClassName,
  textClassName,
  showName = true,
}: ExtensionBrandProps) {
  const logoUrl = browser.runtime.getURL('icons/icon32.png');
  const name = t('extName').split(' - ')[0];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={logoUrl}
        alt={name}
        className={cn(
          'w-8 h-8 rounded-xl ring-1 ring-white/50 dark:ring-slate-700/50 shadow-md shadow-primary-500/20',
          iconClassName
        )}
      />
      {showName && (
        <span className={cn('font-bold text-slate-800 dark:text-slate-100 tracking-tight', textClassName)}>
          {name}
        </span>
      )}
    </div>
  );
}
