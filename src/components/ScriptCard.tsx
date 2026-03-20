import { motion } from 'framer-motion';
import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, STATUS_CONFIG, SCRIPT_PURPOSE_CONFIG, DIALOGUE_STYLE_CONFIG, ScriptPurpose, VoiceRegion, DialogueStyle, normalizePurpose } from '@/types/script';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Clock, Wand2, Film, MonitorPlay, Clapperboard, Calendar, Palette } from 'lucide-react';
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

const VOICE_REGION_SHORT: Record<VoiceRegion, string> = {
  northern: 'Bắc',
  central: 'Trung',
  southern: 'Nam',
};

const DIALOGUE_STYLE_SHORT: Record<DialogueStyle, string> = {
  monologue: 'Độc thoại',
  conversational: 'Trò chuyện',
  internal: 'Nội tâm',
  narrative: 'Kể chuyện',
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

  const contentPreview = script.content
    .replace(/\*\*|__|##|#|\[.*?\]\(.*?\)/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 80);

  // Build metadata segments
  const metaParts: string[] = [];
  if (script.duration) metaParts.push(DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS] || `${script.duration}s`);
  if (script.video_type) metaParts.push(VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS] || script.video_type);
  metaParts.push(VOICE_REGION_SHORT[voiceRegion]);
  metaParts.push(DIALOGUE_STYLE_SHORT[dialogueStyle]);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card
          className={cn(
            "relative rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm",
            "transition-all duration-300 ease-out group cursor-pointer",
            "hover:shadow-lg hover:shadow-black/5 hover:border-border/60 hover:-translate-y-0.5"
          )}
          onClick={() => onView(script)}
        >
          <div className="p-4 space-y-3">
            {/* Row 1: Purpose + Brand dot + Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <PurposeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                  {purposeConfig?.label || purpose}
                </span>
                {brandTemplate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: brandTemplate.primary_color || 'hsl(var(--muted-foreground))' }}
                        />
                        {brandTemplate.logo_url ? (
                          <img src={brandTemplate.logo_url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                        ) : (
                          <Palette className="w-3 h-3 text-muted-foreground/50" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs font-medium">{brandTemplate.brand_name}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {script.status && (
                <Badge
                  variant={STATUS_CONFIG[script.status]?.variant || 'secondary'}
                  className="text-[9px] px-1.5 py-0 h-4 font-medium shrink-0"
                >
                  {STATUS_CONFIG[script.status]?.label || script.status}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary/90 transition-colors duration-200">
              {script.title}
            </h3>

            {/* Content preview */}
            {contentPreview && (
              <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-relaxed">
                {contentPreview}…
              </p>
            )}

            {/* Metadata line */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 flex-wrap">
              {metaParts.map((part, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/50">·</span>}
                  <span className="truncate">{part}</span>
                </span>
              ))}
            </div>

            {/* Creator + Time */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
                <span className="text-muted-foreground/50">·</span>
                <span className="text-[10px] text-muted-foreground/70 shrink-0 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDistanceToNow(createdDate, { addSuffix: true, locale: vi })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-border/20" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(script)}
                className="flex-1 h-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Xem
              </Button>

              {onSchedule && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSchedule(script)}
                      className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
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
                        className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
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
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
