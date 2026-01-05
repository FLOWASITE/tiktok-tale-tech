import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  DollarSign, 
  Target, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  Campaign, 
  CampaignMilestone,
  getCampaignTypeConfig, 
  getCampaignStatusConfig,
  calculateCampaignProgress,
  getCampaignDaysRemaining,
  formatBudget
} from '@/types/campaign';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CampaignDetailHeroProps {
  campaign: Campaign;
  milestones: CampaignMilestone[];
}

export function CampaignDetailHero({ campaign, milestones }: CampaignDetailHeroProps) {
  const typeConfig = getCampaignTypeConfig(campaign.campaign_type);
  const statusConfig = getCampaignStatusConfig(campaign.status);
  const progress = calculateCampaignProgress(campaign);
  const daysRemaining = getCampaignDaysRemaining(campaign.end_date);
  
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const overdueMilestones = milestones.filter(m => 
    m.status !== 'completed' && new Date(m.due_date) < new Date()
  ).length;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Campaign Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-3xl">
                {typeConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn(statusConfig.bgColor, statusConfig.color, 'border-0')}>
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="outline">{typeConfig.label}</Badge>
                </div>
                {campaign.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {campaign.description}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Duration */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(campaign.start_date), 'dd/MM/yyyy', { locale: vi })} 
                  {' - '}
                  {format(new Date(campaign.end_date), 'dd/MM/yyyy', { locale: vi })}
                </span>
              </div>
              {daysRemaining > 0 ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Còn {daysRemaining} ngày</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Đã kết thúc
                </Badge>
              )}
            </div>

            {/* Channels */}
            {campaign.target_channels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {campaign.target_channels.map(ch => (
                  <Badge key={ch} variant="secondary" className="text-xs">
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Right: Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:w-auto">
            {/* KPI Progress */}
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">KPI Progress</span>
              </div>
              <p className="text-2xl font-bold">{progress}%</p>
              <Progress value={progress} className="h-1 mt-2" />
            </div>

            {/* Budget */}
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Ngân sách</span>
              </div>
              <p className="text-2xl font-bold">
                {formatBudget(campaign.budget_total, campaign.budget_currency)}
              </p>
              {campaign.budget_total && campaign.budget_spent > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Đã chi: {formatBudget(campaign.budget_spent, campaign.budget_currency)}
                </p>
              )}
            </div>

            {/* Milestones */}
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Milestones</span>
              </div>
              <p className="text-2xl font-bold">
                {completedMilestones}/{milestones.length}
              </p>
              {overdueMilestones > 0 && (
                <p className="text-xs text-destructive mt-1 flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {overdueMilestones} trễ hạn
                </p>
              )}
            </div>

            {/* Goals */}
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Mục tiêu</span>
              </div>
              <p className="text-2xl font-bold">{campaign.goals.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {campaign.goals.filter(g => g.current >= g.target).length} đạt
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
