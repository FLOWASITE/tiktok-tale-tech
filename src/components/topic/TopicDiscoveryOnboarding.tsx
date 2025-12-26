import { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Sparkles, Calendar, 
  TrendingUp, Brain, Lightbulb, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ONBOARDING_STORAGE_KEY = 'topic-discovery-onboarding-completed';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  iconGradient: string;
  tip?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Chào mừng đến Kho Ý Tưởng!',
    description: 'Đây là nơi AI gợi ý những chủ đề content phù hợp nhất với thương hiệu và mục tiêu của bạn.',
    icon: Lightbulb,
    iconGradient: 'from-amber-500 to-orange-500',
    tip: 'Chọn Brand Template để nhận gợi ý cá nhân hóa',
  },
  {
    id: 'seasonal',
    title: 'Sự kiện theo mùa',
    description: 'Xem các sự kiện sắp tới và gợi ý topic phù hợp. Lên lịch trước để không bỏ lỡ cơ hội!',
    icon: Calendar,
    iconGradient: 'from-red-500 to-pink-500',
    tip: 'Bấm "Lên lịch" để thêm vào Content Calendar',
  },
  {
    id: 'success',
    title: 'Topics thành công',
    description: 'Xem những topic đã hoạt động tốt để lấy cảm hứng cho nội dung mới.',
    icon: TrendingUp,
    iconGradient: 'from-emerald-500 to-teal-500',
    tip: 'Bấm vào Sparkles icon để tạo topic tương tự',
  },
  {
    id: 'ai',
    title: 'Gợi ý AI thông minh',
    description: 'AI phân tích brand voice, xu hướng và đối thủ để đưa ra gợi ý tối ưu với điểm số chi tiết.',
    icon: Sparkles,
    iconGradient: 'from-primary to-violet-500',
    tip: 'Điểm số cao = Topic có tiềm năng cao',
  },
  {
    id: 'smart',
    title: 'Tab Smart & AI Analysis',
    description: 'Khám phá thêm tính năng nâng cao: Kế hoạch tuần, Kiểm tra trùng lặp, Phân tích Gap, và nhiều hơn nữa!',
    icon: Brain,
    iconGradient: 'from-violet-500 to-purple-500',
    tip: 'Thử tab "Smart" để xem gợi ý thông minh hơn',
  },
];

interface TopicDiscoveryOnboardingProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function TopicDiscoveryOnboarding({ onComplete, forceShow = false }: TopicDiscoveryOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      // Small delay to let page render first
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
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

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-primary/20">
        <CardContent className="p-6 space-y-5">
          {/* Close button */}
          <div className="flex justify-between items-start">
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} / {ONBOARDING_STEPS.length}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 -mr-2 -mt-2"
              onClick={handleSkip}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className={cn(
              'p-4 rounded-2xl bg-gradient-to-br',
              step.iconGradient
            )}>
              <StepIcon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Tip */}
          {step.tip && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Lightbulb className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-primary">{step.tip}</p>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5">
            {ONBOARDING_STEPS.map((_, idx) => (
              <button
                key={idx}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  idx === currentStep 
                    ? 'w-6 bg-primary' 
                    : idx < currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-muted'
                )}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Trước
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 gap-1">
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Bắt đầu khám phá
                </>
              ) : (
                <>
                  Tiếp
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button 
              onClick={handleSkip}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Bỏ qua hướng dẫn
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to reset onboarding (for testing)
export function resetTopicOnboarding() {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
