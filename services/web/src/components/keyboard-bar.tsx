/**
 * KeyboardBar - Fixed bottom bar showing keyboard shortcuts hints
 * Hidden on mobile, visible on desktop
 */
import { cn } from '../utils/cn';

interface ShortcutItem {
  keys: string[];
  action: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: ['⌘', 'K'], action: 'Tìm kiếm' },
  { keys: ['J'], action: 'Tiếp' },
  { keys: ['K'], action: 'Trước' },
  { keys: ['E'], action: 'Lưu trữ' },
  { keys: ['#'], action: 'Xóa' },
  { keys: ['?'], action: 'Trợ giúp' },
];

interface KeyboardBarProps {
  className?: string;
}

export function KeyboardBar({ className }: KeyboardBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 h-9 bg-nebula-surface/95 backdrop-blur-sm border-t border-nebula-border",
        "hidden md:flex items-center justify-center gap-6 z-30",
        className
      )}
    >
      {shortcuts.map((shortcut, idx) => (
        <div key={idx} className="flex items-center gap-1.5 text-xs text-nebula-text-muted">
          <div className="flex items-center gap-0.5">
            {shortcut.keys.map((key, keyIdx) => (
              <kbd
                key={keyIdx}
                className="min-w-[20px] h-5 px-1.5 rounded bg-nebula-elevated border border-nebula-border text-nebula-text font-mono text-[10px] flex items-center justify-center"
              >
                {key}
              </kbd>
            ))}
          </div>
          <span>{shortcut.action}</span>
        </div>
      ))}
    </div>
  );
}
