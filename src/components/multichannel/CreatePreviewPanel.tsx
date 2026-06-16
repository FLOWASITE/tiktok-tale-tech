import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Target, 
  Layers, 
  Timer, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Plus,
  Bot,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIGenerationProgress } from './AIGenerationProgress';
import { ImageStreamingGrid } from './streaming/ImageStreamingGrid';
import { CHANNELS, CONTENT_GOALS, MultiChannelFormData, Channel } from '@/types/multichannel';
import { ProgressEvent } from '@/hooks/useStreamingGeneration';
import { ImageGenerationStatus, GeneratedImage } from '@/hooks/useAutoImageGeneration';
import { PipelinePhase } from '@/hooks/useAutoImagePipeline';
import { cn } from '@/lib/utils';

type GenerationState = 'idle' | 'generating' | 'recovering' | 'complete' | 'error';

interface CreatePreviewPanelProps {
  state: GenerationState;
  formData: Partial<MultiChannelFormData>;
  brandName?: string;
  estimatedTime: number;
  elapsedMs: number;
  sseProgress: ProgressEvent | null;
  streamingTexts?: Record<string, string>;
  completedChannels?: string[];
  totalChannels?: string[];
  currentChannel?: string;
  currentBatch?: ProgressEvent['batchInfo'] | null;
  onViewContent: () => void;
  onCreateAnother: () => void;
  onCancel?: () => void;
  // Auto Image Pipeline props
  imagePhase?: PipelinePhase;
  imageProgress?: Record<Channel, ImageGenerationStatus>;
  imageProgressTimes?: Record<Channel, number>;
  generatedImages?: Record<Channel, GeneratedImage>;
  imageCompletedCount?: number;
  imageTotalCount?: number;
  logoOverlayFailures?: Record<Channel, boolean>;
}

export function CreatePreviewPanel({
  state,
  formData,
  brandName,
  estimatedTime,
  elapsedMs,
  sseProgress,
  streamingTexts,
  completedChannels,
  totalChannels,
  currentChannel,
  currentBatch,
  onViewContent,
  onCreateAnother,
  // Auto Image Pipeline
  imagePhase,
  imageProgress,
  imageProgressTimes,
  generatedImages,
  imageCompletedCount,
  imageTotalCount,
  logoOverlayFailures,
}: CreatePreviewPanelProps) {
  const hasTopic = (formData.topic?.trim().length || 0) >= 10;
  const hasChannels = (formData.channels?.length || 0) > 0;

  const selectedChannelLabels = useMemo(() => {
    return formData.channels?.map(ch => {
      const channel = CHANNELS.find(c => c.value === ch);
      return channel?.label || ch;
    }) || [];
  }, [formData.channels]);

  const goalLabel = useMemo(() => {
    const goal = CONTENT_GOALS.find(g => g.value === formData.contentGoal);
    return goal?.label || 'Chưa chọn';
  }, [formData.contentGoal]);

  const isImageGenerating = imagePhase === 'generating_images' || imagePhase === 'preparing';
  const isImageComplete = imagePhase === 'complete' || imagePhase === 'error';

  // State 1: Empty/Onboarding
  if (state === 'idle' && !hasTopic) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Illustration */}
          <div className="relative mx-auto w-32 h-32">
            <motion.div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-primary/40" />
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <h3 className="text-lg font-semibold text-foreground">
              Bắt đầu tạo nội dung
            </h3>
            <p className="text-sm text-muted-foreground">
              Nhập chủ đề ở bên trái để xem gợi ý AI và tạo nội dung đa kênh chuyên nghiệp
            </p>
          </div>

          {/* Tips */}
          <div className="space-y-2 text-left">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Gợi ý
            </p>
            <div className="space-y-1.5">
              {[
                'Mô tả chi tiết chủ đề bạn muốn viết',
                'AI sẽ tinh chỉnh và gợi ý góc tiếp cận',
                'Chọn nhiều kênh để tối ưu thời gian'
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // State 2: Topic Entered - Show Configuration Summary
  if (state === 'idle' && hasTopic) {
    return (
      <div className="h-full flex flex-col">
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span className="text-sm font-medium">Xem trước cấu hình</span>
          </div>

          {/* Topic Card */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Chủ đề</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {formData.topic}
              </p>
            </CardContent>
          </Card>

          {/* Configuration Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Brand */}
            {brandName && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                    Thương hiệu
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {brandName}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Goal */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  Mục tiêu
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {goalLabel}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Channels */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Kênh đã chọn</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formData.channels?.length || 0} kênh
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedChannelLabels.slice(0, 8).map((label, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {selectedChannelLabels.length > 8 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{selectedChannelLabels.length - 8}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estimated Time */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Thời gian ước tính</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  ~{estimatedTime}s
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // State 3: Generating / Recovering Text
  if (state === 'generating' || state === 'recovering') {
    return (
      <div className="h-full flex flex-col">
        <AIGenerationProgress
          isLoading={true}
          channelCount={formData.channels?.length || 0}
          elapsedMs={elapsedMs}
          sseStep={sseProgress?.step}
          sseProgress={sseProgress?.progress}
          sseMessage={sseProgress?.message}
          completedChannels={completedChannels}
          totalChannels={totalChannels}
          currentChannel={currentChannel}
          currentBatch={currentBatch}
          streamingTexts={streamingTexts}
        />
        {state === 'recovering' && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Kết nối stream bị gián đoạn, hệ thống đang hoàn tất ở nền và tự khôi phục kết quả.
          </div>
        )}
      </div>
    );
  }

  // State 4: Complete (text done, possibly generating images)
  if (state === 'complete') {
    return (
      <div className="h-full flex flex-col">
        <motion.div 
          className="space-y-6 w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Text Success Header */}
          <div className="flex items-center justify-center">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Nội dung đã tạo xong! 🎉
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formData.channels?.length || 0} kênh trong {Math.round(elapsedMs / 1000)}s
                </p>
              </div>
            </motion.div>
          </div>

          {/* Transition text + Auto Image Generation Section */}
          {isImageGenerating && imageProgress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <ImageIcon className="w-4 h-4 text-primary animate-pulse" />
                <span>Đang tự động tạo ảnh cho các kênh...</span>
              </motion.div>
              <ImageStreamingGrid
                progress={imageProgress}
                progressTimes={imageProgressTimes}
                logoOverlayFailures={logoOverlayFailures}
                generatedImages={generatedImages || {} as Record<Channel, GeneratedImage>}
              />
            </motion.div>
          )}

          {/* Image Complete Summary */}
          {isImageComplete && imageCompletedCount != null && imageTotalCount != null && imageTotalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-sm"
            >
              <ImageIcon className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground">
                Đã tạo ảnh cho {imageCompletedCount}/{imageTotalCount} kênh
              </span>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
            <Button 
              onClick={onViewContent}
              className="w-full gap-2"
              size="lg"
            >
              <ArrowRight className="w-4 h-4" />
              Xem nội dung
            </Button>
            <Button 
              variant="outline" 
              onClick={onCreateAnother}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Tạo thêm nội dung
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // State: Error
  if (state === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div 
          className="space-y-6 max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="text-3xl">😔</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Có lỗi xảy ra
            </h3>
            <p className="text-sm text-muted-foreground">
              Không thể tạo nội dung. Vui lòng thử lại.
            </p>
          </div>

          <Button 
            variant="outline" 
            onClick={onCreateAnother}
            className="gap-2"
          >
            Thử lại
          </Button>
        </motion.div>
      </div>
    );
  }

  return null;
}
