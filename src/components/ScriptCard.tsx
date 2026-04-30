import { motion } from 'framer-motion';
import { Script, VIDEO_TYPE_LABELS, DURATION_LABELS, STATUS_CONFIG, SCRIPT_PURPOSE_CONFIG, DIALOGUE_STYLE_CONFIG, ScriptPurpose, VoiceRegion, DialogueStyle, normalizePurpose } from '@/types/script';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Clock, Wand2, MonitorPlay, Clapperboard, Calendar, Palette } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CreatorCell } from '@/components/CreatorCell';
import type { CreatorProfile } from '@/hooks/useCreatorProfiles';
import { cn } from '@/lib/utils';

const PURPOSE_ICONS: Record<ScriptPurpose, React.ElementType> = {
  ai_video: Wand2,
  teleprompter: MonitorPlay,
  production: Clapperboard,
};

const DIALOGUE_STYLE_SHORT: Record<DialogueStyle, string> = {
  monologue: 'Độc thoại',
  conversational: 'Trò chuyện',
  internal: 'Nội tâm',
  narrative: 'Kể chuyện',
};

const VOICE_REGION_SHORT: Record<VoiceRegion, string> = {
  northern: 'Bắc',
  central: 'Trung',
  southern: 'Nam',
};

interface BrandTemplateInfo {
  id: string;
  name: string;
  brand_name: string;
  primary_color?: string;
  logo_url?: string;
}

interface ScriptCardProps {
  script: Script;
  onView: (script: Script) => void;
  onDelete: (id: string) => void;
  onSchedule?: (script: Script) => void;
  brandTemplate?: BrandTemplateInfo;
  creatorProfile?: CreatorProfile;
  isLoadingProfile?: boolean;
  index?: number;
}

export function ScriptCard({ script, onView, onDelete, onSchedule, brandTemplate, creatorProfile, isLoadingProfile, index = 0 }: ScriptCardProps) {
  const purpose = normalizePurpose(script.script_purpose || 'ai_video');
  const PurposeIcon = PURPOSE_ICONS[purpose] || Wand2;
  const purposeConfig = SCRIPT_PURPOSE_CONFIG[purpose];

  const voiceRegion = (script.voice_region || 'northern') as VoiceRegion;
  const dialogueStyle = (script.dialogue_style || 'monologue') as DialogueStyle;

  const createdDate = new Date(script.created_at);
  const brandColor = brandTemplate?.primary_color || 'hsl(var(--border))';

  const contentPreview = script.content
    .replace(/\*\*|__|##|#|\[.*?\]\(.*?\)/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 90);

  const chips: string[] = [];
  if (script.duration) chips.push(DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS] || `${script.duration}s`);
  if (script.video_type) chips.push(VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS] || script.video_type);
  chips.push(DIALOGUE_STYLE_SHORT[dialogueStyle]);

  const brandTooltipLines = [
    brandTemplate?.brand_name,
    `Giọng ${VOICE_REGION_SHORT[voiceRegion]}`,
  ].filter(Boolean);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card
          className={cn(
            'relative overflow-hidden rounded-xl border-border/40 bg-card/70 backdrop-blur-sm',
            'transition-all duration-200 ease-out group cursor-pointer',
            'hover:bg-card hover:ring-1 hover:ring-border hover:shadow-sm',
          )}
          onClick={() => onView(script)}
        >
          {/* Brand color accent strip */}
          <span
            aria-hidden
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
            style={{ background: brandColor }}
          />

          {/* Status badge — top right corner */}
          {script.status && (
            <Badge
              variant={STATUS_CONFIG[script.status]?.variant || 'secondary'}
              className="absolute top-2.5 right-2.5 text-[9px] px-1.5 py-0 h-4 font-medium z-[1]"
            >
              {STATUS_CONFIG[script.status]?.label || script.status}
            </Badge>
          )}

          <div className="pl-4 pr-3.5 py-3.5 space-y-2.5 flex flex-col min-h-[170px]">
            {/* Row 1: Purpose + Brand */}
            <div className="flex items-center gap-2 min-w-0 pr-14">
              <PurposeIcon className="w-3 h-3 text-muted-foreground/70 shrink-0" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium truncate">
                {purposeConfig?.label || purpose}
              </span>
              {brandTemplate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center shrink-0">
                      {brandTemplate.logo_url ? (
                        <img src={brandTemplate.logo_url} alt="" className="w-3.5 h-3.5 rounded object-cover ring-1 ring-border/40" />
                      ) : (
                        <Palette className="w-3 h-3 text-muted-foreground/50" />
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {brandTooltipLines.map((l, i) => (
                      <p key={i} className="text-xs">{l}</p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Hero: title + preview */}
            <div className="space-y-1">
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary/90 transition-colors duration-200">
                {script.title}
              </h3>
              {contentPreview && (
                <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-relaxed">
                  {contentPreview}…
                </p>
              )}
            </div>

            {/* Meta chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {chips.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center bg-muted/50 text-muted-foreground text-[10px] leading-none px-1.5 py-1 rounded font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-auto pt-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {(creatorProfile || isLoadingProfile) && (
                  <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
                )}
                <span className="text-[10px] text-muted-foreground/60 shrink-0 inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDistanceToNow(createdDate, { addSuffix: true, locale: vi })}
                </span>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(script)}
                      className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Xem</TooltipContent>
                </Tooltip>

                {onSchedule && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSchedule(script)}
                        className="h-7 w-7 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Lên lịch</TooltipContent>
                  </Tooltip>
                )}

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Xóa</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận xóa kịch bản</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bạn có chắc chắn muốn xóa kịch bản "{script.title}"? Hành động này không thể hoàn tác.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(script.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
