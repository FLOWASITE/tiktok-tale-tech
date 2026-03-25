import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Calendar, 
  DollarSign, 
  Layers, 
  Flag,
  MessageSquare,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  type CampaignFormData,
  type MilestoneFormData,
  getCampaignTypeConfig,
  formatBudget,
} from '@/types/campaign';

const CHANNELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  zalo: 'Zalo',
  email: 'Email',
};

interface CampaignCreatePreviewPanelProps {
  formData: Partial<CampaignFormData>;
  milestones: MilestoneFormData[];
}

export function CampaignCreatePreviewPanel({
  formData,
  milestones,
}: CampaignCreatePreviewPanelProps) {
  const typeConfig = formData.campaign_type ? getCampaignTypeConfig(formData.campaign_type) : null;
  const contentBrief = formData.content_brief;
  const hasContentBrief = contentBrief && (
    (contentBrief.key_messages?.length || 0) > 0 ||
    contentBrief.primary_cta ||
    Object.keys(contentBrief.pillar_allocation || {}).length > 0
  );

  // Calculate completeness
  const calculateCompleteness = () => {
    let score = 0;
    const checks = {
      hasName: !!formData.name,
      hasType: !!formData.campaign_type,
      hasDates: !!formData.start_date && !!formData.end_date,
      hasContentBrief: !!hasContentBrief,
      hasKPIs: (formData.goals || []).some((g) => g.target > 0),
      hasChannels: (formData.target_channels?.length || 0) > 0,
      hasMilestones: milestones.length > 0,
    };

    if (checks.hasName) score += 15;
    if (checks.hasType) score += 10;
    if (checks.hasDates) score += 15;
    if (checks.hasContentBrief) score += 15;
    if (checks.hasKPIs) score += 20;
    if (checks.hasChannels) score += 15;
    if (checks.hasMilestones) score += 10;

    return { score, checks };
  };

  const { score, checks } = calculateCompleteness();

  // Warnings
  const warnings: string[] = [];
  if (!checks.hasContentBrief) warnings.push('Chưa thêm mục tiêu nội dung cho AI');
  if (!checks.hasKPIs) warnings.push('Chưa đặt mục tiêu KPI');
  if (!checks.hasChannels) warnings.push('Chưa chọn kênh phân phối');
  if (!checks.hasMilestones) warnings.push('Chưa thêm milestone');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return dateStr;
    }
  };

  const getDuration = () => {
    if (!formData.start_date || !formData.end_date) return null;
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    return `${days} ngày`;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 overflow-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Tổng quan chiến dịch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Completeness */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mức độ hoàn thiện</span>
              <span className={cn(
                'font-medium',
                score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-muted-foreground'
              )}>
                {score}%
              </span>
            </div>
            <Progress value={score} className="h-2" />
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Thông tin cơ bản
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tên</span>
                <span className="font-medium truncate max-w-[60%] text-right">
                  {formData.name || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Loại</span>
                {typeConfig ? (
                  <Badge variant="outline" className="gap-1">
                    <span>{typeConfig.icon}</span>
                    <span>{typeConfig.label}</span>
                  </Badge>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Thời gian</span>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDate(formData.start_date)} - {formatDate(formData.end_date)}
                  </div>
                  {getDuration() && (
                    <div className="text-xs text-muted-foreground">{getDuration()}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Content Brief */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mục tiêu nội dung
            </h4>
            {hasContentBrief ? (
              <div className="space-y-2 text-sm">
                {(contentBrief?.key_messages?.length || 0) > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Thông điệp:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contentBrief!.key_messages.map((msg, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {msg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {contentBrief?.primary_cta && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CTA</span>
                    <span className="font-medium">{contentBrief.primary_cta}</span>
                  </div>
                )}
                {Object.keys(contentBrief?.pillar_allocation || {}).length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Pillar:</span>
                    <div className="space-y-1 mt-1">
                      {Object.entries(contentBrief!.pillar_allocation).map(([pillar, pct]) => (
                        <div key={pillar} className="flex justify-between text-xs">
                          <span className="truncate max-w-[70%]">{pillar}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Chưa thêm brief cho AI</p>
            )}
          </div>

          <Separator />

          {/* KPIs */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              KPIs & Ngân sách
            </h4>
            <div className="space-y-2 text-sm">
              {(formData.goals || []).length > 0 ? (
                <div className="space-y-1.5">
                  {formData.goals?.filter(g => g.target > 0).map((goal) => (
                    <div key={goal.metric} className="flex justify-between">
                      <span className="text-muted-foreground">{goal.label}</span>
                      <span className="font-medium">
                        {goal.target.toLocaleString('vi-VN')}{goal.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">Chưa đặt mục tiêu</p>
              )}
              
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Ngân sách</span>
                <span className="font-medium">
                  {formData.budget_total 
                    ? `${formatBudget(formData.budget_total, formData.budget_currency || 'VND')} ${formData.budget_currency || 'VND'}`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Channels */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Kênh phân phối
              {(formData.target_channels?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {formData.target_channels?.length}
                </Badge>
              )}
            </h4>
            {(formData.target_channels?.length || 0) > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {formData.target_channels?.map((ch) => (
                  <Badge key={ch} variant="outline" className="text-xs">
                    {CHANNELS[ch] || ch}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Chưa chọn kênh</p>
            )}
          </div>

          <Separator />

          {/* Milestones */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Milestones
              {milestones.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {milestones.length}
                </Badge>
              )}
            </h4>
            {milestones.length > 0 ? (
              <div className="space-y-2">
                {milestones.slice(0, 4).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{m.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(m.due_date)}
                    </span>
                  </div>
                ))}
                {milestones.length > 4 && (
                  <p className="text-xs text-muted-foreground">
                    +{milestones.length - 4} milestones khác
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Chưa thêm milestone</p>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  Lưu ý
                </h4>
                <div className="space-y-1">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-yellow-500" />
                      {w}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Ready indicator */}
          {score >= 55 && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Sẵn sàng tạo chiến dịch</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
