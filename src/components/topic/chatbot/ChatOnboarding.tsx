// ============================================
// ChatOnboarding Component
// Onboarding overlay for new users
// ============================================

import { Bot, Search as SearchIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatOnboardingProps {
  show: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onDismiss: () => void;
}

export function ChatOnboarding({
  show,
  step,
  onStepChange,
  onDismiss,
}: ChatOnboardingProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl p-4 max-w-xs space-y-3 shadow-xl animate-in zoom-in-95 fade-in-0 duration-300">
        {step === 0 && (
          <>
            <div className="flex items-center gap-2 text-primary">
              <Bot className="w-5 h-5" />
              <h4 className="font-semibold">Chào mừng đến Flowa Mind!</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Tôi là AI trợ lý giúp bạn tìm ý tưởng content. Hãy mô tả sản phẩm hoặc chủ đề bạn muốn tạo content!
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={onDismiss}>Bỏ qua</Button>
              <Button size="sm" onClick={() => onStepChange(1)}>Tiếp theo</Button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 text-primary">
              <SearchIcon className="w-5 h-5" />
              <h4 className="font-semibold">Tìm kiếm & Tính năng</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Dùng nút 🔍 để tìm trong lịch sử chat. Kéo xuống ở đầu chat để làm mới (trên mobile).
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => onStepChange(0)}>Quay lại</Button>
              <Button size="sm" onClick={() => onStepChange(2)}>Tiếp theo</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <h4 className="font-semibold">Topic thành Content</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Khi AI gợi ý topic, bạn có thể nhấn để tạo ngay Multichannel, Script hoặc Carousel!
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={onDismiss}>Bắt đầu!</Button>
            </div>
          </>
        )}
        {/* Step indicators */}
        <div className="flex justify-center gap-1 pt-1">
          {[0, 1, 2].map(s => (
            <div 
              key={s} 
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                step === s ? 'bg-primary' : 'bg-muted'
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
