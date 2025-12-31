// ============================================
// ChatInputArea Component
// Input form with voice, markdown preview, shortcuts
// ============================================

import { Send, Square, Eye, EyeOff, Keyboard, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { MAX_CHARS } from './constants';

interface ChatInputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  onCancel: () => void;
  // Voice
  isRecording: boolean;
  interimText: string;
  onToggleVoice: () => void;
  voiceSupported: boolean;
  // Preview
  showMarkdownPreview: boolean;
  onToggleMarkdownPreview: () => void;
  // Shortcuts
  showShortcutsHint: boolean;
  onToggleShortcutsHint: () => void;
  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  maxChars?: number;
}

export function ChatInputArea({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  isLoading,
  onCancel,
  isRecording,
  interimText,
  onToggleVoice,
  voiceSupported,
  showMarkdownPreview,
  onToggleMarkdownPreview,
  showShortcutsHint,
  onToggleShortcutsHint,
  textareaRef,
  maxChars = MAX_CHARS,
}: ChatInputAreaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxChars) {
      onInputChange(value);
    }
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex-shrink-0 p-1.5 sm:p-3 border-t bg-background space-y-1.5">
      {/* Markdown preview */}
      {showMarkdownPreview && input.trim() && (
        <div className="p-2 rounded-lg bg-muted/50 border text-xs animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Preview
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5">
            <ReactMarkdown>{input}</ReactMarkdown>
          </div>
        </div>
      )}
      
      {/* Input toolbar */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1">
          {/* Markdown preview toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6", showMarkdownPreview && "bg-primary/10 text-primary")}
                onClick={onToggleMarkdownPreview}
              >
                {showMarkdownPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {showMarkdownPreview ? 'Ẩn preview' : 'Xem preview Markdown'}
            </TooltipContent>
          </Tooltip>
          
          {/* Keyboard shortcuts hint */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6", showShortcutsHint && "bg-primary/10")}
                onClick={onToggleShortcutsHint}
              >
                <Keyboard className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Phím tắt
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Shortcuts hint panel */}
        {showShortcutsHint && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-in fade-in-0 duration-150">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘/Ctrl+Enter</kbd>
            <span>Gửi</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd>
            <span>Dừng</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘/Ctrl+K</kbd>
            <span>Focus</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-1.5 sm:gap-2 items-end">
        <div className="flex-1 relative">
          {/* Interim text indicator */}
          {interimText && (
            <div className="absolute -top-6 left-0 right-0 text-[10px] text-muted-foreground italic truncate animate-pulse">
              <span className="inline-flex items-center gap-1">
                <Mic className="w-2.5 h-2.5" />
                {interimText}
              </span>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? "Đang nghe..." : "Nhập tin nhắn... (hỗ trợ Markdown)"}
            className={cn(
              "min-h-[36px] max-h-[120px] resize-none text-xs sm:text-sm py-2 pr-14 transition-all",
              input.length > maxChars * 0.95 && "border-destructive focus-visible:ring-destructive",
              isRecording && "ring-2 ring-primary/30"
            )}
            disabled={isLoading}
            style={{ height: '36px' }}
          />
          {/* Character counter */}
          <span className={cn(
            "absolute bottom-1.5 right-2 text-[10px] transition-colors pointer-events-none",
            input.length === 0 && "text-transparent",
            input.length > 0 && input.length <= maxChars * 0.8 && "text-muted-foreground/50",
            input.length > maxChars * 0.8 && input.length <= maxChars * 0.95 && "text-amber-500",
            input.length > maxChars * 0.95 && "text-destructive font-medium"
          )}>
            {input.length}/{maxChars}
          </span>
        </div>
        
        {/* Voice input button */}
        {voiceSupported && !isLoading && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                className={cn(
                  "shrink-0 h-9 w-9 transition-all",
                  isRecording && "animate-pulse ring-2 ring-destructive/50"
                )}
                onClick={onToggleVoice}
              >
                {isRecording ? (
                  <MicOff className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isRecording ? 'Dừng ghi âm' : 'Nhập giọng nói'}
            </TooltipContent>
          </Tooltip>
        )}
        
        {isLoading ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                size="icon"
                variant="destructive"
                className="shrink-0 h-9 w-9 animate-pulse ring-2 ring-destructive/30"
                onClick={onCancel}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Dừng (Esc)
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="submit" 
                size="icon"
                className="shrink-0 h-9 w-9"
                disabled={!input.trim() || input.length > maxChars}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Gửi (Enter hoặc ⌘/Ctrl+Enter)
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </form>
  );
}
