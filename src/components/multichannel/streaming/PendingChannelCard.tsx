import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, getChannelLabel } from "./ChannelIcon";

interface PendingChannelCardProps {
  channel: string;
  queuePosition?: number;
  className?: string;
}

export function PendingChannelCard({ 
  channel, 
  queuePosition,
  className 
}: PendingChannelCardProps) {
  return (
    <Card className={cn(
      "border-dashed border-muted-foreground/30 bg-muted/20",
      className
    )}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-60">
            <ChannelIcon channel={channel} size="sm" />
            <span className="font-medium text-sm text-muted-foreground">
              {getChannelLabel(channel)}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">
              {queuePosition ? `#${queuePosition}` : "Chờ..."}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-muted-foreground/10" />
          <Skeleton className="h-3 w-4/5 bg-muted-foreground/10" />
          <Skeleton className="h-3 w-3/5 bg-muted-foreground/10" />
        </div>
      </CardContent>
    </Card>
  );
}
