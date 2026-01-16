import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Mail, PanelRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { analytics } from '../../shared/analytics';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'create-inbox',
    title: 'Create Your First Inbox',
    description: 'Click the button above to generate a random disposable email address. Use it for signups, trials, or anywhere you need a temporary email.',
    icon: <Mail className="w-6 h-6" />,
  },
  {
    id: 'autofill',
    title: 'Auto-fill on Any Website',
    description: 'When you\'re on a signup form, right-click any email field and select "Fill with Ephemera" to instantly insert your temporary email.',
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: 'side-panel',
    title: 'Use Side Panel for Quick Access',
    description: 'Pin the Side Panel for always-on access. Check messages while browsing without switching tabs or opening the popup.',
    icon: <PanelRight className="w-6 h-6" />,
  },
];

/**
 * Onboarding tour component shown to first-time users.
 * Guides users through key features with a 3-step tooltip tour.
 */
export default function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    analytics.track('onboarding_started');
  }, []);

  const handleNext = () => {
    analytics.track('onboarding_step_completed', { step: currentStep + 1, stepId: STEPS[currentStep].id });

    if (currentStep < STEPS.length - 1) {
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

  const handleComplete = async () => {
    analytics.track('onboarding_completed', { dontShowAgain });
    await analytics.setOnboardingStatus(true, STEPS.length);
    await analytics.markInstalled();
    onComplete();
  };

  const handleSkip = async () => {
    analytics.track('onboarding_skipped', { atStep: currentStep + 1, dontShowAgain });
    if (dontShowAgain) {
      await analytics.setOnboardingStatus(true, currentStep);
      await analytics.markInstalled();
    }
    onSkip();
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Progress indicator */}
        <div className="flex gap-1.5 p-4 pb-0">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                index <= currentStep
                  ? 'bg-primary-500'
                  : 'bg-slate-200 dark:bg-slate-700'
              )}
            />
          ))}
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 pt-4 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
            {step.icon}
          </div>

          {/* Step counter */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Step {currentStep + 1} of {STEPS.length}
          </p>

          {/* Title & Description */}
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 space-y-3">
          {/* Navigation buttons */}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 py-2.5 px-4 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                'flex-1 py-2.5 px-4 text-sm font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1',
                'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400',
                'shadow-lg shadow-primary-500/20'
              )}
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Don't show again checkbox */}
          <label className="flex items-center justify-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
            />
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
}
