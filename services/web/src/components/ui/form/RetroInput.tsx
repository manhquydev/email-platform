import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface RetroInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
}

export const RetroInput = forwardRef<HTMLInputElement, RetroInputProps>(
  ({ className, label, error, prefix = ">", ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-xs font-mono text-phosphor-dim uppercase tracking-widest">
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          <span className="absolute left-0 text-neon-green font-mono select-none pl-2">
            {prefix}
          </span>
          <input
            ref={ref}
            className={cn(
              "w-full bg-terminal-surface/50 border-b border-terminal-border px-8 py-2 font-mono text-phosphor-bright outline-none transition-all placeholder:text-phosphor-faint/50",
              "focus:border-neon-green focus:bg-neon-green/5 focus:shadow-[0_1px_10px_rgba(57,255,20,0.1)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-signal-error focus:border-signal-error focus:shadow-[0_1px_10px_rgba(255,0,51,0.1)]",
              className
            )}
            spellCheck={false}
            autoComplete="off"
            {...props}
          />
          {/* Simulated Blinking Cursor (only visible when focused via CSS hacks or JS state, keeping it simple for now with caret-block) */}
        </div>
        {error && (
          <p className="text-xs text-signal-error font-mono animate-pulse">
            [ERROR]: {error}
          </p>
        )}
      </div>
    );
  }
);

RetroInput.displayName = "RetroInput";
