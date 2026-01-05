import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Play,
  Pause,
  CheckCircle,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignProgressBar } from './CampaignProgressBar';
import { 
  type Campaign, 
  getCampaignTypeConfig, 
  calculateCampaignProgress,
  formatBudget 
} from '@/types/campaign';

interface CampaignCardProps {
  campaign: Campaign;
  onView?: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  onStatusChange?: (campaign: Campaign, status: Campaign['status']) => void;
}

export function CampaignCard({ 
  campaign, 
  onView, 
  onEdit, 
  onDelete,
  onStatusChange 
}: CampaignCardProps) {
  const typeConfig = getCampaignTypeConfig(campaign.campaign_type);
  const progress = calculateCampaignProgress(campaign);
  
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  const now = new Date();
  
  const daysRemaining = differenceInDays(endDate, now);
  const totalDays = differenceInDays(endDate, startDate);
  const daysPassed = differenceInDays(now, startDate);
  const timeProgress = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;

  const getTimeLabel = () => {
    if (isPast(endDate)) return 'Đã kết thúc';
    if (isFuture(startDate)) return `Bắt đầu trong ${differenceInDays(startDate, now)} ngày`;
    if (daysRemaining <= 0) return 'Hôm nay kết thúc';
    if (daysRemaining === 1) return 'Còn 1 ngày';
    return `Còn ${daysRemaining} ngày`;
  };

  const goalsSummary = campaign.goals.slice(0, 3).map(g => ({
    label: g.label,
    progress: g.target > 0 ? Math.round((g.current / g.target) * 100) : 0
  }));

  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-300',
      'hover:shadow-lg hover:-translate-y-0.5',
      'border-border/50 hover:border-border'
    )}>
      {/* Status indicator line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1',
        campaign.status === 'active' && 'bg-green-500',
        campaign.status === 'planning' && 'bg-blue-500',
        campaign.status === 'paused' && 'bg-yellow-500',
        campaign.status === 'completed' && 'bg-purple-500',
        campaign.status === 'cancelled' && 'bg-destructive',
        campaign.status === 'draft' && 'bg-muted-foreground'
      )} />

      <CardHeader className="pb-2 sm:pb-3 pt-4 sm:pt-5 px-3 sm:px-6">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <span className="text-base sm:text-lg">{typeConfig.icon}</span>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <h3 className="font-semibold text-base sm:text-lg truncate">{campaign.name}</h3>
            {campaign.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                {campaign.description}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(campaign)}>
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(campaign)}>
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {campaign.status === 'draft' && (
                <DropdownMenuItem onClick={() => onStatusChange?.(campaign, 'active')}>
                  <Play className="mr-2 h-4 w-4 text-green-500" />
                  Bắt đầu chiến dịch
                </DropdownMenuItem>
              )}
              {campaign.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange?.(campaign, 'paused')}>
                  <Pause className="mr-2 h-4 w-4 text-yellow-500" />
                  Tạm dừng
                </DropdownMenuItem>
              )}
              {campaign.status === 'paused' && (
                <DropdownMenuItem onClick={() => onStatusChange?.(campaign, 'active')}>
                  <Play className="mr-2 h-4 w-4 text-green-500" />
                  Tiếp tục
                </DropdownMenuItem>
              )}
              {(campaign.status === 'active' || campaign.status === 'paused') && (
                <DropdownMenuItem onClick={() => onStatusChange?.(campaign, 'completed')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-purple-500" />
                  Hoàn thành
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(campaign)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {/* Date range */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>
              {format(startDate, 'dd/MM', { locale: vi })} - {format(endDate, 'dd/MM/yyyy', { locale: vi })}
            </span>
          </div>
          <span className={cn(
            'text-[10px] sm:text-xs font-medium',
            daysRemaining <= 3 && daysRemaining > 0 && 'text-yellow-500',
            daysRemaining <= 0 && !isPast(endDate) && 'text-destructive',
            isPast(endDate) && 'text-muted-foreground'
          )}>
            {getTimeLabel()}
          </span>
        </div>

        {/* KPI Progress */}
        <CampaignProgressBar progress={progress} />

        {/* Goals summary */}
        {goalsSummary.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {goalsSummary.map((goal, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className={cn(
                  'text-[10px] sm:text-xs px-1.5 sm:px-2',
                  goal.progress >= 100 && 'border-green-500/50 text-green-600',
                  goal.progress >= 50 && goal.progress < 100 && 'border-primary/50 text-primary'
                )}
              >
                <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">{goal.label}: </span>
                {goal.progress}%
              </Badge>
            ))}
          </div>
        )}

        {/* Channels & Budget */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex gap-1 flex-wrap">
            {campaign.target_channels.slice(0, 2).map(channel => (
              <Badge key={channel} variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                {channel}
              </Badge>
            ))}
            {campaign.target_channels.length > 2 && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                +{campaign.target_channels.length - 2}
              </Badge>
            )}
          </div>
          
          {campaign.budget_total && (
            <span className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">
                {formatBudget(campaign.budget_spent, campaign.budget_currency)}/
              </span>
              {formatBudget(campaign.budget_total, campaign.budget_currency)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
