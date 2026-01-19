/**
 * UI components for OnboardingHints
 */
import { useState } from "react";
import type { OnboardingStep, TooltipHintProps } from "./onboarding-hints-utils";
import { POSITION_CLASSES } from "./onboarding-hints-utils";

/** Floating restart button shown after dismissal */
export function RestartButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-4 right-4 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-all hover-lift animate-fade-in"
            title="Xem hướng dẫn"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}

/** Progress bar showing current step */
export function ProgressBar({ totalSteps, currentStep }: { totalSteps: number; currentStep: number }) {
    return (
        <div className="flex gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-colors ${idx <= currentStep ? 'bg-primary' : 'bg-border'}`}
                />
            ))}
        </div>
    );
}

/** Step content display */
export function StepContent({ step }: { step: OnboardingStep }) {
    return (
        <>
            <h3 className="text-lg font-bold text-text-main mb-2">{step.title}</h3>
            <p className="text-sm text-muted mb-6">{step.description}</p>
        </>
    );
}

/** Navigation actions */
interface StepActionsProps {
    isFirstStep: boolean;
    isLastStep: boolean;
    onPrev: () => void;
    onNext: () => void;
    onDismiss: () => void;
}

export function StepActions({ isFirstStep, isLastStep, onPrev, onNext, onDismiss }: StepActionsProps) {
    return (
        <div className="flex items-center justify-between">
            <button
                onClick={onDismiss}
                className="text-sm text-muted hover:text-text-main transition-colors"
            >
                Bỏ qua
            </button>

            <div className="flex gap-2">
                {!isFirstStep && (
                    <button
                        onClick={onPrev}
                        className="btn btn-secondary text-sm"
                    >
                        Trước
                    </button>
                )}
                <button
                    onClick={onNext}
                    className="btn btn-primary text-sm"
                >
                    {isLastStep ? "Hoàn thành" : "Tiếp"}
                </button>
            </div>
        </div>
    );
}

/** Step indicator (e.g., "1 / 6") */
export function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <div className="text-center mt-4 text-xs text-muted">
            {currentStep + 1} / {totalSteps}
        </div>
    );
}

/** Tooltip hint for individual elements */
export function TooltipHint({ children, text, show = true, position = "top" }: TooltipHintProps) {
    const [dismissed, setDismissed] = useState(false);

    if (!show || dismissed) return <>{children}</>;

    return (
        <div className="relative group">
            {children}
            <div className={`absolute ${POSITION_CLASSES[position]} z-40 animate-fade-in-up`}>
                <div className="bg-text-main text-surface text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-2">
                    <span>{text}</span>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-surface/70 hover:text-surface"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
