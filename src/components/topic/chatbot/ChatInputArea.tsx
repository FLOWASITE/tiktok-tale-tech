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
}: ChatInputAreaProps) {
  const { t } = useTranslation();
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
    <form onSubmit={onSubmit} className="flex-shrink-0 p-1.5 sm:p-3 border-t bg-gradient-to-t from-background via-background to-transparent space-y-1.5">
      {/* Smart Suggestions */}
      {smartSuggestions && smartSuggestions.length > 0 && !input.trim() && (
        <SmartInputSuggestions
          suggestions={smartSuggestions}
          onSelect={(s) => onInputChange(s)}
        />
      )}
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
              {showMarkdownPreview ? t('chatbot.input.hidePreview') : t('chatbot.input.showPreview')}
            </TooltipContent>
          </Tooltip>
          
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
              {t('chatbot.input.shortcuts')}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {showShortcutsHint && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-in fade-in-0 duration-150">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘/Ctrl+Enter</kbd>
            <span>{t('chatbot.input.send')}</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd>
            <span>{t('chatbot.input.stop')}</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘/Ctrl+K</kbd>
            <span>{t('chatbot.input.focus')}</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-1.5 sm:gap-2 items-end">
        <div className={cn(
          "flex-1 relative rounded-xl transition-all duration-300",
          "chat-input-glow"
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
                className="shrink-0 h-9 w-9 animate-pulse ring-2 ring-destructive/30"
                onClick={onCancel}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t('chatbot.input.stopHint')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="submit" 
                size="icon"
                className={cn(
                  "shrink-0 transition-all duration-200",
                  "bg-gradient-to-br from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90",
                  "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                  "hover:scale-105 active:scale-95",
                  "send-btn-ripple",
                  !input.trim() && "opacity-50 shadow-none hover:scale-100",
                  supervisorEnabled ? "h-10 w-auto px-3 rounded-xl gap-1.5" : "h-10 w-10 rounded-xl"
                )}
                disabled={!input.trim() || input.length > maxChars}
              >
                {supervisorEnabled ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[10px] font-medium hidden sm:inline">Đội ngũ</span>
                  </>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {supervisorEnabled ? 'Giao cho Đội ngũ AI' : t('chatbot.input.sendHint')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </form>
  );
}
