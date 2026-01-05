import { cn } from "@/lib/utils";
import { StreamingChannelCard } from "./StreamingChannelCard";
import { PendingChannelCard } from "./PendingChannelCard";
import { ErrorChannelCard } from "./ErrorChannelCard";

interface ChannelStreamData {
  channel: string;
  text: string;
  isComplete: boolean;
  isStreaming: boolean;
  progress?: number;
  hasError?: boolean;
  errorMessage?: string;
}

interface StreamingTextGridProps {
  streamingChannels: ChannelStreamData[];
  pendingChannels: string[];
  className?: string;
  onRetryChannel?: (channel: string) => void;
  retryingChannel?: string;
}

export function StreamingTextGrid({
  streamingChannels,
  pendingChannels,
  className,
  onRetryChannel,
  retryingChannel
}: StreamingTextGridProps) {
  const hasContent = streamingChannels.length > 0 || pendingChannels.length > 0;

  if (!hasContent) {
    return null;
  }

  // Separate error channels from active channels
  const errorChannels = streamingChannels.filter(ch => ch.hasError);
  const activeChannels = streamingChannels.filter(ch => !ch.hasError);

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3",
      className
    )}>
      {/* Active streaming/completed channels first */}
      {activeChannels.map((channelData) => (
        <StreamingChannelCard
          key={channelData.channel}
          channel={channelData.channel}
          text={channelData.text}
          isComplete={channelData.isComplete}
          isStreaming={channelData.isStreaming}
          progress={channelData.progress}
        />
      ))}
      
      {/* Error channels */}
      {errorChannels.map((channelData) => (
        <ErrorChannelCard
          key={channelData.channel}
          channel={channelData.channel}
          errorMessage={channelData.errorMessage}
          onRetry={onRetryChannel}
          isRetrying={retryingChannel === channelData.channel}
        />
      ))}
      
      {/* Pending channels */}
      {pendingChannels.map((channel, index) => (
        <PendingChannelCard
          key={channel}
          channel={channel}
          queuePosition={activeChannels.length + errorChannels.length + index + 1}
        />
      ))}
    </div>
  );
}

export type { ChannelStreamData, StreamingTextGridProps };
