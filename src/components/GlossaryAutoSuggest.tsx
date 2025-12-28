import { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, ArrowUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlossarySuggestions } from '@/hooks/useGlossarySuggestions';
import { GLOSSARY_CATEGORIES } from '@/types/industryGlossary';
import type { IndustryGlossaryTermWithTranslation } from '@/types/industryGlossary';

interface GlossaryAutoSuggestProps {
  industryTemplateId?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  showGlossaryHint?: boolean;
}

export function GlossaryAutoSuggest({
  industryTemplateId,
  value,
  onChange,
  placeholder,
  className,
  minRows = 3,
  maxRows = 10,
  disabled = false,
  showGlossaryHint = true,
}: GlossaryAutoSuggestProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<{ word: string; start: number; end: number } | null>(null);

  const {
    suggestions,
    isOpen,
    handleSelect,
    handleClose,
    setIsOpen,
  } = useGlossarySuggestions({
    industryTemplateId,
    maxSuggestions: 6,
  });

  // Extract current word at cursor position
  const extractCurrentWord = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;
    const text = value;
    
    // Find word boundaries
    let start = cursorPos;
    let end = cursorPos;
    
    // Move start back to find word beginning
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }
    
    // Move end forward to find word end
    while (end < text.length && !/\s/.test(text[end])) {
      end++;
    }
    
    const word = text.slice(start, end);
    return { word, start, end };
  }, [value]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Wait for state to update then check current word
    setTimeout(() => {
      const wordInfo = extractCurrentWord();
      if (wordInfo && wordInfo.word.length >= 2) {
        setCursorPosition(wordInfo);
      } else {
        setCursorPosition(null);
        handleClose();
      }
    }, 0);
  }, [onChange, extractCurrentWord, handleClose]);

  // Filter suggestions based on current word
  const filteredSuggestions = cursorPosition
    ? suggestions.filter(term => {
        const searchLower = cursorPosition.word.toLowerCase();
        return (
          term.term.toLowerCase().includes(searchLower) ||
          term.abbreviation?.toLowerCase().includes(searchLower)
        );
      })
    : [];

  // Update isOpen based on filtered suggestions
  useEffect(() => {
    setIsOpen(filteredSuggestions.length > 0 && !!cursorPosition);
  }, [filteredSuggestions, cursorPosition, setIsOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (e.ctrlKey || e.metaKey) return; // Allow submit shortcuts
        e.preventDefault();
        insertTerm(filteredSuggestions[selectedIndex]);
        break;
      case 'Tab':
        e.preventDefault();
        insertTerm(filteredSuggestions[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [isOpen, filteredSuggestions, selectedIndex, handleClose]);

  // Insert selected term
  const insertTerm = useCallback((term: IndustryGlossaryTermWithTranslation) => {
    if (!cursorPosition) return;

    const before = value.slice(0, cursorPosition.start);
    const after = value.slice(cursorPosition.end);
    const newValue = before + term.term + after;
    
    onChange(newValue);
    handleSelect(term);
    setCursorPosition(null);
    setSelectedIndex(0);

    // Focus back on textarea
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newCursorPos = cursorPosition.start + term.term.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, cursorPosition, onChange, handleSelect]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredSuggestions]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose]);

  const getCategoryInfo = (category: string) => {
    return GLOSSARY_CATEGORIES.find(c => c.value === category);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'resize-none',
          className
        )}
        style={{
          minHeight: `${minRows * 1.5}rem`,
          maxHeight: `${maxRows * 1.5}rem`,
        }}
      />

      {/* Glossary hint */}
      {showGlossaryHint && industryTemplateId && !isOpen && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground opacity-50">
          <Sparkles className="h-3 w-3" />
          <span>Gõ để xem gợi ý thuật ngữ</span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full max-w-md bg-popover border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
            <Book className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium">Thuật ngữ ngành</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {filteredSuggestions.length} kết quả
            </Badge>
          </div>

          <ScrollArea className="max-h-[240px]">
            <div className="p-1">
              {filteredSuggestions.map((term, index) => {
                const categoryInfo = getCategoryInfo(term.category);
                return (
                  <button
                    key={term.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-colors',
                      'hover:bg-accent focus:bg-accent focus:outline-none',
                      index === selectedIndex && 'bg-accent'
                    )}
                    onClick={() => insertTerm(term)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{term.term}</span>
                          {term.abbreviation && (
                            <Badge variant="outline" className="text-[10px]">
                              {term.abbreviation}
                            </Badge>
                          )}
                          {term.is_preferred && (
                            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">
                              Ưu tiên
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {term.definition}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {categoryInfo?.icon} {categoryInfo?.label}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
                <span>di chuyển</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Tab</kbd>
                <span>chọn</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                <span>đóng</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
