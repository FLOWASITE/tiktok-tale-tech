import { cn } from "@/lib/utils";
import { StreamingChannelCard } from "./StreamingChannelCard";
import { PendingChannelCard } from "./PendingChannelCard";

interface ChannelStreamData {
  channel: string;
  text: string;
  isComplete: boolean;
  isStreaming: boolean;
  progress?: number;
}

interface StreamingTextGridProps {
  streamingChannels: ChannelStreamData[];
  pendingChannels: string[];
  className?: string;
}

export function StreamingTextGrid({
  streamingChannels,
  pendingChannels,
  className
}: StreamingTextGridProps) {
  const hasContent = streamingChannels.length > 0 || pendingChannels.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3",
      className
    )}>
      {/* Streaming/Completed channels first */}
      {streamingChannels.map((channelData) => (
        <StreamingChannelCard
          key={channelData.channel}
          channel={channelData.channel}
          text={channelData.text}
          isComplete={channelData.isComplete}
          isStreaming={channelData.isStreaming}
          progress={channelData.progress}
        />
      ))}
      
      {/* Pending channels */}
      {pendingChannels.map((channel, index) => (
        <PendingChannelCard
          key={channel}
          channel={channel}
          queuePosition={streamingChannels.length + index + 1}
        />
      ))}
    </div>
  );
}

export type { ChannelStreamData, StreamingTextGridProps };
