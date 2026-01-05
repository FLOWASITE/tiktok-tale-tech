import { LucideIcon } from 'lucide-react';

export interface CoachmarkStep {
  id: string;
  target: string; // CSS selector e.g. [data-coachmark="stats"]
  title: string;
  description: string;
  icon: LucideIcon;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  action?: {
    label: string;
    href?: string;
  };
}

export interface CoachmarkContextValue {
  isActive: boolean;
  currentStep: number;
  steps: CoachmarkStep[];
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
  goToStep: (index: number) => void;
}
