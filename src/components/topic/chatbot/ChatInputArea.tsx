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
    <form onSubmit={onSubmit} className="flex-shrink-0 p-1.5 sm:p-3 border-t bg-gradient-to-t from-background via-background to-transparent space-y-1.5">
      {/* Markdown preview */}
      {showMarkdownPreview && input.trim() && (
        <div className="p-2.5 rounded-xl glass-chat-bubble text-xs animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1.5 font-medium">
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
        <div className={cn(
          "flex-1 relative rounded-xl transition-all duration-300",
          "chat-input-glow"
        )}>
          {/* Interim text indicator */}
          {interimText && (
            <div className="absolute -top-7 left-0 right-0 text-[10px] text-primary italic truncate flex items-center gap-1.5 px-2">
              <span className="inline-flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5">
                <Mic className="w-2.5 h-2.5 animate-pulse" />
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
              "min-h-[40px] max-h-[120px] resize-none text-xs sm:text-sm py-2.5 px-3 pr-14",
              "rounded-xl border-2 transition-all duration-200",
              "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              "placeholder:text-muted-foreground/60",
              input.length > maxChars * 0.95 && "border-destructive focus-visible:ring-destructive",
              isRecording && "border-primary/50 bg-primary/5"
            )}
            disabled={isLoading}
            style={{ height: '40px' }}
          />
          {/* Character counter with enhanced styling */}
          <span className={cn(
            "absolute bottom-2 right-3 text-[10px] transition-all duration-200 pointer-events-none font-medium",
            input.length === 0 && "opacity-0",
            input.length > 0 && input.length <= maxChars * 0.8 && "text-muted-foreground/40",
            input.length > maxChars * 0.8 && input.length <= maxChars * 0.95 && "text-amber-500",
            input.length > maxChars * 0.95 && "text-destructive"
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
                className={cn(
                  "shrink-0 h-10 w-10 rounded-xl transition-all duration-200",
                  "bg-gradient-to-br from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90",
                  "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                  "hover:scale-105 active:scale-95",
                  "send-btn-ripple",
                  !input.trim() && "opacity-50 shadow-none hover:scale-100"
                )}
                disabled={!input.trim() || input.length > maxChars}
              >
                <Send className="w-4 h-4" />
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
