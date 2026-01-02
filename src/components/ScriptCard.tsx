import { useState } from 'react';
import { motion } from 'framer-motion';
import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS, STATUS_CONFIG, SCRIPT_PURPOSE_CONFIG, VOICE_REGION_CONFIG, DIALOGUE_STYLE_CONFIG, ScriptPurpose, VoiceRegion, DialogueStyle } from '@/types/script';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Clock, User, Film, Wand2, MonitorPlay, Mic, Clapperboard, MapPin, MessageSquare, Calendar, RefreshCw, Package, Palette } from 'lucide-react';
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

// Purpose icons mapping
const PURPOSE_ICONS: Record<ScriptPurpose, React.ElementType> = {
  ai_video_veo3: Wand2,
  ai_video_minimax: Film,
  teleprompter: MonitorPlay,
  voiceover: Mic,
  production: Clapperboard,
};

// Purpose color classes
const PURPOSE_COLORS: Record<ScriptPurpose, string> = {
  ai_video_veo3: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ai_video_minimax: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  teleprompter: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  voiceover: 'bg-green-500/20 text-green-400 border-green-500/30',
  production: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// Voice region display
const VOICE_REGION_DISPLAY: Record<VoiceRegion, { label: string; emoji: string }> = {
  northern: { label: 'Bắc', emoji: '🔵' },
  central: { label: 'Trung', emoji: '🟡' },
  southern: { label: 'Nam', emoji: '🟢' },
};

// Dialogue style short labels
const DIALOGUE_STYLE_SHORT: Record<DialogueStyle, string> = {
  monologue: 'Độc thoại',
  conversational: 'Trò chuyện',
  internal: 'Nội tâm',
  narrative: 'Kể chuyện',
};

// Status glow effects
const STATUS_GLOW: Record<string, string> = {
  draft: '',
  review: 'hover:shadow-yellow-500/20',
  approved: 'hover:shadow-blue-500/20',
  published: 'hover:shadow-green-500/20',
};

// Brand template type for display
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
  const [isHovered, setIsHovered] = useState(false);
  
  const purpose = script.script_purpose as ScriptPurpose;
  const PurposeIcon = PURPOSE_ICONS[purpose] || Wand2;
  const purposeConfig = SCRIPT_PURPOSE_CONFIG[purpose];
  const purposeColor = PURPOSE_COLORS[purpose] || PURPOSE_COLORS.ai_video_veo3;
  
  const voiceRegion = (script.voice_region || 'northern') as VoiceRegion;
  const voiceRegionDisplay = VOICE_REGION_DISPLAY[voiceRegion];
  const voiceRegionConfig = VOICE_REGION_CONFIG[voiceRegion];
  
  const dialogueStyle = (script.dialogue_style || 'monologue') as DialogueStyle;
  const dialogueStyleConfig = DIALOGUE_STYLE_CONFIG[dialogueStyle];
  const dialogueStyleShort = DIALOGUE_STYLE_SHORT[dialogueStyle];

  // Check if updated after created (more than 1 minute difference)
  const createdDate = new Date(script.created_at);
  const updatedDate = new Date(script.updated_at);
  const wasUpdated = (updatedDate.getTime() - createdDate.getTime()) > 60000;

  // Extract content preview (first 100 chars, remove markdown/special chars)
  const contentPreview = script.content
    .replace(/\*\*|__|##|#|\[.*?\]\(.*?\)/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 100);

  const statusGlow = STATUS_GLOW[script.status || 'draft'] || '';

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4,
          delay: index * 0.05,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Card className={cn(
          "relative border-border/50 transition-all duration-300 ease-out group overflow-hidden",
          "bg-background/80 backdrop-blur-sm",
          "hover:shadow-xl hover:-translate-y-1",
          statusGlow
        )}>
          {/* Animated gradient overlay on hover */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-secondary/0 transition-all duration-500 pointer-events-none",
            isHovered && "from-primary/5 to-secondary/5"
          )} />
          
          {/* Status glow border */}
          <div className={cn(
            "absolute inset-0 rounded-lg transition-opacity duration-300 pointer-events-none",
            script.status === 'published' && "ring-1 ring-green-500/30",
            script.status === 'review' && "ring-1 ring-yellow-500/30",
            script.status === 'approved' && "ring-1 ring-blue-500/30",
            !isHovered && "opacity-0",
            isHovered && "opacity-100"
          )} />
          
          <CardHeader className="relative p-3 xs:p-4 pb-2 space-y-2">
            {/* Top row: Purpose Badge + Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`${purposeColor} border text-[9px] xs:text-xs px-1.5 xs:px-2 py-0.5 flex items-center gap-1`}
                  >
                    <PurposeIcon className="w-3 h-3" />
                    <span className="hidden xs:inline">{purposeConfig?.label || purpose}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{purposeConfig?.label}</p>
                  <p className="text-xs text-muted-foreground">{purposeConfig?.description}</p>
                </TooltipContent>
              </Tooltip>

              {script.status && (
                <Badge 
                  variant={STATUS_CONFIG[script.status]?.variant || 'secondary'} 
                  className="shrink-0 text-[9px] xs:text-xs px-1.5 xs:px-2 py-0.5"
                >
                  {STATUS_CONFIG[script.status]?.label || script.status}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="text-sm xs:text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {script.title}
            </h3>

            {/* Topic + Brand */}
            <div className="flex items-center gap-2 text-[10px] xs:text-xs text-muted-foreground">
              <span className="line-clamp-1 flex-1">
                <span className="font-medium">Chủ đề:</span> {script.topic}
              </span>
              {brandTemplate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium shrink-0"
                      style={{ 
                        backgroundColor: brandTemplate.primary_color ? `${brandTemplate.primary_color}20` : 'hsl(var(--muted))',
                        color: brandTemplate.primary_color || 'hsl(var(--muted-foreground))'
                      }}
                    >
                      {brandTemplate.logo_url ? (
                        <img src={brandTemplate.logo_url} alt="" className="w-3 h-3 rounded object-cover" />
                      ) : (
                        <Palette className="w-2.5 h-2.5" />
                      )}
                      <span className="max-w-[60px] truncate">{brandTemplate.brand_name}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{brandTemplate.brand_name}</p>
                    <p className="text-xs text-muted-foreground">Brand Template: {brandTemplate.name}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>

          <CardContent className="relative p-3 xs:p-4 pt-0 space-y-3">
            {/* Content Preview */}
            <p className="text-[10px] xs:text-xs text-muted-foreground/80 line-clamp-2 italic border-l-2 border-primary/30 pl-2">
              "{contentPreview}..."
            </p>

            {/* Info Badges Row 1: Duration, Video Type, Character */}
            <div className="flex flex-wrap gap-1 xs:gap-1.5 text-[9px] xs:text-xs">
              <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <Clock className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                <span>{DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}</span>
              </span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                    <Film className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                    <span className="truncate max-w-[50px] xs:max-w-[80px]">
                      {VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}</TooltipContent>
              </Tooltip>
              
              <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                <User className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                <span className="hidden xs:inline truncate max-w-[60px]">
                  {CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}
                </span>
              </span>
            </div>

            {/* Info Badges Row 2: Voice Region, Dialogue Style, Industry */}
            <div className="flex flex-wrap gap-1 xs:gap-1.5 text-[9px] xs:text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <MapPin className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                    <span>{voiceRegionDisplay.emoji} {voiceRegionDisplay.label}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{voiceRegionConfig?.label}</p>
                  <p className="text-xs text-muted-foreground">{voiceRegionConfig?.dialect_notes}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <MessageSquare className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                    <span>{dialogueStyleShort}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{dialogueStyleConfig?.label}</p>
                  <p className="text-xs text-muted-foreground">{dialogueStyleConfig?.description}</p>
                </TooltipContent>
              </Tooltip>

              {script.industry_template_id && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 xs:gap-1 px-1.5 xs:px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Package className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                      <span className="hidden xs:inline">Industry</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Industry Rules applied</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Creator + Organization */}
            <div className="flex items-center gap-1.5 text-[9px] xs:text-[10px]">
              <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
            </div>

            {/* Timestamps */}
            <div className="flex items-center gap-2 text-[9px] xs:text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(createdDate, { addSuffix: true, locale: vi })}
              </span>
              {wasUpdated && (
                <span className="inline-flex items-center gap-1 text-primary/70">
                  <RefreshCw className="w-2.5 h-2.5" />
                  Cập nhật {formatDistanceToNow(updatedDate, { addSuffix: true, locale: vi })}
                </span>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className={cn(
              "flex gap-1.5 xs:gap-2 pt-1 transition-all duration-300",
              isHovered ? "opacity-100 translate-y-0" : "opacity-80"
            )}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(script)}
                className="flex-1 h-7 xs:h-8 text-[10px] xs:text-sm bg-background/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
              >
                <Eye className="w-3 h-3 xs:w-4 xs:h-4 mr-0.5 xs:mr-1" />
                Xem
              </Button>

              {onSchedule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSchedule(script)}
                  className="h-7 xs:h-8 px-2 xs:px-3 bg-background/80 hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-all duration-200"
                >
                  <Calendar className="w-3 h-3 xs:w-4 xs:h-4" />
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 xs:h-8 xs:w-8 bg-background/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
                  >
                    <Trash2 className="w-3 h-3 xs:w-4 xs:h-4" />
                  </Button>
                </AlertDialogTrigger>
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
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
