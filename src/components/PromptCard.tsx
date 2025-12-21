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
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-primary">
          Prompt {prompt.promptNumber}
        </CardTitle>
        <div className="flex items-center gap-2">
          {prompt.duration && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {prompt.duration}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-2 text-sm">
        {prompt.motion && (
          <div className="flex gap-2">
            <Activity className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground text-xs">Chuyển động:</span>
              <p className="text-foreground">{prompt.motion}</p>
            </div>
          </div>
        )}
        {prompt.dialogue && (
          <div className="flex gap-2">
            <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground text-xs">Lời thoại:</span>
              <p className="text-foreground italic">"{prompt.dialogue}"</p>
            </div>
          </div>
        )}
        {prompt.tone && (
          <div className="flex gap-2">
            <Smile className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground text-xs">Giọng điệu:</span>
              <p className="text-foreground">{prompt.tone}</p>
            </div>
          </div>
        )}
        {!prompt.motion && !prompt.dialogue && !prompt.tone && (
          <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
            {prompt.rawContent}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
