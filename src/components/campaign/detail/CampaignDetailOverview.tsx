import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Campaign, 
  CampaignMilestone, 
  CampaignContent,
  getKPIMetricConfig,
  formatMetricValue,
  getMilestoneStatusConfig
} from '@/types/campaign';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Target, Flag, FileText, Calendar } from 'lucide-react';
import { CampaignChannelStatus } from './CampaignChannelStatus';
import { useCampaignChannelIntegration } from '@/hooks/useCampaignChannelIntegration';
import { useContentDetails } from '@/hooks/useContentDetails';

interface CampaignDetailOverviewProps {
  campaign: Campaign;
  milestones: CampaignMilestone[];
  contents: CampaignContent[];
}

export function CampaignDetailOverview({ campaign, milestones, contents }: CampaignDetailOverviewProps) {
  // Fetch content details to get selected_channels
  const { data: contentDetailsMap } = useContentDetails(contents);
  
  // Build content channels map for integration hook
  const contentChannelsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (contentDetailsMap) {
      contentDetailsMap.forEach((detail, id) => {
        if (detail.selected_channels) {
          map.set(id, detail.selected_channels);
        }
      });
    }
    return map;
  }, [contentDetailsMap]);
  
  // Get channel integration data
  const { channelStatuses, isLoading: isLoadingChannels } = useCampaignChannelIntegration({
    campaign,
    contents,
    contentChannelsMap,
  });

  const upcomingMilestones = milestones
    .filter(m => m.status !== 'completed')
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Channel Status - NEW */}
      <CampaignChannelStatus
        channelStatuses={channelStatuses}
        brandTemplateId={campaign.brand_template_id}
        isLoading={isLoadingChannels}
      />
      {/* KPI Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Mục tiêu KPI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.goals.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Chưa có mục tiêu KPI
            </p>
          ) : (
            campaign.goals.map((goal) => {
              const config = getKPIMetricConfig(goal.metric);
              const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
              const isCompleted = goal.current >= goal.target;
              
              return (
                <div key={goal.metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config?.icon}</span>
                      <span className="font-medium text-sm">{goal.label}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-semibold",
                        isCompleted && "text-green-600"
                      )}>
                        {formatMetricValue(goal.current, goal.unit)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {' / '}{formatMetricValue(goal.target, goal.unit)}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={progress} 
                    className={cn("h-2", isCompleted && "[&>div]:bg-green-500")}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flag className="h-5 w-5 text-primary" />
            Milestones sắp tới
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingMilestones.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Tất cả milestones đã hoàn thành
            </p>
          ) : (
            upcomingMilestones.map((milestone) => {
              const statusConfig = getMilestoneStatusConfig(milestone.status);
              const isOverdue = new Date(milestone.due_date) < new Date() && milestone.status !== 'completed';
              
              return (
                <div 
                  key={milestone.id} 
                  className={cn(
                    "p-3 rounded-lg border",
                    isOverdue && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{milestone.title}</p>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(statusConfig.bgColor, statusConfig.color, 'border-0 text-xs')}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: vi })}
                    {isOverdue && (
                      <span className="text-destructive ml-2">• Trễ hạn</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Content Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Nội dung liên kết
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Chưa có nội dung nào được liên kết
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">
                    {contents.filter(c => c.content_type === 'multichannel').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Multichannel</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">
                    {contents.filter(c => c.content_type === 'script').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Scripts</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">
                    {contents.filter(c => c.content_type === 'carousel').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Carousels</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Tổng cộng {contents.length} nội dung
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            Thông tin chiến dịch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaign.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Mô tả</p>
              <p className="text-sm">{campaign.description}</p>
            </div>
          )}
          
          {campaign.tags && campaign.tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {campaign.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Kênh phân phối</p>
            <div className="flex flex-wrap gap-1">
              {campaign.target_channels.map(ch => (
                <Badge key={ch} variant="secondary" className="text-xs">
                  {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>Tạo lúc: {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
            <p>Cập nhật: {format(new Date(campaign.updated_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
