/**
 * Hook for managing undo toast state
 */

import { useState, useCallback } from 'react';

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

export default useUndoToast;
