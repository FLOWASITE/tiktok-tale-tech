import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImageStreamingCard } from "./ImageStreamingCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Image as ImageIcon, CheckCircle, Clock } from "lucide-react";
import { Channel } from "@/types/multichannel";
import { ImageGenerationStatus, GeneratedImage } from "@/hooks/useAutoImageGeneration";
import { ImageLightbox, LightboxImage } from "@/components/ui/ImageLightbox";
import { getChannelLabel } from "./ChannelIcon";

interface ImageStreamingGridProps {
  progress: Record<Channel, ImageGenerationStatus>;
  progressTimes?: Record<Channel, number>;
  logoOverlayFailures?: Record<Channel, boolean>;
  generatedImages: Record<Channel, GeneratedImage>;
  onRetryChannel?: (channel: Channel) => void;
  onDownloadImage?: (channel: Channel) => void;
  onEditBackground?: (channel: Channel) => void;
  onRefineText?: (channel: Channel) => void;
  retryingChannel?: Channel | null;
  className?: string;
}

export function ImageStreamingGrid({
  progress,
  progressTimes,
  logoOverlayFailures,
  generatedImages,
  onRetryChannel,
  onDownloadImage,
  onEditBackground,
  onRefineText,
  retryingChannel,
  className,
}: ImageStreamingGridProps) {
  const channels = Object.keys(progress) as Channel[];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (channels.length === 0) {
    return null;
  }

  // Calculate stats
  const completedCount = Object.values(progress).filter(
    s => s === 'done'
  ).length;
  const errorCount = Object.values(progress).filter(
    s => s === 'error'
  ).length;
  const inProgressCount = Object.values(progress).filter(
    s => s === 'generating' || s === 'overlaying'
  ).length;
  const pendingCount = Object.values(progress).filter(
    s => s === 'pending'
  ).length;
  const totalCount = channels.length;
  const progressPercent = totalCount > 0 
    ? ((completedCount + errorCount) / totalCount) * 100 
    : 0;

  // Sort channels: active first, then completed, then pending, then error
  const sortedChannels = [...channels].sort((a, b) => {
    const order: Record<ImageGenerationStatus, number> = {
      generating: 0,
      overlaying: 1,
      done: 2,
      pending: 3,
      error: 4,
    };
    return order[progress[a]] - order[progress[b]];
  });

  // Build lightbox images from completed channels
  const lightboxImages: LightboxImage[] = sortedChannels
    .filter(ch => progress[ch] === 'done' && generatedImages[ch]?.imageUrl)
    .map(ch => ({
      imageUrl: generatedImages[ch].imageUrl!,
      channel: ch,
      channelLabel: getChannelLabel(ch),
      aspectRatio: generatedImages[ch].aspectRatio,
      modelUsed: generatedImages[ch].modelUsed,
      renderDebug: generatedImages[ch].renderDebug,
    }));

  const openLightbox = (channel: Channel) => {
    const idx = lightboxImages.findIndex(img => img.channel === channel);
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Đang tạo ảnh AI
                </h3>
                <p className="text-xs text-muted-foreground">
                  {inProgressCount > 0 
                    ? `Đang xử lý ${inProgressCount} kênh...`
                    : completedCount === totalCount
                      ? 'Hoàn thành tất cả!'
                      : `${completedCount}/${totalCount} kênh hoàn thành`
                  }
                </p>
              </div>
            </div>

            {/* Stats badges */}
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  {completedCount}
                </div>
              )}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                  <Clock className="w-3 h-3" />
                  {pendingCount}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tiến độ</span>
              <span className="tabular-nums font-medium">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {sortedChannels.map((channel, index) => {
            const status = progress[channel];
            const image = generatedImages[channel];
            
            return (
              <motion.div
                key={channel}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  layout: { duration: 0.3 }
                }}
              >
                <ImageStreamingCard
                  channel={channel}
                  status={status}
                  imageUrl={image?.imageUrl}
                  aspectRatio={image?.aspectRatio}
                  prompt={image?.prompt}
                  modelUsed={image?.modelUsed}
                  onRetry={onRetryChannel ? () => onRetryChannel(channel) : undefined}
                  onDownload={onDownloadImage ? () => onDownloadImage(channel) : undefined}
                  onEditBackground={onEditBackground ? () => onEditBackground(channel) : undefined}
                  onRefineText={onRefineText ? () => onRefineText(channel) : undefined}
                  onViewImage={status === 'done' && image?.imageUrl ? () => openLightbox(channel) : undefined}
                  isRetrying={retryingChannel === channel}
                  logoOverlayFailed={logoOverlayFailures?.[channel] || image?.logoOverlayFailed}
                  startTime={progressTimes?.[channel]}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        onDownload={onDownloadImage ? (idx) => {
          const ch = lightboxImages[idx]?.channel as Channel;
          if (ch) onDownloadImage(ch);
        } : undefined}
        onEditBackground={onEditBackground ? (idx) => {
          const ch = lightboxImages[idx]?.channel as Channel;
          if (ch) { setLightboxIndex(null); onEditBackground(ch); }
        } : undefined}
        onRetry={onRetryChannel ? (idx) => {
          const ch = lightboxImages[idx]?.channel as Channel;
          if (ch) { setLightboxIndex(null); onRetryChannel(ch); }
        } : undefined}
      />
    </div>
  );
}
