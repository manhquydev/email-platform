/**
 * OnboardingHints - Welcome wizard for new users
 * Modules extracted to onboarding-hints-modules/
 */
import {
    type OnboardingHintsProps,
    DEFAULT_STEPS,
    useOnboarding,
    RestartButton,
    ProgressBar,
    StepContent,
    StepActions,
    StepIndicator
} from "./onboarding-hints-modules";

export function OnboardingHints({
    steps = DEFAULT_STEPS,
    storageKey = "email-onboarding-complete",
    onComplete,
}: OnboardingHintsProps) {
    const {
        currentStep,
        isVisible,
        isDismissed,
        step,
        totalSteps,
        isLastStep,
        isFirstStep,
        handleNext,
        handlePrev,
        handleDismiss,
        handleRestart
    } = useOnboarding({ steps, storageKey, onComplete });

    if (!isVisible) {
        if (isDismissed) {
            return <RestartButton onClick={handleRestart} />;
        }
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 pointer-events-auto animate-fade-in" onClick={handleDismiss} />

            {/* Modal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-surface rounded-xl shadow-2xl p-6 max-w-md mx-4 pointer-events-auto animate-scale-in">
                    <ProgressBar totalSteps={totalSteps} currentStep={currentStep} />
                    <StepContent step={step} />
                    <StepActions
                        isFirstStep={isFirstStep}
                        isLastStep={isLastStep}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onDismiss={handleDismiss}
                    />
                    <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
                </div>
            </div>
        </div>
    );
}

// Re-export TooltipHint for external use
export { TooltipHint } from "./onboarding-hints-modules";
