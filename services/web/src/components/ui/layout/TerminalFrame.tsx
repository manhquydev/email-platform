import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utils file, or I'll create one

interface TerminalFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  status?: 'active' | 'offline' | 'processing';
  glow?: boolean;
}

export const TerminalFrame: React.FC<TerminalFrameProps> = ({
  children,
  className,
  title = 'TERMINAL',
  status = 'active',
  glow = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-full bg-terminal-black/90 border rounded-sm overflow-hidden transition-all duration-300",
        // Glow effect
        glow ? "border-neon-green/30 shadow-[0_0_10px_rgba(57,255,20,0.1)] hover:border-neon-green/50 hover:shadow-[0_0_15px_rgba(57,255,20,0.2)]" : "border-terminal-border",
        className
      )}
      {...props}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-terminal-panel border-b border-terminal-border">
        <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full",
                status === 'active' ? "bg-signal-success shadow-[0_0_5px_#00ff9d]" :
                status === 'processing' ? "bg-signal-warning animate-pulse" :
                "bg-signal-error"
            )} />
            <span className="font-display text-sm tracking-widest text-phosphor-dim uppercase">{title}</span>
        </div>
        <div className="flex gap-2">
            <span className="w-3 h-3 border border-terminal-border opacity-50"></span>
            <span className="w-3 h-3 border border-terminal-border opacity-50"></span>
            <span className="w-3 h-3 bg-terminal-border opacity-50"></span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative p-4 retro-scrollbar">
        {/* Optional grid background for inside window */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(57,255,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.5)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="relative z-10">
            {children}
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neon-green/50 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-neon-green/50 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-neon-green/50 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neon-green/50 pointer-events-none"></div>
    </div>
  );
};
