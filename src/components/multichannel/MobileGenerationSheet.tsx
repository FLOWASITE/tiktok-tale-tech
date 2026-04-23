import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Plus, Loader2, AlertCircle, X, ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { AIGenerationProgress } from './AIGenerationProgress';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';
import { ProgressEvent } from '@/hooks/useStreamingGeneration';
import { ImageGenerationStatus, GeneratedImage } from '@/hooks/useAutoImageGeneration';
import { PipelinePhase } from '@/hooks/useAutoImagePipeline';
import { CHANNELS, Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';

type GenerationState = 'idle' | 'generating' | 'recovering' | 'complete' | 'error';

interface MobileGenerationSheetProps {
  open: boolean;
  generationState: GenerationState;
  streamingTexts: Record<string, string>;
  sseProgress: ProgressEvent | null;
  elapsedMs: number;
  channels: string[];
  completedChannels: string[];
  currentChannel?: string;
  onViewContent: () => void;
  onCreateAnother: () => void;
  onClose?: () => void;
  // Auto Image Pipeline props
  imagePhase?: PipelinePhase;
  imageProgress?: Record<Channel, ImageGenerationStatus>;
  imageProgressTimes?: Record<Channel, number>;
  generatedImages?: Record<Channel, GeneratedImage>;
  imageCompletedCount?: number;
  imageTotalCount?: number;
  logoOverlayFailures?: Record<Channel, boolean>;
}

export function MobileGenerationSheet({
  open,
  generationState,
  streamingTexts,
  sseProgress,
  elapsedMs,
  channels,
  completedChannels,
  currentChannel,
  onViewContent,
  onCreateAnother,
  onClose,
  imagePhase,
  imageProgress,
  imageProgressTimes,
  generatedImages,
  imageCompletedCount,
  imageTotalCount,
  logoOverlayFailures,
}: MobileGenerationSheetProps) {
  const isMobile = useIsMobile();
  const progressPercent = sseProgress?.progress ?? 0;
  const isGenerating = generationState === 'generating' || generationState === 'recovering';
  const isComplete = generationState === 'complete';
  const isError = generationState === 'error';

  const isImageGenerating = imagePhase === 'generating_images' || imagePhase === 'preparing';
  const isImageComplete = imagePhase === 'complete' || imagePhase === 'error';
  const isFullyComplete = isComplete && !isImageGenerating;

  const getChannelLabel = (ch: string) => {
    return CHANNELS.find(c => c.value === ch)?.label || ch;
  };

  const isStillWorking = isGenerating || isImageGenerating;

  const handleClose = () => {
    if (isStillWorking) {
      toast({
        title: 'Nội dung đang tạo sẽ tiếp tục ở nền',
        description: 'Bạn có thể quay lại xem kết quả sau.',
      });
    }
    onClose?.();
  };

  // Determine title
  const getTitle = () => {
    if (generationState === 'recovering') return 'Đang hoàn tất ở nền...';
    if (generationState === 'generating') return 'AI đang tạo nội dung...';
    if (isComplete && isImageGenerating) return 'Đang tạo ảnh AI... 🎨';
    if (isComplete && isFullyComplete) return 'Tạo thành công! 🎉';
    if (isError) return 'Có lỗi xảy ra';
    return '';
  };

  if (!isMobile) return null;

  return (
    <Drawer 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DrawerContent className="lg:hidden max-h-[90vh]">
        <DrawerHeader className="border-b border-border/50 pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold">
              {getTitle()}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress bar for text generating state */}
          {isGenerating && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedChannels.length}/{channels.length} kênh
                </span>
                <span className="font-medium text-primary">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Progress bar for image generating state */}
          {isComplete && isImageGenerating && imageTotalCount != null && imageTotalCount > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
                  {imageCompletedCount ?? 0}/{imageTotalCount} kênh ảnh
                </span>
                <span className="font-medium text-primary">
                  {Math.round(((imageCompletedCount ?? 0) / imageTotalCount) * 100)}%
                </span>
              </div>
              <Progress 
                value={((imageCompletedCount ?? 0) / imageTotalCount) * 100} 
                className="h-2" 
              />
            </div>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4">
          {/* Generating Text State */}
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {channels.map((ch) => {
                  const isCompleted = completedChannels.includes(ch);
                  const isCurrent = currentChannel === ch;
                  return (
                    <Badge
                      key={ch}
                      variant="outline"
                      className={cn(
                        'text-xs transition-all',
                        isCompleted && 'bg-green-500/10 text-green-600 border-green-500/30',
                        isCurrent && 'bg-primary/10 text-primary border-primary/30 animate-pulse',
                        !isCompleted && !isCurrent && 'text-muted-foreground'
                      )}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {isCurrent && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {getChannelLabel(ch)}
                    </Badge>
                  );
                })}
              </div>

              <AIGenerationProgress
                isLoading={true}
                channelCount={channels.length}
                elapsedMs={elapsedMs}
                sseStep={sseProgress?.step}
                sseProgress={sseProgress?.progress}
                sseMessage={sseProgress?.message}
                completedChannels={completedChannels}
                totalChannels={channels}
                currentChannel={currentChannel}
                streamingTexts={streamingTexts}
              />
            </div>
          )}

          {/* Complete + Image Generating State */}
          {isComplete && isImageGenerating && imageProgress && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Mini text success */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-700 dark:text-green-400">
                  Nội dung {channels.length} kênh đã tạo xong ({Math.round(elapsedMs / 1000)}s)
                </span>
              </div>

              {/* Image streaming grid - mobile optimized */}
              <ImageStreamingGrid
                progress={imageProgress}
                progressTimes={imageProgressTimes}
                logoOverlayFailures={logoOverlayFailures}
                generatedImages={generatedImages || {} as Record<Channel, GeneratedImage>}
                className="[&_.grid]:!grid-cols-1"
              />
            </motion.div>
          )}

          {/* Fully Complete State */}
          {isFullyComplete && (
            <motion.div
              className="flex flex-col items-center text-center py-6 space-y-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </motion.div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Đã tạo nội dung cho {channels.length} kênh trong {Math.round(elapsedMs / 1000)}s
                </p>
                {isImageComplete && imageCompletedCount != null && imageTotalCount != null && imageTotalCount > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    + {imageCompletedCount}/{imageTotalCount} ảnh AI
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={onViewContent} className="w-full gap-2" size="lg">
                  <ArrowRight className="w-4 h-4" />
                  Xem nội dung
                </Button>
                <Button variant="outline" onClick={onCreateAnother} className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Tạo thêm nội dung
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {isError && (
            <motion.div
              className="flex flex-col items-center text-center py-6 space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Có lỗi xảy ra</h3>
                <p className="text-sm text-muted-foreground">
                  Không thể tạo nội dung. Vui lòng thử lại.
                </p>
              </div>

              <Button variant="outline" onClick={onCreateAnother} className="gap-2">
                Thử lại
              </Button>
            </motion.div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
