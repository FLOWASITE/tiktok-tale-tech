// ============================================
// ContentPipelineSteps — 4-step content creation timeline
// Shows: Topic & Goal → Core Content → Strategic Role → Multi-channel
// ============================================

import { useState } from 'react';
import { CheckCircle2, Target, FileText, Users, Share2, ChevronDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// ── Label maps (Vietnamese) ──

const GOAL_LABELS: Record<string, string> = {
  awareness: 'Nhận biết',
  education: 'Giáo dục',
  expertise: 'Chuyên gia',
  engagement: 'Tương tác',
  conversion: 'Chuyển đổi',
};

const ANGLE_LABELS: Record<string, string> = {
  educational: 'Giáo dục',
  storytelling: 'Kể chuyện',
  data_driven: 'Dữ liệu',
  controversial: 'Phản biện',
  behind_the_scenes: 'Hậu trường',
  case_study: 'Case Study',
  how_to: 'Hướng dẫn',
  listicle: 'Danh sách',
};

const ROLE_CONFIG: Record<string, { label: string; description: string; color: string }> = {
  seed: {
    label: 'Seed',
    description: 'Mở nhận thức, không bán hàng',
    color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  sprout: {
    label: 'Sprout',
    description: 'Xây dựng lòng tin',
    color: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
  },
  harvest: {
    label: 'Harvest',
    description: 'Chuyển đổi, CTA mạnh',
    color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
};

const CHANNEL_ICONS: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  tiktok: 'TT',
  linkedin: 'LI',
  twitter: 'X',
  youtube: 'YT',
  threads: 'TH',
  zalo: 'ZL',
};

// ── Types ──

interface ContentPipelineStepsProps {
  result: {
    topic?: string;
    content_goal?: string;
    content_angle?: string;
    content_role?: string;
    journey_stage?: string;
    core_content_id?: string;
    pipeline_steps?: string[];
    channels?: string[];
    channel_previews?: Record<string, string>;
    content_id?: string;
  };
  onNavigate?: (path: string, state?: any) => void;
}

// ── Step item ──

interface StepProps {
  stepNumber: number;
  title: string;
  icon: React.ElementType;
  completed: boolean;
  children: React.ReactNode;
  isLast?: boolean;
}

function Step({ stepNumber, title, icon: Icon, completed, children, isLast }: StepProps) {
  return (
    <div className="flex gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border',
          completed
            ? 'bg-primary/15 border-primary/40 text-primary'
            : 'bg-muted border-border text-muted-foreground'
        )}>
          {completed
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <Icon className="w-3 h-3" />
          }
        </div>
        {!isLast && (
          <div className="w-px flex-1 min-h-[16px] bg-border" />
        )}
      </div>

      {/* Content */}
      <div className={cn('pb-3 flex-1 min-w-0', isLast && 'pb-0')}>
        <p className="text-xs font-medium leading-6">
          Bước {stepNumber}: {title}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

// ── Main component ──

export function ContentPipelineSteps({ result, onNavigate }: ContentPipelineStepsProps) {
  const [channelsOpen, setChannelsOpen] = useState(false);

  const role = result.content_role || result.journey_stage || 'seed';
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.seed;
  const goalLabel = GOAL_LABELS[result.content_goal || ''] || result.content_goal || '—';
  const angleLabel = ANGLE_LABELS[result.content_angle || ''] || result.content_angle || '—';
  const channels = result.channels || [];
  const previews = result.channel_previews || {};
  const hasCoreContent = !!result.core_content_id;

  return (
    <div className="mt-2 space-y-2">
      {/* Header */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Quy trình tạo nội dung
      </p>

      {/* Steps */}
      <div className="pl-0.5">
        {/* Step 1: Topic & Goal */}
        <Step stepNumber={1} title="Chủ đề & Mục tiêu" icon={Target} completed>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{goalLabel}</Badge>
            {result.content_angle && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">{angleLabel}</Badge>
            )}
          </div>
          {result.topic && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 italic">
              "{result.topic}"
            </p>
          )}
        </Step>

        {/* Step 2: Core Content */}
        <Step stepNumber={2} title="Core Content" icon={FileText} completed={hasCoreContent}>
          {hasCoreContent ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                <FileText className="w-2.5 h-2.5" />
                Đã tạo
              </Badge>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('/core-content')}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  Xem Core Content
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Bỏ qua (fallback)</p>
          )}
        </Step>

        {/* Step 3: Strategic Role */}
        <Step stepNumber={3} title="Vai trò chiến lược" icon={Users} completed>
          <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 border', roleConfig.color)}>
            {roleConfig.label} — {roleConfig.description}
          </Badge>
        </Step>

        {/* Step 4: Multi-channel */}
        <Step stepNumber={4} title={`Đa kênh (${channels.length} kênh)`} icon={Share2} completed={channels.length > 0} isLast>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {channels.map((ch: string) => (
              <Badge key={ch} variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                {CHANNEL_ICONS[ch] || ch}
              </Badge>
            ))}
          </div>

          {/* Collapsible previews */}
          {Object.keys(previews).length > 0 && (
            <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer">
                <ChevronDown className={cn('w-3 h-3 transition-transform', channelsOpen && 'rotate-180')} />
                {channelsOpen ? 'Thu gọn' : 'Xem preview'}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1.5 space-y-1 text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2 max-h-32 overflow-y-auto">
                  {Object.entries(previews).map(([channel, content]) => (
                    <div key={channel}>
                      <span className="font-medium capitalize">{channel}:</span>{' '}
                      <span className="line-clamp-2">{String(content)}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Step>
      </div>

      {/* Action button */}
      {onNavigate && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 w-full"
          onClick={() => onNavigate('/multichannel', { prefillTopic: result.topic })}
        >
          Mở & Chỉnh sửa
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
