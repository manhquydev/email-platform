/**
 * Custom hooks for OnboardingHints
 */
import { useState, useEffect } from "react";
import type { OnboardingStep } from "./onboarding-hints-utils";

interface UseOnboardingOptions {
    steps: OnboardingStep[];
    storageKey: string;
    onComplete?: () => void;
}

/** Hook to manage onboarding wizard state and navigation */
export function useOnboarding({ steps, storageKey, onComplete }: UseOnboardingOptions) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(storageKey);
        if (!completed) {
            setIsVisible(true);
        }
    }, [storageKey]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(storageKey, "true");
        setIsVisible(false);
        onComplete?.();
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsVisible(false);
    };

    const handleRestart = () => {
        setCurrentStep(0);
        setIsDismissed(false);
        setIsVisible(true);
    };

    return {
        currentStep,
        isVisible,
        isDismissed,
        step: steps[currentStep],
        totalSteps: steps.length,
        isLastStep: currentStep === steps.length - 1,
        isFirstStep: currentStep === 0,
        handleNext,
        handlePrev,
        handleDismiss,
        handleRestart
    };
}
