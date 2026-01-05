import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelIcon, getChannelLabel } from "./ChannelIcon";

interface StreamingChannelCardProps {
  channel: string;
  text: string;
  isComplete: boolean;
  isStreaming: boolean;
  progress?: number;
}

export function StreamingChannelCard({
  channel,
  text,
  isComplete,
  isStreaming,
  progress = 0
}: StreamingChannelCardProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-scroll khi có text mới
  useEffect(() => {
    if (textRef.current && isStreaming) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [text, isStreaming]);

  // Word count
  const wordCount = useMemo(() => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [text]);

  const needsExpand = text.length > 300;
  const displayText = !isExpanded && needsExpand ? text.slice(0, 300) + "..." : text;

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isStreaming && "ring-2 ring-primary/50 shadow-lg shadow-primary/10",
      isComplete && "ring-1 ring-green-500/50 bg-green-50/30 dark:bg-green-950/20"
    )}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChannelIcon channel={channel} size="sm" />
            <span className="font-medium text-sm">
              {getChannelLabel(channel)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {wordCount > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {wordCount} từ
              </span>
            )}
            
            {isStreaming && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {isComplete && (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-3 pt-0">
        <div 
          ref={textRef}
          className={cn(
            "text-sm leading-relaxed overflow-y-auto scrollbar-thin",
            !isExpanded && "max-h-28",
            isExpanded && "max-h-64"
          )}
        >
          <p className="whitespace-pre-wrap break-words text-foreground/90">
            {displayText}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
            )}
          </p>
        </div>
        
        {needsExpand && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-7 px-2 text-xs w-full hover:bg-muted/50"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Xem thêm
              </>
            )}
          </Button>
        )}

        {isStreaming && progress > 0 && (
          <Progress value={progress} className="h-1 mt-2" />
        )}
      </CardContent>
    </Card>
  );
}
