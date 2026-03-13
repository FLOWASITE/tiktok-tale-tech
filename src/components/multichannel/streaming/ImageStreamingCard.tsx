import { useState, useEffect } from "react";
import { ModelUsedBadge } from "@/components/ui/ModelUsedBadge";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle, RefreshCw, Download, Image as ImageIcon, Clock, AlertTriangle, Palette, Eye, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, getChannelLabel } from "./ChannelIcon";
import { ImageGenerationStatus } from "@/hooks/useAutoImageGeneration";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ImageStreamingCardProps {
  channel: string;
  status: ImageGenerationStatus;
  imageUrl?: string;
  aspectRatio?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDownload?: () => void;
  onEditBackground?: () => void;
  onViewImage?: () => void;
  isRetrying?: boolean;
  logoOverlayFailed?: boolean;
  startTime?: number;
  prompt?: string;
  modelUsed?: string;
}

// Realistic average generation times based on actual KIE/PoYo polling data
const AVG_GENERATION_TIME_SEC = 60;
const AVG_OVERLAY_TIME_SEC = 10;

const STATUS_CONFIG: Record<ImageGenerationStatus, {
  label: string;
  color: string;
  bgColor: string;
  step: number;
  totalSteps: number;
}> = {
  pending: {
    label: "Đang chờ...",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    step: 0,
    totalSteps: 3,
  },
  generating: {
    label: "Đang tạo ảnh...",
    color: "text-primary",
    bgColor: "bg-primary/10",
    step: 1,
    totalSteps: 3,
  },
  overlaying: {
    label: "Đang thêm logo...",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    step: 2,
    totalSteps: 3,
  },
  done: {
    label: "Hoàn thành",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    step: 3,
    totalSteps: 3,
  },
  error: {
    label: "Lỗi",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    step: 0,
    totalSteps: 3,
  },
};

export function ImageStreamingCard({
  channel,
  status,
  imageUrl,
  aspectRatio,
  errorMessage,
  onRetry,
  onDownload,
  onEditBackground,
  onViewImage,
  isRetrying,
  logoOverlayFailed,
  startTime,
  prompt,
  modelUsed,
}: ImageStreamingCardProps) {
  const config = STATUS_CONFIG[status];
  const isActive = status === 'generating' || status === 'overlaying';
  const isDone = status === 'done';
  const isError = status === 'error';
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Elapsed time tracking for active generation
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedSec(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  // Calculate estimated remaining time
  const getEstimatedTime = (): string => {
    if (status === 'generating') {
      if (elapsedSec < 5) return 'Đang khởi tạo...';
      if (elapsedSec < 15) return 'AI đang phân tích nội dung...';
      if (elapsedSec < 30) return 'Đang tạo hình ảnh...';
      if (elapsedSec < 60) return `~${Math.max(0, AVG_GENERATION_TIME_SEC - elapsedSec)}s còn lại`;
      return 'Sắp xong...';
    }
    if (status === 'overlaying') {
      return 'Đang ghép logo...';
    }
    return '';
  };

  // Format elapsed time as mm:ss
  const formatElapsed = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  // Progress percentage based on step
  const progressPercent = (config.step / config.totalSteps) * 100;

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isActive && "ring-2 ring-primary/50 shadow-lg shadow-primary/10",
      isDone && "ring-1 ring-green-500/50",
      isError && "ring-1 ring-destructive/50"
    )}>
      <CardContent className="p-0">
        {/* Image Preview Area */}
        <div className="aspect-video relative bg-muted/30 overflow-hidden">
          {imageUrl && isDone ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={imageUrl}
              alt={`${channel} generated image`}
              className={cn("w-full h-full object-cover", onViewImage && "cursor-pointer")}
              onClick={onViewImage}
            />
          ) : (
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-3",
              config.bgColor
            )}>
              {status === 'pending' && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Đang chờ xử lý</span>
                </>
              )}

              {(status === 'generating' || status === 'overlaying') && (
                <>
                  <div className="relative">
                    {/* Outer ring animation */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className={cn("text-sm font-medium", config.color)}>
                      {config.label}
                    </p>
                    
                    {/* Step progress indicator */}
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "w-2 h-2 rounded-full transition-colors",
                            step <= config.step 
                              ? "bg-primary" 
                              : step === config.step + 1 
                                ? "bg-primary/40" 
                                : "bg-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    
                    {/* Elapsed + estimated time */}
                    {startTime && (
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className="tabular-nums font-medium">{formatElapsed(elapsedSec)}</span>
                        <span className="text-muted-foreground/60">·</span>
                        <span>{getEstimatedTime()}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isError && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-medium text-destructive">
                      Không thể tạo ảnh
                    </p>
                    {errorMessage && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                  {onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetry}
                      disabled={isRetrying}
                      className="mt-2"
                    >
                      {isRetrying ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                      )}
                      Thử lại
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Action buttons overlay for completed images */}
          {isDone && imageUrl && (
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onViewImage && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onViewImage}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  Xem ảnh
                </Button>
              )}
              {onDownload && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onDownload}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Tải xuống
                </Button>
              )}
              {onEditBackground && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onEditBackground}
                >
                  <Palette className="w-4 h-4 mr-1.5" />
                  Sửa nền
                </Button>
              )}
              {onRetry && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                  )}
                  Tạo lại
                </Button>
              )}
            </div>
          )}
          
          {/* Logo overlay failed warning badge */}
          {isDone && logoOverlayFailed && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/90 text-white text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                Logo bị lỗi
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChannelIcon channel={channel} size="sm" />
              <span className="font-medium text-sm">
                {getChannelLabel(channel)}
              </span>
              {isDone && modelUsed && (
                <ModelUsedBadge modelUsed={modelUsed} />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {aspectRatio && isDone && (
                <span className="text-xs text-muted-foreground">
                  {aspectRatio}
                </span>
              )}
              
              {isDone && prompt && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowPrompt(!showPrompt)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Prompt
                </Button>
              )}
              
              {isDone && (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {isActive && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          </div>

          {/* Collapsible prompt viewer */}
          {isDone && prompt && showPrompt && (
            <div className="relative bg-muted/50 rounded-md p-2 text-xs text-muted-foreground max-h-32 overflow-y-auto">
              <button
                className="absolute top-1 right-1 p-1 rounded hover:bg-background/80 transition-colors"
                onClick={async () => {
                  await navigator.clipboard.writeText(prompt);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                }}
                title="Sao chép prompt"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
              <pre className="whitespace-pre-wrap pr-6 font-sans leading-relaxed">{prompt}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
