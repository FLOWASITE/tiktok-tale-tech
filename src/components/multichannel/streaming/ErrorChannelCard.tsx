import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChannelIcon, getChannelLabel } from "./ChannelIcon";

interface ErrorChannelCardProps {
  channel: string;
  errorMessage?: string;
  onRetry?: (channel: string) => void;
  isRetrying?: boolean;
}

export function ErrorChannelCard({
  channel,
  errorMessage = "Không thể tạo nội dung",
  onRetry,
  isRetrying = false
}: ErrorChannelCardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 min-h-[120px]",
      "ring-1 ring-red-500/50 bg-red-50/30 dark:bg-red-950/20",
      "flex flex-col"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={channel} size="sm" />
          <span className="font-medium text-sm">{getChannelLabel(channel)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-medium">Lỗi</span>
        </div>
      </div>

      {/* Error Message */}
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-sm text-muted-foreground text-center mb-3">
          {errorMessage}
        </p>
      </div>

      {/* Retry Button */}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRetry(channel)}
          disabled={isRetrying}
          className="w-full border-red-300 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
          {isRetrying ? "Đang thử lại..." : "Thử lại"}
        </Button>
      )}
    </div>
  );
}
