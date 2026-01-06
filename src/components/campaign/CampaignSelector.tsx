import { useMemo } from 'react';
import { differenceInDays, parseISO, isBefore, isAfter } from 'date-fns';
import { Target, Calendar, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCampaigns } from '@/hooks/useCampaigns';
import type { Campaign, CampaignStatus } from '@/types/campaign';

interface CampaignSelectorProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  showActiveOnly?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'bg-muted text-muted-foreground' },
  planning: { label: 'Lên kế hoạch', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  active: { label: 'Đang chạy', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paused: { label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Hoàn thành', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function getRemainingDays(campaign: Campaign): string | null {
  const today = new Date();
  const endDate = parseISO(campaign.end_date);
  const startDate = parseISO(campaign.start_date);
  
  if (isBefore(endDate, today)) {
    return 'Đã kết thúc';
  }
  
  if (isAfter(startDate, today)) {
    const daysUntilStart = differenceInDays(startDate, today);
    return `Còn ${daysUntilStart} ngày bắt đầu`;
  }
  
  const remaining = differenceInDays(endDate, today);
  if (remaining <= 0) return 'Hôm nay kết thúc';
  if (remaining === 1) return '1 ngày còn lại';
  return `${remaining} ngày còn lại`;
}

export function CampaignSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Chọn chiến dịch',
  showActiveOnly = false,
  className,
}: CampaignSelectorProps) {
  const { campaigns, isLoading } = useCampaigns();

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    
    if (showActiveOnly) {
      return campaigns.filter(c => 
        c.status === 'active' || c.status === 'planning'
      );
    }
    
    // Sort: active first, then planning, then by end_date
    return [...campaigns].sort((a, b) => {
      const statusOrder: Record<string, number> = {
        active: 0,
        planning: 1,
        draft: 2,
        paused: 3,
        completed: 4,
        cancelled: 5,
      };
      
      const orderA = statusOrder[a.status] ?? 10;
      const orderB = statusOrder[b.status] ?? 10;
      
      if (orderA !== orderB) return orderA - orderB;
      
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    });
  }, [campaigns, showActiveOnly]);

  const selectedCampaign = useMemo(() => {
    if (!value) return null;
    return campaigns?.find(c => c.id === value) ?? null;
  }, [campaigns, value]);

  const handleValueChange = (newValue: string) => {
    if (newValue === '_none_') {
      onValueChange(undefined);
    } else {
      onValueChange(newValue);
    }
  };

  return (
    <Select
      value={value || '_none_'}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedCampaign ? (
            <div className="flex items-center gap-2 truncate">
              <Target className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedCampaign.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none_">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">— Không thuộc chiến dịch —</span>
          </div>
        </SelectItem>
        
        {filteredCampaigns.map((campaign) => {
          const statusConfig = STATUS_CONFIG[campaign.status as CampaignStatus];
          const remainingText = getRemainingDays(campaign);
          
          return (
            <SelectItem key={campaign.id} value={campaign.id}>
              <div className="flex items-center gap-2 w-full">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{campaign.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs shrink-0 ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {remainingText && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {remainingText}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          );
        })}
        
        {filteredCampaigns.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            {isLoading ? 'Đang tải...' : 'Chưa có chiến dịch nào'}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
