import { useState, useEffect } from 'react';

interface CountdownTimerProps {
    expiresAt: string | Date;
}

export function CountdownTimer({ expiresAt }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [colorClass, setColorClass] = useState<string>('text-muted');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('Đã hết hạn');
                setColorClass('text-danger');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Color coding based on time remaining
            if (hours < 1 && minutes < 10) {
                setColorClass('text-danger font-semibold animate-pulse');
            } else if (hours < 1) {
                setColorClass('text-yellow-500 font-medium');
            } else {
                setColorClass('text-green-600');
            }

            // Format time string
            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${seconds}s`);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    return (
        <div className="flex items-center gap-1">
            <svg className={`w-3 h-3 ${colorClass}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`text-[10px] ${colorClass}`}>{timeLeft}</span>
        </div>
    );
}
