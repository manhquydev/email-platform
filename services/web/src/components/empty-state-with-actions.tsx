/**
 * EmptyStateWithActions - Reusable empty state with illustrations and quick actions
 * Variants: no-inbox, empty-inbox, no-results, sent-empty
 */
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { useReducedMotion } from '../hooks/use-reduced-motion';

export type EmptyStateVariant = 'no-inbox' | 'empty-inbox' | 'no-results' | 'sent-empty';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

interface EmptyStateWithActionsProps {
  variant: EmptyStateVariant;
  actions?: EmptyStateAction[];
  onAction?: (action: string) => void;
  className?: string;
}

// Inline SVG illustrations - minimal style, theme-aware
function NoInboxIllustration() {
  return (
    <svg className="w-24 h-24 text-nebula-violet/60" viewBox="0 0 96 96" fill="none">
      <rect x="16" y="24" width="64" height="48" rx="6" stroke="currentColor" strokeWidth="2" className="opacity-50" />
      <path d="M16 36L48 56L80 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="44" r="8" stroke="currentColor" strokeWidth="2" className="opacity-30" />
      <path d="M44 44L47 47L52 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
    </svg>
  );
}

function EmptyInboxIllustration() {
  return (
    <svg className="w-24 h-24 text-nebula-violet/60" viewBox="0 0 96 96" fill="none">
      <rect x="20" y="28" width="56" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M20 40L48 54L76 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="76" r="4" fill="currentColor" className="opacity-30" />
      <path d="M40 80H56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
    </svg>
  );
}

function NoResultsIllustration() {
  return (
    <svg className="w-24 h-24 text-nebula-violet/60" viewBox="0 0 96 96" fill="none">
      <circle cx="40" cy="40" r="20" stroke="currentColor" strokeWidth="2" />
      <path d="M54 54L72 72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M34 36L46 48M46 36L34 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50" />
    </svg>
  );
}

function SentEmptyIllustration() {
  return (
    <svg className="w-24 h-24 text-nebula-violet/60" viewBox="0 0 96 96" fill="none">
      <path d="M20 48L44 36V60L20 48Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 48H76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" className="opacity-50" />
      <circle cx="76" cy="48" r="4" stroke="currentColor" strokeWidth="2" className="opacity-30" />
    </svg>
  );
}

const VARIANT_CONFIG: Record<EmptyStateVariant, {
  illustration: React.FC;
  title: string;
  description: string;
  defaultActions: { label: string; action: string; variant: 'primary' | 'secondary' }[];
}> = {
  'no-inbox': {
    illustration: NoInboxIllustration,
    title: 'Chọn hộp thư',
    description: 'Chọn một hộp thư từ danh sách để xem email',
    defaultActions: [
      { label: 'Tạo hộp thư mới', action: 'create-inbox', variant: 'primary' },
    ],
  },
  'empty-inbox': {
    illustration: EmptyInboxIllustration,
    title: 'Hộp thư trống',
    description: 'Chưa có email nào trong hộp thư này',
    defaultActions: [
      { label: 'Chia sẻ địa chỉ', action: 'share-address', variant: 'secondary' },
    ],
  },
  'no-results': {
    illustration: NoResultsIllustration,
    title: 'Không tìm thấy',
    description: 'Không có kết quả phù hợp với tìm kiếm của bạn',
    defaultActions: [
      { label: 'Xóa tìm kiếm', action: 'clear-search', variant: 'secondary' },
    ],
  },
  'sent-empty': {
    illustration: SentEmptyIllustration,
    title: 'Chưa gửi thư nào',
    description: 'Bạn chưa gửi email nào từ hệ thống',
    defaultActions: [
      { label: 'Soạn thư', action: 'compose', variant: 'primary' },
    ],
  },
};

export function EmptyStateWithActions({
  variant,
  actions,
  onAction,
  className = '',
}: EmptyStateWithActionsProps) {
  const reducedMotion = useReducedMotion();
  const config = VARIANT_CONFIG[variant];
  const Illustration = config.illustration;

  const displayActions = actions || config.defaultActions.map(a => ({
    label: a.label,
    variant: a.variant,
    onClick: () => onAction?.(a.action),
  }));

  return (
    <motion.div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={reducedMotion ? {} : { scale: 0.9 }}
        animate={reducedMotion ? {} : { scale: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        <Illustration />
      </motion.div>

      <h3 className="mt-4 text-lg font-medium text-nebula-text">
        {config.title}
      </h3>

      <p className="mt-1 text-sm text-nebula-text-muted max-w-[240px]">
        {config.description}
      </p>

      {displayActions.length > 0 && (
        <div className="mt-4 flex gap-2">
          {displayActions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      <p className="mt-6 text-xs text-nebula-text-muted/50">
        Nhấn <kbd className="px-1.5 py-0.5 bg-nebula-elevated rounded text-xs">?</kbd> để xem phím tắt
      </p>
    </motion.div>
  );
}
