import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus, ChevronDown, Mic2, Settings2, Info, Smile } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Brand Voice Constants
export const BRAND_POSITIONING_OPTIONS = [
  { value: 'business', label: 'Doanh nghiệp' },
  { value: 'expert', label: 'Chuyên gia' },
  { value: 'agency', label: 'Agency' },
  { value: 'consultant', label: 'Tư vấn' },
];

// Tone options with suggestEmoji property
export const TONE_OF_VOICE_OPTIONS = [
  { value: 'expert', label: 'Chuyên gia', suggestEmoji: false },
  { value: 'calm', label: 'Điềm tĩnh', suggestEmoji: false },
  { value: 'confident', label: 'Tự tin', suggestEmoji: false },
  { value: 'friendly', label: 'Thân thiện', suggestEmoji: true },
  { value: 'analytical', label: 'Phân tích', suggestEmoji: false },
  { value: 'serious', label: 'Nghiêm túc', suggestEmoji: false },
  { value: 'inspirational', label: 'Truyền cảm hứng', suggestEmoji: true },
];

// Formality with language style hints - values match database/legacy system
export const FORMALITY_LEVEL_OPTIONS = [
  { 
    value: 'formal', 
    label: 'Trang trọng',
    hint: 'Ngắn gọn, súc tích • Không từ lóng • Câu cấu trúc chặt chẽ'
  },
  { 
    value: 'semi_formal', 
    label: 'Bán trang trọng',
    hint: 'Rõ ràng, trực tiếp • Có cấu trúc • Không khoa trương'
  },
  { 
    value: 'casual', 
    label: 'Gần gũi',
    hint: 'Cân bằng giữa trang trọng và thân thiện • Linh hoạt theo ngữ cảnh'
  },
  { 
    value: 'friendly', 
    label: 'Thân thiện',
    hint: 'Thoải mái, tự nhiên • Cho phép từ ngữ đời thường • Có thể dùng emoji'
  },
];

// Keep for backward compatibility but no longer shown as separate UI
export const LANGUAGE_STYLE_OPTIONS = [
  { value: 'clear_direct', label: 'Rõ ràng, trực tiếp' },
  { value: 'structured', label: 'Có cấu trúc' },
  { value: 'no_exaggeration', label: 'Không khoa trương' },
  { value: 'no_over_emotion', label: 'Không cảm tính quá mức' },
];

import { BrandVoiceAttribute } from '@/hooks/useBrandVoiceSnapshot';

export interface BrandVoiceChangeEvent {
  attribute: BrandVoiceAttribute;
  previousValue: unknown;
  newValue: unknown;
}

interface BrandVoiceSectionProps {
  brandPositioning: string;
  onBrandPositioningChange: (value: string) => void;
  toneOfVoice: string[];
  onToneOfVoiceChange: (value: string[]) => void;
  formalityLevel: string;
  onFormalityLevelChange: (value: string) => void;
  languageStyle: string[];
  onLanguageStyleChange: (value: string[]) => void;
  preferredWords: string[];
  onPreferredWordsChange: (value: string[]) => void;
  forbiddenWords: string[];
  onForbiddenWordsChange: (value: string[]) => void;
  allowEmoji: boolean;
  onAllowEmojiChange: (value: boolean) => void;
  complianceRules: string[];
  onComplianceRulesChange: (value: string[]) => void;
  onBeforeChange?: (event: BrandVoiceChangeEvent) => void;
}

// Section wrapper component
function VoiceSection({ 
  icon: Icon, 
  title, 
  defaultOpen = true,
  children,
  badge
}: { 
  icon: React.ElementType;
  title: string; 
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">{title}</span>
            {badge}
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-3 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function BrandVoiceSection({
  brandPositioning,
  onBrandPositioningChange,
  toneOfVoice,
  onToneOfVoiceChange,
  formalityLevel,
  onFormalityLevelChange,
  languageStyle,
  onLanguageStyleChange,
  preferredWords,
  onPreferredWordsChange,
  forbiddenWords,
  onForbiddenWordsChange,
  allowEmoji,
  onAllowEmojiChange,
  complianceRules,
  onComplianceRulesChange,
  onBeforeChange,
}: BrandVoiceSectionProps) {
  // Wrapper to notify before change
  const handleChange = <T,>(
    attribute: BrandVoiceAttribute,
    previousValue: T,
    newValue: T,
    onChange: (value: T) => void
  ) => {
    onBeforeChange?.({
      attribute,
      previousValue,
      newValue,
    });
    onChange(newValue);
  };

  // Check if any selected tone suggests emoji
  const shouldSuggestEmoji = useMemo(() => {
    return toneOfVoice.some(tone => {
      const option = TONE_OF_VOICE_OPTIONS.find(o => o.value === tone);
      return option?.suggestEmoji === true;
    });
  }, [toneOfVoice]);

  // Get current formality hint
  const currentFormalityHint = useMemo(() => {
    const option = FORMALITY_LEVEL_OPTIONS.find(o => o.value === formalityLevel);
    return option?.hint || null;
  }, [formalityLevel]);

  // Keep a ref of latest tones to avoid side effects inside React state updaters (StrictMode can invoke them twice)
  const toneRef = useRef<string[]>(toneOfVoice);
  useEffect(() => {
    toneRef.current = toneOfVoice;
  }, [toneOfVoice]);

  const toggleTone = (tone: string) => {
    const prevArr = Array.isArray(toneRef.current) ? toneRef.current : [];

    const next = prevArr.includes(tone)
      ? prevArr.filter((t) => t !== tone)
      : prevArr.length < 3
        ? [...prevArr, tone]
        : prevArr;

    if (next === prevArr) return;

    onBeforeChange?.({
      attribute: 'tone_of_voice',
      previousValue: prevArr,
      newValue: next,
    });

    // Auto-enable emoji if any selected tone suggests it and currently disabled
    const willSuggestEmoji = next.some((t) => {
      const opt = TONE_OF_VOICE_OPTIONS.find((o) => o.value === t);
      return opt?.suggestEmoji === true;
    });

    if (willSuggestEmoji && !allowEmoji) {
      handleChange('allow_emoji', false, true, onAllowEmojiChange);
    }

    onToneOfVoiceChange(next);
  };

  const handleAddWord = (
    inputId: string, 
    words: string[], 
    setWords: (v: string[]) => void
  ) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    const value = input?.value.trim();
    if (value && !words.includes(value)) {
      setWords([...words, value]);
      input.value = '';
    }
  };

  const handleRemoveWord = (
    word: string, 
    words: string[], 
    setWords: (v: string[]) => void
  ) => {
    setWords(words.filter(w => w !== word));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    inputId: string,
    words: string[],
    setWords: (v: string[]) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddWord(inputId, words, setWords);
    }
  };

  // Count for advanced section badge
  const advancedCount = preferredWords.length + forbiddenWords.length + complianceRules.length;

  return (
    <div className="space-y-3">
      {/* Section 1: Phong cách giao tiếp (Main - always open) */}
      <VoiceSection 
        icon={Mic2} 
        title="Phong cách giao tiếp" 
        defaultOpen={true}
      >
        {/* Brand Positioning */}
        <div className="space-y-2">
          <Label className="text-sm">Định vị thương hiệu</Label>
          <Select value={brandPositioning} onValueChange={(v) => handleChange('brand_positioning', brandPositioning, v, onBrandPositioningChange)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Chọn định vị..." />
            </SelectTrigger>
            <SelectContent>
              {BRAND_POSITIONING_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tone of Voice - Multi-select (max 3) with emoji hint */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              Tone of Voice <span className="text-xs text-muted-foreground">(chọn 1-3)</span>
            </Label>
            {/* Emoji suggestion badge */}
            {shouldSuggestEmoji && (
              <Badge 
                variant="secondary" 
                className="text-[10px] h-5 gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              >
                <Smile className="w-3 h-3" />
                Gợi ý dùng emoji
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TONE_OF_VOICE_OPTIONS.map((opt) => {
              const isSelected = toneOfVoice.includes(opt.value);
              const isDisabled = !isSelected && toneOfVoice.length >= 3;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent parent layers (dialogs/collapsibles) from hijacking focus/click
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isDisabled) return;
                    toggleTone(opt.value);
                  }}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  className={cn(
                    badgeVariants({ variant: isSelected ? 'default' : 'outline' }),
                    'text-xs gap-1 transition-all cursor-pointer select-none',
                    isSelected ? '' : isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10',
                    isSelected && opt.suggestEmoji && 'pr-1.5'
                  )}
                >
                  {opt.label}
                  {isSelected && opt.suggestEmoji && (
                    <Smile className="w-3 h-3 opacity-70" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formality Level with tooltip hint */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm">Mức trang trọng</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[250px]">
                  <p className="text-xs">Mức trang trọng ảnh hưởng đến phong cách viết, từ ngữ sử dụng và cấu trúc câu.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={formalityLevel} onValueChange={(v) => handleChange('formality_level', formalityLevel, v, onFormalityLevelChange)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Chọn mức độ..." />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-popover">
              {FORMALITY_LEVEL_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} textValue={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Show hint below select when formality is selected */}
          {currentFormalityHint && (
            <p className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-md">
              💡 {currentFormalityHint}
            </p>
          )}
        </div>

        {/* Emoji toggle - simplified, only shown as override option */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background/50">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="allowEmoji" className="text-sm cursor-pointer">Cho phép emoji</Label>
          </div>
          <Checkbox
            id="allowEmoji"
            checked={allowEmoji}
            onCheckedChange={(checked) => handleChange('allow_emoji', allowEmoji, checked === true, onAllowEmojiChange)}
          />
        </div>
      </VoiceSection>

      {/* Section 2: Tuỳ chỉnh nâng cao (Collapsed by default) */}
      <VoiceSection 
        icon={Settings2} 
        title="Tuỳ chỉnh nâng cao" 
        defaultOpen={advancedCount > 0}
        badge={advancedCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {advancedCount} mục
          </Badge>
        )}
      >
        {/* Preferred Words */}
        <div className="space-y-2">
          <Label className="text-sm text-emerald-600 dark:text-emerald-400">✓ Từ NÊN dùng</Label>
          {preferredWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {preferredWords.map(word => (
                <Badge key={word} variant="secondary" className="gap-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  {word}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveWord(word, preferredWords, onPreferredWordsChange)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="preferred-word-input"
              placeholder="Nhập từ và Enter..."
              className="h-8 text-sm"
              onKeyDown={(e) => handleKeyDown(e, 'preferred-word-input', preferredWords, onPreferredWordsChange)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleAddWord('preferred-word-input', preferredWords, onPreferredWordsChange)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Forbidden Words */}
        <div className="space-y-2">
          <Label className="text-sm text-destructive">✗ Từ CẤM dùng</Label>
          {forbiddenWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {forbiddenWords.map(word => (
                <Badge key={word} variant="destructive" className="gap-1 text-xs">
                  {word}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveWord(word, forbiddenWords, onForbiddenWordsChange)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="forbidden-word-input"
              placeholder="Nhập từ và Enter..."
              className="h-8 text-sm"
              onKeyDown={(e) => handleKeyDown(e, 'forbidden-word-input', forbiddenWords, onForbiddenWordsChange)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleAddWord('forbidden-word-input', forbiddenWords, onForbiddenWordsChange)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Compliance Rules */}
        <div className="space-y-2">
          <Label className="text-sm">Quy tắc tuân thủ</Label>
          {complianceRules.length > 0 && (
            <div className="space-y-1.5">
              {complianceRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded">
                  <span className="text-primary">•</span>
                  <span className="flex-1">{rule}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveWord(rule, complianceRules, onComplianceRulesChange)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="compliance-rule-input"
              placeholder="Nhập quy tắc và Enter..."
              className="h-8 text-sm"
              onKeyDown={(e) => handleKeyDown(e, 'compliance-rule-input', complianceRules, onComplianceRulesChange)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleAddWord('compliance-rule-input', complianceRules, onComplianceRulesChange)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </VoiceSection>
    </div>
  );
}
