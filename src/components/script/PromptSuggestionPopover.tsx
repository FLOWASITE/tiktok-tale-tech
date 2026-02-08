import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Lightbulb, 
  Loader2, 
  BarChart3, 
  Zap, 
  Heart, 
  Minimize2, 
  Target, 
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { usePromptSuggestions, PromptRewriteSuggestion } from '@/hooks/usePromptSuggestions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PromptSuggestionPopoverProps {
  promptContent: string;
  promptNumber: number;
  totalPrompts: number;
  videoType?: string;
  characterType?: string;
  scriptPurpose?: string;
  fullScriptContext?: string;
  onApplySuggestion?: (suggestion: string) => void;
}

const SUGGESTION_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  add_data: BarChart3,
  add_urgency: Zap,
  add_emotion: Heart,
  simplify: Minimize2,
  strengthen_cta: Target,
  improve_flow: ArrowRight,
};

const SUGGESTION_TYPE_COLORS: Record<string, string> = {
  add_data: 'text-blue-500',
  add_urgency: 'text-orange-500',
  add_emotion: 'text-pink-500',
  simplify: 'text-green-500',
  strengthen_cta: 'text-purple-500',
  improve_flow: 'text-cyan-500',
};

function SuggestionItem({ 
  suggestion, 
  onApply, 
  onCopy 
}: { 
  suggestion: PromptRewriteSuggestion;
  onApply?: (text: string) => void;
  onCopy: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = SUGGESTION_TYPE_ICONS[suggestion.type] || Lightbulb;
  const colorClass = SUGGESTION_TYPE_COLORS[suggestion.type] || 'text-primary';

  const handleCopy = () => {
    onCopy(suggestion.suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", colorClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground">{suggestion.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {suggestion.reason}
          </p>
          <div className="p-2 rounded bg-background border border-border/30 text-xs text-foreground">
            "{suggestion.suggestion}"
          </div>
          <div className="flex gap-1.5 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 text-xs px-2"
            >
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </Button>
            {onApply && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onApply(suggestion.suggestion)}
                className="h-6 text-xs px-2"
              >
                Áp dụng
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromptSuggestionPopover({
  promptContent,
  promptNumber,
  totalPrompts,
  videoType,
  characterType,
  scriptPurpose,
  fullScriptContext,
  onApplySuggestion,
}: PromptSuggestionPopoverProps) {
  const [open, setOpen] = useState(false);
  const { suggestions, isLoading, error, getSuggestions, clearSuggestions } = usePromptSuggestions();

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && suggestions.length === 0 && !isLoading) {
      await getSuggestions({
        promptContent,
        promptNumber,
        totalPrompts,
        videoType,
        characterType,
        scriptPurpose,
        fullScriptContext,
      });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép gợi ý!');
  };

  const handleApply = (text: string) => {
    if (onApplySuggestion) {
      onApplySuggestion(text);
      toast.success('Đã áp dụng gợi ý!');
      setOpen(false);
    }
  };

  const handleRefresh = async () => {
    clearSuggestions();
    await getSuggestions({
      promptContent,
      promptNumber,
      totalPrompts,
      videoType,
      characterType,
      scriptPurpose,
      fullScriptContext,
    });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 xs:h-7 xs:w-7 p-0 hover:bg-primary/10 hover:text-primary"
          title="Gợi ý cải thiện"
        >
          <Lightbulb className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-3" 
        align="end"
        side="left"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-primary" />
              Gợi ý cải thiện
            </h4>
            {suggestions.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-6 text-xs"
              >
                Làm mới
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Đang phân tích...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                className="mt-2 h-6 text-xs"
              >
                Thử lại
              </Button>
            </div>
          )}

          {!isLoading && !error && suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Chưa có gợi ý nào. Nhấn nút để tạo gợi ý.
            </p>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={index}
                  suggestion={suggestion}
                  onApply={onApplySuggestion ? handleApply : undefined}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
