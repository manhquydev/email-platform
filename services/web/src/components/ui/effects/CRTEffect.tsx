import React from 'react';
import { cn } from '@/lib/utils';

interface CRTEffectProps {
  intensity?: 'low' | 'medium' | 'high';
  enabled?: boolean;
}

export const CRTEffect: React.FC<CRTEffectProps> = ({
  intensity = 'medium',
  enabled = true
}) => {
  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Scanlines */}
      <div className="absolute inset-0 w-full h-full crt-overlay opacity-20" />

      {/* Vignette */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle,rgba(0,0,0,0)_60%,rgba(0,0,0,0.6)_100%)]" />

      {/* Scanline Scroll (The "Hum" Bar) */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scan h-[20%] opacity-10" />

      {/* Screen Flicker */}
      <div className="absolute inset-0 w-full h-full bg-white opacity-[0.02] animate-flicker pointer-events-none mix-blend-overlay" />
    </div>
  );
};
