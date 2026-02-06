import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGS = [
  "INITIALIZING SYSTEM KERNEL...",
  "LOADING MODULES: [CORE, NET, GFX, AUDIO]",
  "ESTABLISHING SECURE CONNECTION...",
  "VERIFYING INTEGRITY...",
  "ACCESS GRANTED."
];

interface BootSequenceProps {
  onComplete: () => void;
}

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check session storage to skip if already booted
    const hasBooted = sessionStorage.getItem('ephemera_booted');
    if (hasBooted) {
      onComplete();
      return;
    }

    let currentIndex = 0;

    const logInterval = setInterval(() => {
      if (currentIndex >= LOGS.length) {
        clearInterval(logInterval);
        setTimeout(() => {
          sessionStorage.setItem('ephemera_booted', 'true');
          onComplete();
        }, 800);
        return;
      }

      setLogs(prev => [...prev, LOGS[currentIndex]]);
      currentIndex++;
      setProgress(prev => prev + 20);
    }, 400);

    return () => clearInterval(logInterval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-terminal-black text-neon-green font-mono cursor-wait"
    >
      <div className="w-full max-w-md p-6 border border-terminal-border bg-terminal-panel/80 rounded-sm shadow-neon-green">
        <div className="flex justify-between items-center mb-4 border-b border-terminal-border pb-2">
            <span className="text-xs uppercase tracking-widest text-phosphor-dim">BOOT_SEQUENCE.EXE</span>
            <span className="text-xs">{progress}%</span>
        </div>

        <div className="flex flex-col gap-2 h-40 overflow-hidden font-mono text-sm">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <span className="mr-2 text-neon-cyan">{">"}</span>
              {log}
            </motion.div>
          ))}
          <div className="animate-blink bg-neon-green h-4 w-2 inline-block ml-2"/>
        </div>

        <div className="mt-4 h-1 w-full bg-terminal-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-neon-green shadow-[0_0_10px_#39ff14]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};
