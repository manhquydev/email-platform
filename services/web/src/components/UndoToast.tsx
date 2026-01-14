/**
 * UndoToast - Toast with countdown and undo button
 * Used for destructive actions like delete
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../utils/cn';

interface UndoToastProps {
    message: string;
    duration?: number; // in milliseconds
    onUndo: () => void;
    onComplete: () => void;
    isVisible: boolean;
}

export function UndoToast({
    message,
    duration = 5000,
    onUndo,
    onComplete,
    isVisible,
}: UndoToastProps) {
    const [progress, setProgress] = useState(100);
    const [isPaused, setIsPaused] = useState(false);
    const startTime = useRef<number>(0);
    const remainingTime = useRef<number>(duration);
    const animationFrame = useRef<number>(0);

    const animate = useCallback(() => {
        if (isPaused) return;

        const elapsed = Date.now() - startTime.current;
        const remaining = Math.max(0, remainingTime.current - elapsed);
        const newProgress = (remaining / duration) * 100;

        setProgress(newProgress);

        if (remaining > 0) {
            animationFrame.current = requestAnimationFrame(animate);
        } else {
            onComplete();
        }
    }, [duration, isPaused, onComplete]);

    useEffect(() => {
        if (!isVisible) {
            setProgress(100);
            remainingTime.current = duration;
            return;
        }

        startTime.current = Date.now();
        animationFrame.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, [isVisible, animate, duration]);

    const handlePause = useCallback(() => {
        setIsPaused(true);
        remainingTime.current = (progress / 100) * duration;
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
    }, [progress, duration]);

    const handleResume = useCallback(() => {
        setIsPaused(false);
        startTime.current = Date.now();
        animationFrame.current = requestAnimationFrame(animate);
    }, [animate]);

    const handleUndo = useCallback(() => {
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
        onUndo();
    }, [onUndo]);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
                'animate-slide-up'
            )}
            onMouseEnter={handlePause}
            onMouseLeave={handleResume}
        >
            <div className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-xl',
                'bg-bg-secondary border border-white/10 shadow-2xl',
                'min-w-[300px] max-w-[400px]'
            )}>
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-main truncate">{message}</p>
                    <p className="text-xs text-text-secondary">
                        {isPaused ? 'Tạm dừng' : `Hoàn tác trong ${Math.ceil((progress / 100) * (duration / 1000))}s`}
                    </p>
                </div>

                {/* Undo Button */}
                <button
                    onClick={handleUndo}
                    className={cn(
                        'flex-shrink-0 px-3 py-1.5 rounded-lg',
                        'bg-primary/10 text-primary hover:bg-primary/20',
                        'text-sm font-medium transition-colors'
                    )}
                >
                    Hoàn tác
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-none"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

// Hook for managing undo toast state
interface UndoAction {
    id: string;
    message: string;
    undoFn: () => void;
    completeFn: () => void;
}

export function useUndoToast() {
    const [currentAction, setCurrentAction] = useState<UndoAction | null>(null);

    const showUndo = useCallback((action: Omit<UndoAction, 'id'>) => {
        setCurrentAction({
            ...action,
            id: Date.now().toString(),
        });
    }, []);

    const handleUndo = useCallback(() => {
        if (currentAction) {
            currentAction.undoFn();
            setCurrentAction(null);
        }
    }, [currentAction]);

    const handleComplete = useCallback(() => {
        if (currentAction) {
            currentAction.completeFn();
            setCurrentAction(null);
        }
    }, [currentAction]);

    const dismiss = useCallback(() => {
        setCurrentAction(null);
    }, []);

    return {
        currentAction,
        showUndo,
        handleUndo,
        handleComplete,
        dismiss,
        isVisible: !!currentAction,
    };
}

export default UndoToast;
