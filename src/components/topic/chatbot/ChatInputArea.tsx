// ============================================
// ChatInputArea Component
// Input form with voice, markdown preview, shortcuts, @ mentions
// ============================================

import { useState, useCallback } from 'react';
import { Send, Square, Eye, EyeOff, Keyboard, Mic, MicOff, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { MAX_CHARS } from './constants';
import { AgentMentionPopover } from './AgentMentionPopover';
import { SmartInputSuggestions } from './SmartInputSuggestions';
import { WorkflowPreviewTooltip } from './WorkflowPreviewTooltip';

interface ChatInputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  onCancel: () => void;
  isRecording: boolean;
  interimText: string;
  onToggleVoice: () => void;
  voiceSupported: boolean;
  showMarkdownPreview: boolean;
  onToggleMarkdownPreview: () => void;
  showShortcutsHint: boolean;
  onToggleShortcutsHint: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  maxChars?: number;
  supervisorEnabled?: boolean;
  smartSuggestions?: string[];
  desktopLayout?: boolean;
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
  supervisorEnabled = false,
  smartSuggestions,
  desktopLayout = false,
}: ChatInputAreaProps) {
  const { t } = useTranslation();
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  
  const maxHeight = desktopLayout ? 160 : 120;
  const defaultHeight = desktopLayout ? 48 : 40;
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    
    if (value.length <= maxChars) {
      onInputChange(value);
    }
    
    // Check for @ trigger
    const lastChar = value[pos - 1];
    const charBefore = pos >= 2 ? value[pos - 2] : ' ';
    if (lastChar === '@' && (charBefore === ' ' || charBefore === '\n' || pos === 1)) {
      setShowMentionPopover(true);
    } else if (showMentionPopover) {
      const atIdx = value.lastIndexOf('@', pos - 1);
      if (atIdx < 0 || value.slice(atIdx, pos).includes(' ')) {
        setShowMentionPopover(false);
      }
    }
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  };
  
  const handleMentionSelect = useCallback((agentName: string, replaceFrom: number) => {
    if (replaceFrom < 0 || !agentName) {
      setShowMentionPopover(false);
      return;
    }
    const before = input.slice(0, replaceFrom);
    const after = input.slice(cursorPos);
    const newInput = `${before}@${agentName} ${after}`;
    onInputChange(newInput);
    setShowMentionPopover(false);
    
    setTimeout(() => {
      const newPos = replaceFrom + agentName.length + 2;
      textareaRef.current?.setSelectionRange(newPos, newPos);
      textareaRef.current?.focus();
    }, 0);
  }, [input, cursorPos, onInputChange, textareaRef]);

  return (
    <form onSubmit={onSubmit} className={cn(
      "flex-shrink-0 space-y-2",
      desktopLayout
        ? "px-6 py-4 bg-background"
        : "p-1.5 sm:p-3 border-t bg-gradient-to-t from-background via-background to-transparent"
    )}>
      <div className={cn(desktopLayout && "max-w-3xl mx-auto space-y-2")}>
        {/* Smart Suggestions */}
        {smartSuggestions && smartSuggestions.length > 0 && !input.trim() && (
          <SmartInputSuggestions
            suggestions={smartSuggestions}
            onSelect={(s) => onInputChange(s)}
          />
        )}

        {/* Markdown preview */}
        {showMarkdownPreview && input.trim() && (
          <div className="p-3 rounded-2xl glass-chat-bubble text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-medium">
              <Eye className="w-3.5 h-3.5" /> Preview
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5">
              <ReactMarkdown>{input}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Main input row */}
        <div className={cn(
          "flex items-end",
          desktopLayout ? "gap-3" : "gap-1.5 sm:gap-2"
        )}>
          <div className={cn(
            "flex-1 relative transition-all duration-300 chat-input-glow",
            desktopLayout ? "rounded-2xl" : "rounded-xl"
          )}>
            {/* @ Mention Popover */}
            <AgentMentionPopover
              input={input}
              cursorPosition={cursorPos}
              onSelect={handleMentionSelect}
              visible={showMentionPopover}
            />
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
              placeholder={isRecording ? t('chatbot.input.listening') : t('chatbot.input.placeholder')}
              className={cn(
                "resize-none transition-all duration-200",
                "focus:border-border focus:ring-1 focus:ring-border",
                "placeholder:text-muted-foreground/60",
                input.length > maxChars * 0.95 && "border-destructive focus-visible:ring-destructive",
                isRecording && "border-primary/50 bg-primary/5",
                desktopLayout
                  ? "min-h-[48px] max-h-[160px] text-sm py-3 px-4 pr-16 rounded-2xl border"
                  : "min-h-[40px] max-h-[120px] text-xs sm:text-sm py-2.5 px-3 pr-14 rounded-xl border"
              )}
              disabled={isLoading}
              style={{ height: `${defaultHeight}px` }}
            />
            <span className={cn(
              "absolute bottom-2.5 right-3 text-[10px] transition-all duration-200 pointer-events-none font-medium",
              input.length === 0 && "opacity-0",
              input.length > 0 && input.length <= maxChars * 0.8 && "text-muted-foreground/40",
              input.length > maxChars * 0.8 && input.length <= maxChars * 0.95 && "text-amber-500",
              input.length > maxChars * 0.95 && "text-destructive"
            )}>
              {input.length}/{maxChars}
            </span>
          </div>
          
          {voiceSupported && !isLoading && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  className={cn(
                    "shrink-0 transition-all",
                    desktopLayout ? "h-11 w-11 rounded-xl" : "h-9 w-9",
                    isRecording && "animate-pulse ring-2 ring-destructive/50"
                  )}
                  onClick={onToggleVoice}
                >
                  {isRecording ? (
                    <MicOff className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3.5 h-3.5")} />
                  ) : (
                    <Mic className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3.5 h-3.5")} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isRecording ? t('chatbot.input.stopVoice') : t('chatbot.input.startVoice')}
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
                  className={cn(
                    "shrink-0 animate-pulse ring-2 ring-destructive/30",
                    desktopLayout ? "h-11 w-11 rounded-xl" : "h-9 w-9"
                  )}
                  onClick={onCancel}
                >
                  <Square className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3.5 h-3.5", "fill-current")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t('chatbot.input.stopHint')}
              </TooltipContent>
            </Tooltip>
          ) : supervisorEnabled && !isLoading ? (
              <WorkflowPreviewTooltip input={input} enabled>
                <Button 
                  type="submit" 
                  size="icon"
                  className={cn(
                    "shrink-0 transition-all duration-200",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "hover:scale-105 active:scale-95",
                    "send-btn-ripple",
                    !input.trim() && "opacity-50 shadow-none hover:scale-100",
                    desktopLayout
                      ? "h-11 w-auto px-4 rounded-xl gap-2"
                      : "h-10 w-auto px-3 rounded-xl gap-1.5"
                  )}
                  disabled={!input.trim() || input.length > maxChars}
                >
                  <Users className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3.5 h-3.5")} />
                  <Sparkles className={cn(desktopLayout ? "w-4 h-4" : "w-3 h-3")} />
                  <span className={cn(
                    "font-medium hidden sm:inline",
                    desktopLayout ? "text-xs" : "text-[10px]"
                  )}>Đội ngũ</span>
                </Button>
              </WorkflowPreviewTooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="submit" 
                    size="icon"
                    className={cn(
                      "shrink-0 transition-all duration-200",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "hover:scale-105 active:scale-95",
                      "send-btn-ripple",
                      !input.trim() && "opacity-50 shadow-none hover:scale-100",
                      desktopLayout ? "h-11 w-11 rounded-xl" : "h-10 w-10 rounded-xl"
                    )}
                    disabled={!input.trim() || input.length > maxChars}
                  >
                    <Send className={cn(desktopLayout ? "w-5 h-5" : "w-4 h-4")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t('chatbot.input.sendHint')}
                </TooltipContent>
              </Tooltip>
            )}
        </div>
      </div>
    </form>
  );
}
