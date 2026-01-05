import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Plus, Loader2, AlertCircle, X } from 'lucide-react';
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
import { ProgressEvent } from '@/hooks/useStreamingGeneration';
import { CHANNELS } from '@/types/multichannel';
import { cn } from '@/lib/utils';

type GenerationState = 'idle' | 'generating' | 'complete' | 'error';

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
}: MobileGenerationSheetProps) {
  const progressPercent = sseProgress?.progress ?? 0;
  const isGenerating = generationState === 'generating';
  const isComplete = generationState === 'complete';
  const isError = generationState === 'error';

  const getChannelLabel = (ch: string) => {
    return CHANNELS.find(c => c.value === ch)?.label || ch;
  };

  return (
    <Drawer 
      open={open} 
      onOpenChange={(isOpen) => {
        // Prevent closing while generating
        if (!isOpen && isGenerating) return;
        if (!isOpen && onClose) onClose();
      }}
    >
      <DrawerContent className="lg:hidden max-h-[90vh]">
        <DrawerHeader className="border-b border-border/50 pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold">
              {isGenerating && 'AI đang tạo nội dung...'}
              {isComplete && 'Tạo thành công! 🎉'}
              {isError && 'Có lỗi xảy ra'}
            </DrawerTitle>
            {!isGenerating && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose || onCreateAnother}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Progress bar for generating state */}
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
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4">
          {/* Generating State */}
          {isGenerating && (
            <div className="space-y-4">
              {/* Channel badges */}
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

              {/* Streaming progress component */}
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

          {/* Complete State */}
          {isComplete && (
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
