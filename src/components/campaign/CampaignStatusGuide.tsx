import { cn } from '@/lib/utils';
import { Check, Circle, Clock, Pause, CheckCircle2 } from 'lucide-react';
import { Campaign, CampaignStatus, getCampaignStatusConfig } from '@/types/campaign';

interface CampaignStatusGuideProps {
  campaign: Campaign;
}

const STATUS_FLOW: { status: CampaignStatus; label: string; icon: React.ReactNode; hint: string }[] = [
  { 
    status: 'draft', 
    label: 'Bản nháp', 
    icon: <Circle className="h-4 w-4" />,
    hint: 'Đang lên kế hoạch, chưa chạy'
  },
  { 
    status: 'active', 
    label: 'Đang chạy', 
    icon: <Clock className="h-4 w-4" />,
    hint: 'Chiến dịch đang hoạt động'
  },
  { 
    status: 'completed', 
    label: 'Hoàn thành', 
    icon: <CheckCircle2 className="h-4 w-4" />,
    hint: 'Chiến dịch đã kết thúc'
  },
];

function getStatusIndex(status: CampaignStatus): number {
  if (status === 'draft') return 0;
  if (status === 'active') return 1;
  if (status === 'paused') return 1; // Paused is same level as active
  if (status === 'completed') return 2;
  return 0;
}

function getNextStepHint(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return '👉 Bước tiếp: Kích hoạt chiến dịch để bắt đầu chạy';
    case 'active':
      return '✨ Chiến dịch đang chạy! Theo dõi KPI và milestone';
    case 'paused':
      return '⏸️ Đang tạm dừng. Nhấn "Kích hoạt" để tiếp tục';
    case 'completed':
      return '🎉 Đã hoàn thành! Xem báo cáo trong tab Phân tích';
    default:
      return '';
  }
}

export function CampaignStatusGuide({ campaign }: CampaignStatusGuideProps) {
  const currentIndex = getStatusIndex(campaign.status);
  const statusConfig = getCampaignStatusConfig(campaign.status);
  const isPaused = campaign.status === 'paused';

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">📍 Trạng thái:</span>
          <span className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-full",
            statusConfig.bgColor, 
            statusConfig.color
          )}>
            {statusConfig.label}
          </span>
          {isPaused && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Pause className="h-3 w-3" />
              Tạm dừng
            </span>
          )}
        </div>
      </div>

      {/* Progress Flow */}
      <div className="flex items-center gap-2 mb-3">
        {STATUS_FLOW.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.status} className="flex items-center flex-1">
              {/* Step */}
              <div className="flex flex-col items-center flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && !isPaused && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                  isCurrent && isPaused && "bg-yellow-500 text-white ring-2 ring-yellow-500/20",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : step.icon}
                </div>
                <span className={cn(
                  "text-xs mt-1 text-center",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              
              {/* Connector */}
              {index < STATUS_FLOW.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-2",
                  index < currentIndex ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Next Step Hint */}
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        {getNextStepHint(campaign.status)}
      </p>
    </div>
  );
}
