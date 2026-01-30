import { cn } from '../../utils/cn';

interface CountdownRingProps {
  expiresAt: string;
  size?: number;
  strokeWidth?: number;
}

export default function CountdownRing({ expiresAt, size = 24, strokeWidth = 3 }: CountdownRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiry = new Date(expiresAt).getTime();
  const totalDuration = 24 * 60 * 60 * 1000; // 24h baseline
  const timeLeft = Math.max(0, expiry - now);

  // Calculate progress
  const progress = Math.min(1, timeLeft / totalDuration);
  const offset = circumference - progress * circumference;

  // Determine color state
  const minutesLeft = timeLeft / 60000;
  let colorClass = "text-primary-500";
  if (minutesLeft < 5) colorClass = "text-red-500 animate-pulse-urgent";
  else if (minutesLeft < 10) colorClass = "text-amber-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          className="text-slate-200 dark:text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress ring */}
        <circle
          className={cn("transition-all duration-1000 ease-linear", colorClass)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {minutesLeft < 60 && (
        <span className={cn("absolute text-[8px] font-bold", colorClass)}>
          {Math.ceil(minutesLeft)}m
        </span>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
