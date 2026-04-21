import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CoachmarkContextValue, CoachmarkStep } from './types';
import { COACHMARK_STORAGE_KEY, COACHMARK_PROGRESS_KEY } from './dashboardSteps';

const NEVER_SHOW_KEY = 'coachmark-never-show';

const CoachmarkContext = createContext<CoachmarkContextValue | null>(null);

interface CoachmarkProviderProps {
  children: ReactNode;
  steps: CoachmarkStep[];
  storageKey?: string;
}

export function CoachmarkProvider({ 
  children, 
  steps,
  storageKey = COACHMARK_STORAGE_KEY 
}: CoachmarkProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Check for saved progress on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(COACHMARK_PROGRESS_KEY);
    if (savedProgress) {
      const step = parseInt(savedProgress, 10);
      if (!isNaN(step) && step >= 0 && step < steps.length) {
        setCurrentStep(step);
      }
    }
  }, [steps.length]);

  // Save progress when step changes
  useEffect(() => {
    if (isActive) {
      localStorage.setItem(COACHMARK_PROGRESS_KEY, currentStep.toString());
    }
  }, [currentStep, isActive]);

  const startWithWelcome = useCallback(() => {
    // Disabled — onboarding welcome modal removed per user request
    return;
  }, []);

  const start = useCallback(() => {
    setShowWelcomeModal(false);
    setCurrentStep(0);
    setIsActive(true);
    localStorage.removeItem(COACHMARK_PROGRESS_KEY);
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete the onboarding - show completion modal
      setIsActive(false);
      localStorage.setItem(storageKey, 'true');
      localStorage.removeItem(COACHMARK_PROGRESS_KEY);
      setShowCompletionModal(true);
    }
  }, [currentStep, steps.length, storageKey]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, 'true');
    localStorage.removeItem(COACHMARK_PROGRESS_KEY);
  }, [storageKey]);

  const skipWelcome = useCallback((neverShow: boolean) => {
    setShowWelcomeModal(false);
    if (neverShow) {
      localStorage.setItem(NEVER_SHOW_KEY, 'true');
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  const complete = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, 'true');
    localStorage.removeItem(COACHMARK_PROGRESS_KEY);
    setShowCompletionModal(true);
  }, [storageKey]);

  const closeCompletionModal = useCallback(() => {
    setShowCompletionModal(false);
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index);
    }
  }, [steps.length]);

  return (
    <CoachmarkContext.Provider value={{
      isActive,
      currentStep,
      steps,
      showWelcomeModal,
      showCompletionModal,
      start,
      startWithWelcome,
      next,
      prev,
      skip,
      skipWelcome,
      complete,
      closeCompletionModal,
      goToStep,
    }}>
      {children}
    </CoachmarkContext.Provider>
  );
}

export function useCoachmark() {
  const context = useContext(CoachmarkContext);
  if (!context) {
    throw new Error('useCoachmark must be used within a CoachmarkProvider');
  }
  return context;
}
