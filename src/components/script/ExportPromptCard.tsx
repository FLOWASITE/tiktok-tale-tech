import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExportPromptCardProps {
  promptNumber: number;
  timestamp?: string;
  content: string;
  className?: string;
}

export function ExportPromptCard({
  promptNumber,
  timestamp,
  content,
  className,
}: ExportPromptCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`Đã sao chép Prompt ${promptNumber}!`);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting for export content
  const highlightContent = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Section headers like [VISUAL DIRECTION], [DIALOGUE], etc.
      if (line.match(/^\[.+\]$/)) {
        return (
          <span key={index} className="text-primary font-semibold block">
            {line}
          </span>
        );
      }
      
      // Bullet points with labels (Shot:, Camera:, etc.)
      if (line.match(/^[•\-]\s*\w+:/)) {
        const [label, ...rest] = line.split(':');
        return (
          <span key={index} className="block">
            <span className="text-secondary">{label}:</span>
            <span className="text-foreground">{rest.join(':')}</span>
          </span>
        );
      }
      
      // Dialogue in quotes
      if (line.match(/^[""].+[""]$/)) {
        return (
          <span key={index} className="text-accent-foreground italic block">
            {line}
          </span>
        );
      }
      
      // Parenthetical stage directions
      if (line.match(/^\(.+\)$/)) {
        return (
          <span key={index} className="text-muted-foreground block">
            {line}
          </span>
        );
      }
      
      // Camera motion brackets [Pan left], etc.
      if (line.includes('[') && line.includes(']')) {
        const parts = line.split(/(\[[^\]]+\])/g);
        return (
          <span key={index} className="block">
            {parts.map((part, i) => 
              part.match(/^\[.+\]$/) ? (
                <span key={i} className="text-primary font-medium">{part}</span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </span>
        );
      }
      
      return (
        <span key={index} className="block">
          {line}
        </span>
      );
    });
  };

  return (
    <div
      className={cn(
        'relative border border-border rounded-lg bg-muted/30 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">
            PROMPT {promptNumber}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-0.5 rounded">
              {timestamp}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
              <span className="text-green-500">Đã copy</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      {/* Content */}
      <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto">
        {highlightContent(content)}
      </div>
    </div>
  );
}
