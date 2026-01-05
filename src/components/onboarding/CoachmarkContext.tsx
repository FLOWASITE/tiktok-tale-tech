import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CoachmarkContextValue, CoachmarkStep } from './types';
import { COACHMARK_STORAGE_KEY, COACHMARK_PROGRESS_KEY } from './dashboardSteps';

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

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    localStorage.removeItem(COACHMARK_PROGRESS_KEY);
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete the onboarding
      setIsActive(false);
      localStorage.setItem(storageKey, 'true');
      localStorage.removeItem(COACHMARK_PROGRESS_KEY);
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

  const complete = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, 'true');
    localStorage.removeItem(COACHMARK_PROGRESS_KEY);
  }, [storageKey]);

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
      start,
      next,
      prev,
      skip,
      complete,
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
