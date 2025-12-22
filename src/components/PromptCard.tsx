import { ParsedPrompt } from '@/utils/parsePrompts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Clock, Activity, MessageSquare, Smile } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PromptCardProps {
  prompt: ParsedPrompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.rawContent);
    setCopied(true);
    toast.success(`Đã sao chép Prompt ${prompt.promptNumber}!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-background/50 border-border/50 hover:border-primary/30 transition-all duration-300">
      <CardHeader className="py-2 xs:py-3 px-3 xs:px-4 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-xs xs:text-sm font-semibold text-primary">
          Prompt {prompt.promptNumber}
        </CardTitle>
        <div className="flex items-center gap-1.5 xs:gap-2">
          {prompt.duration && (
            <span className="text-[10px] xs:text-xs text-muted-foreground flex items-center gap-0.5 xs:gap-1">
              <Clock className="w-2.5 xs:w-3 h-2.5 xs:h-3" />
              {prompt.duration}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 xs:h-7 xs:w-7 p-0 hover:bg-primary/10 hover:text-primary"
          >
            {copied ? <Check className="w-3 xs:w-3.5 h-3 xs:h-3.5" /> : <Copy className="w-3 xs:w-3.5 h-3 xs:h-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-1.5 xs:py-2 px-3 xs:px-4 space-y-1.5 xs:space-y-2 text-xs xs:text-sm">
        {prompt.motion && (
          <div className="flex gap-1.5 xs:gap-2">
            <Activity className="w-3.5 xs:w-4 h-3.5 xs:h-4 text-secondary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground text-[10px] xs:text-xs">Chuyển động:</span>
              <p className="text-foreground text-xs xs:text-sm">{prompt.motion}</p>
            </div>
          </div>
        )}
        {prompt.dialogue && (
          <div className="flex gap-1.5 xs:gap-2">
            <MessageSquare className="w-3.5 xs:w-4 h-3.5 xs:h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground text-[10px] xs:text-xs">Lời thoại:</span>
              <p className="text-foreground italic text-xs xs:text-sm">"{prompt.dialogue}"</p>
            </div>
          </div>
        )}
        {prompt.tone && (
          <div className="flex gap-1.5 xs:gap-2">
            <Smile className="w-3.5 xs:w-4 h-3.5 xs:h-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-muted-foreground text-[10px] xs:text-xs">Giọng điệu:</span>
              <p className="text-foreground text-xs xs:text-sm">{prompt.tone}</p>
            </div>
          </div>
        )}
        {!prompt.motion && !prompt.dialogue && !prompt.tone && (
          <pre className="text-[10px] xs:text-xs whitespace-pre-wrap text-muted-foreground">
            {prompt.rawContent}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
