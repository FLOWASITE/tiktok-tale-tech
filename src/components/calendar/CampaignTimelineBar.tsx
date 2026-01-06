import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Target, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCampaigns } from '@/hooks/useCampaigns';
import type { Campaign, CampaignStatus } from '@/types/campaign';
import { formatBudget } from '@/types/campaign';

interface CampaignTimelineBarProps {
  currentDate: Date;
  viewMode: 'month' | 'week' | 'day';
}

const STATUS_COLORS: Record<CampaignStatus, { bg: string; border: string; text: string }> = {
  draft: { bg: 'bg-muted/50', border: 'border-muted-foreground/30', text: 'text-muted-foreground' },
  planning: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-700 dark:text-blue-400' },
  active: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-700 dark:text-green-400' },
  paused: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-700 dark:text-yellow-400' },
  completed: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-700 dark:text-purple-400' },
  cancelled: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-700 dark:text-red-400' },
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Nháp',
  planning: 'Lên kế hoạch',
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function getRemainingDays(campaign: Campaign): string {
  const today = new Date();
  const endDate = parseISO(campaign.end_date);
  const startDate = parseISO(campaign.start_date);
  
  if (endDate < today) {
    return 'Đã kết thúc';
  }
  
  if (startDate > today) {
    const daysUntilStart = differenceInDays(startDate, today);
    return `Còn ${daysUntilStart} ngày bắt đầu`;
  }
  
  const remaining = differenceInDays(endDate, today);
  if (remaining <= 0) return 'Hôm nay kết thúc';
  if (remaining === 1) return '1 ngày còn lại';
  return `${remaining} ngày còn lại`;
}

export function CampaignTimelineBar({ currentDate, viewMode }: CampaignTimelineBarProps) {
  const navigate = useNavigate();
  const { campaigns, isLoading } = useCampaigns();

  // Get visible campaigns for current view
  const visibleCampaigns = useMemo(() => {
    if (!campaigns) return [];

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    return campaigns.filter(campaign => {
      // Only show active, planning, paused campaigns
      if (!['active', 'planning', 'paused'].includes(campaign.status)) return false;

      const campaignStart = parseISO(campaign.start_date);
      const campaignEnd = parseISO(campaign.end_date);

      // Check if campaign overlaps with current month view
      return (
        isWithinInterval(campaignStart, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(campaignEnd, { start: monthStart, end: monthEnd }) ||
        (campaignStart <= monthStart && campaignEnd >= monthEnd)
      );
    }).slice(0, 5); // Limit to 5 campaigns
  }, [campaigns, currentDate]);

  if (isLoading || visibleCampaigns.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Chiến dịch đang diễn ra</span>
          <Badge variant="secondary" className="text-xs">
            {visibleCampaigns.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {visibleCampaigns.map((campaign) => {
            const colors = STATUS_COLORS[campaign.status as CampaignStatus];
            const remainingText = getRemainingDays(campaign);

            return (
              <Tooltip key={campaign.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-auto py-2 px-3 ${colors.bg} border ${colors.border} hover:opacity-80`}
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        campaign.status === 'active' ? 'bg-green-500 animate-pulse' :
                        campaign.status === 'planning' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`} />
                      
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${colors.text}`}>
                          {campaign.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(campaign.start_date), 'dd/MM', { locale: vi })} - {format(parseISO(campaign.end_date), 'dd/MM', { locale: vi })} • {remainingText}
                        </p>
                      </div>
                      
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${colors.text}`}>
                        {STATUS_LABELS[campaign.status as CampaignStatus]}
                      </Badge>
                      
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{campaign.name}</p>
                    {campaign.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
                    )}
                    <div className="flex gap-3 text-xs">
                      <span>
                        <span className="text-muted-foreground">Ngân sách:</span>{' '}
                        {formatBudget(campaign.budget_total, campaign.budget_currency || 'VND')}
                      </span>
                      {campaign.budget_spent && (
                        <span>
                          <span className="text-muted-foreground">Đã chi:</span>{' '}
                          {formatBudget(campaign.budget_spent, campaign.budget_currency || 'VND')}
                        </span>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
