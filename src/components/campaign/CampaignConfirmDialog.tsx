import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CampaignProgressBar } from '@/components/campaign/CampaignProgressBar';
import { ChannelIcon, channelIconColors } from '@/components/ui/channel-icon';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Sparkles,
  CalendarDays,
  MessageSquare,
  Target,
  DollarSign,
  Flag,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  CAMPAIGN_TYPES,
  KPI_METRICS,
  type CampaignFormData,
  type MilestoneFormData,
} from '@/types/campaign';
import type { Channel } from '@/types/multichannel';
import { differenceInDays, format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CampaignConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CampaignFormData;
  milestones: MilestoneFormData[];
  isEditMode: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function CampaignConfirmDialog({
  open,
  onOpenChange,
  formData,
  milestones,
  isEditMode,
  isSubmitting,
  onConfirm,
}: CampaignConfirmDialogProps) {
  const typeConfig = CAMPAIGN_TYPES.find(t => t.value === formData.campaign_type);

  const duration = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return null;
    try {
      return differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date));
    } catch {
      return null;
    }
  }, [formData.start_date, formData.end_date]);

  const activeGoals = useMemo(
    () => (formData.goals || []).filter(g => g.target > 0),
    [formData.goals],
  );

  const keyMessages = formData.content_brief?.key_messages?.filter(Boolean) || [];
  const cta = formData.content_brief?.primary_cta?.trim() || '';

  // Completeness calculation
  const { score, warnings } = useMemo(() => {
    const checks = [
      { ok: !!formData.name?.trim(), msg: 'Chưa có tên chiến dịch' },
      { ok: !!formData.start_date && !!formData.end_date, msg: 'Chưa chọn thời gian' },
      { ok: keyMessages.length > 0, msg: 'Chưa có Key Message' },
      { ok: !!cta, msg: 'Chưa có CTA' },
      { ok: activeGoals.length > 0, msg: 'Chưa có mục tiêu KPI' },
      { ok: (formData.target_channels?.length || 0) > 0, msg: 'Chưa chọn kênh phân phối' },
    ];
    const done = checks.filter(c => c.ok).length;
    return {
      score: Math.round((done / checks.length) * 100),
      warnings: checks.filter(c => !c.ok).map(c => c.msg),
    };
  }, [formData, keyMessages, cta, activeGoals]);

  const formatDate = (d: string) => {
    try {
      return format(parseISO(d), 'dd/MM/yyyy', { locale: vi });
    } catch {
      return d;
    }
  };

  const channelMap: Record<string, Channel> = {
    facebook: 'facebook',
    instagram: 'instagram',
    tiktok: 'tiktok',
    youtube: 'youtube',
    linkedin: 'linkedin',
    twitter: 'twitter',
    zalo: 'zalo_oa',
    email: 'email',
    website: 'website',
    telegram: 'telegram',
    threads: 'threads',
    google_maps: 'google_maps',
    zalo_oa: 'zalo_oa',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {isEditMode ? 'Xác nhận cập nhật chiến dịch' : 'Xác nhận tạo chiến dịch'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kiểm tra lại thông tin trước khi {isEditMode ? 'lưu thay đổi' : 'tạo mới'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Completeness */}
          <div className="space-y-1.5">
            <CampaignProgressBar progress={score} size="sm" />
          </div>

          {/* Warnings / Ready */}
          {warnings.length > 0 ? (
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">Đã điền đầy đủ thông tin</span>
            </div>
          )}

          {/* Summary sections */}
          <div className="rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/40">
            {/* Name + Type */}
            <div className="px-4 py-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Chiến dịch</p>
              <p className="text-sm font-medium truncate">{formData.name?.trim() || '—'}</p>
              {typeConfig && (
                <Badge variant="secondary" className="text-[10px] font-normal mt-0.5">
                  {typeConfig.icon} {typeConfig.label}
                </Badge>
              )}
            </div>

            {/* Duration */}
            {formData.start_date && formData.end_date && (
              <div className="px-4 py-3 flex items-start gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs space-y-0.5">
                  <span>
                    {formatDate(formData.start_date)} → {formatDate(formData.end_date)}
                  </span>
                  {duration !== null && (
                    <span className="text-muted-foreground ml-1">({duration} ngày)</span>
                  )}
                </div>
              </div>
            )}

            {/* Key Messages */}
            {keyMessages.length > 0 && (
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Key Messages
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {keyMessages.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-normal max-w-[200px] truncate">
                      {m}
                    </Badge>
                  ))}
                </div>
                {cta && (
                  <Badge className="text-[10px] mt-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                    CTA: {cta}
                  </Badge>
                )}
              </div>
            )}

            {/* KPIs */}
            {activeGoals.length > 0 && (
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Mục tiêu KPI
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {activeGoals.map((g) => {
                    const metric = KPI_METRICS.find(m => m.value === g.metric);
                    return (
                      <div key={g.metric} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">
                          {metric?.label || g.metric}
                        </span>
                        <span className="font-medium tabular-nums">
                          {g.target.toLocaleString()}{metric?.unit ? metric.unit : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget */}
            {formData.budget_total && formData.budget_total > 0 && (
              <div className="px-4 py-3 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Ngân sách:</span>
                <span className="text-xs font-medium">
                  {formData.budget_total.toLocaleString()} {formData.budget_currency || 'VND'}
                </span>
              </div>
            )}

            {/* Channels */}
            {(formData.target_channels?.length || 0) > 0 && (
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Kênh phân phối
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.target_channels!.map((ch) => {
                    const channel = channelMap[ch] || (ch as Channel);
                    return (
                      <span key={ch} className={cn('inline-flex', channelIconColors[channel])}>
                        <ChannelIcon channel={channel} size={16} />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="px-4 py-3 flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Milestones:</span>
                <span className="text-xs font-medium">{milestones.length} mốc</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Quay lại chỉnh sửa
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang lưu…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isEditMode ? 'Cập nhật' : 'Tạo chiến dịch'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
