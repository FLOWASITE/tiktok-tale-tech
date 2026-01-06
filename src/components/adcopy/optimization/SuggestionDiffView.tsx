import { cn } from "@/lib/utils";
import { ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FIELD_LABELS, SuggestionField } from "@/types/creativeScore";

interface SuggestionDiffViewProps {
  original: string;
  suggested: string;
  field: SuggestionField;
  mode?: 'side-by-side' | 'inline';
  className?: string;
}

export function SuggestionDiffView({
  original,
  suggested,
  field,
  mode = 'side-by-side',
  className,
}: SuggestionDiffViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggested);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (mode === 'inline') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {FIELD_LABELS[field]}
        </div>
        <div className="p-3 rounded-lg bg-muted/30 space-y-2">
          {original && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-red-500 font-medium shrink-0">-</span>
              <span className="text-sm line-through text-muted-foreground">{original}</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-xs text-green-500 font-medium shrink-0">+</span>
            <span className="text-sm text-green-700 dark:text-green-400">{suggested}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-[1fr,auto,1fr] gap-3 items-stretch", className)}>
      {/* Original */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Hiện tại
        </div>
        <div className={cn(
          "p-3 rounded-lg border text-sm h-full",
          "bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
        )}>
          {original || <span className="text-muted-foreground italic">Không có nội dung</span>}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center pt-6">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Suggested */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            Đề xuất
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Đã copy
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <div className={cn(
          "p-3 rounded-lg border text-sm h-full",
          "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
        )}>
          <HighlightedText original={original} suggested={suggested} />
        </div>
      </div>
    </div>
  );
}

// Simple highlight component to show differences
function HighlightedText({ original, suggested }: { original: string; suggested: string }) {
  // Simple word-based diff highlighting
  if (!original) {
    return <span className="text-green-700 dark:text-green-400">{suggested}</span>;
  }

  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const suggestedWords = suggested.split(/\s+/);

  return (
    <span>
      {suggestedWords.map((word, i) => {
        const isNew = !originalWords.has(word.toLowerCase().replace(/[^\w]/g, ''));
        return (
          <span key={i}>
            {i > 0 && ' '}
            <span className={cn(
              isNew && "bg-green-200 dark:bg-green-800 rounded px-0.5"
            )}>
              {word}
            </span>
          </span>
        );
      })}
    </span>
  );
}
