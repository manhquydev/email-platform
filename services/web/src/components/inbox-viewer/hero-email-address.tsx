/**
 * Hero Email Address Component
 * Prominent email display with one-click copy functionality
 * Version C design system - Superhuman style
 * Supports compact/comfortable density modes
 */
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useDensity } from "./density-context";

interface HeroEmailAddressProps {
  email: string;
}

export function HeroEmailAddress({ email }: HeroEmailAddressProps) {
  const [copied, setCopied] = useState(false);
  const { density } = useDensity();
  const isCompact = density === "compact";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success("Đã sao chép email!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép");
    }
  }, [email]);

  return (
    <div className={`flex items-center justify-center gap-3 px-4 bg-zinc-950 border-b border-zinc-800 ${
      isCompact ? "py-3" : "py-6"
    }`}>
      {/* Email Address - Large monospace display */}
      <span
        className={`font-mono font-medium text-white tracking-tight truncate max-w-[70%] ${
          isCompact ? "text-lg md:text-xl" : "text-2xl md:text-3xl"
        }`}
        title={email}
      >
        {email}
      </span>

      {/* Copy Button with success state */}
      <button
        onClick={handleCopy}
        className={`rounded-md border transition-all duration-100 ${
          isCompact ? "p-1.5" : "p-2.5"
        } ${
          copied
            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
        }`}
        title="Sao chép email"
        aria-label="Sao chép email"
      >
        {copied ? (
          <svg className={isCompact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className={isCompact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
