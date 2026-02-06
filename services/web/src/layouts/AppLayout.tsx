import React from 'react';
import { Outlet } from 'react-router-dom';
import { RetroGridBackground } from '@/components/background/RetroGrid';
import { GlobalCommandPalette } from '@/components/nav/GlobalCommandPalette';
import { BreadcrumbNav } from '@/components/nav/Breadcrumbs';
import { CRTEffect } from '@/components/ui/effects/CRTEffect';
import { TerminalFrame } from '@/components/ui/layout/TerminalFrame';

export const AppLayout: React.FC = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-terminal-black text-phosphor-dim font-body">
      {/* 1. Background Layers */}
      <RetroGridBackground />
      <CRTEffect intensity="medium" />

      {/* 2. Main Content Container */}
      <div className="relative z-10 flex flex-col h-full p-4 md:p-6 gap-4">

        {/* Top Bar: Breadcrumbs & Status */}
        <header className="flex items-center justify-between px-2 shrink-0 h-12">
            <div className="flex items-center gap-4">
                <BreadcrumbNav />
            </div>

            {/* System Status Indicators */}
            <div className="flex items-center gap-3 text-xs font-mono text-phosphor-faint">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-signal-success animate-pulse"></div>
                    <span>ONLINE</span>
                </div>
                <span>MEM: 64K</span>
                <span className="hidden md:inline">V.2.0.4</span>
            </div>
        </header>

        {/* Main Workspace (Terminal Window) */}
        <main className="flex-1 min-h-0">
            <TerminalFrame title="MAIN_PROCESS" glow={true} className="w-full h-full">
                <Outlet />
            </TerminalFrame>
        </main>

        {/* Footer / Hint Bar */}
        <footer className="shrink-0 h-6 flex items-center justify-between text-[10px] font-mono text-phosphor-faint px-2">
            <div>
                PRESS <span className="text-phosphor-dim border border-phosphor-faint px-1 rounded mx-1">⌘ K</span> FOR COMMANDS
            </div>
            <div>
                SECURE CONNECTION ESTABLISHED
            </div>
        </footer>
      </div>

      {/* 3. Global Overlays */}
      <GlobalCommandPalette />
    </div>
  );
};
