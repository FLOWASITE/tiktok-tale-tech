import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus, ChevronDown, Mic2, Languages, Settings2 } from 'lucide-react';
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
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Brand Voice Constants
export const BRAND_POSITIONING_OPTIONS = [
  { value: 'business', label: 'Doanh nghiệp' },
  { value: 'expert', label: 'Chuyên gia' },
  { value: 'agency', label: 'Agency' },
  { value: 'consultant', label: 'Tư vấn' },
];

export const TONE_OF_VOICE_OPTIONS = [
  { value: 'expert', label: 'Chuyên gia' },
  { value: 'calm', label: 'Điềm tĩnh' },
  { value: 'confident', label: 'Tự tin' },
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'analytical', label: 'Phân tích' },
  { value: 'serious', label: 'Nghiêm túc' },
  { value: 'inspirational', label: 'Truyền cảm hứng' },
];

export const FORMALITY_LEVEL_OPTIONS = [
  { value: 'very_formal', label: 'Rất trang trọng' },
  { value: 'professional', label: 'Chuyên nghiệp' },
  { value: 'neutral', label: 'Trung lập' },
  { value: 'casual', label: 'Gần gũi' },
];

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

  const toggleTone = (tone: string) => {
    const newValue = toneOfVoice.includes(tone)
      ? toneOfVoice.filter(t => t !== tone)
      : toneOfVoice.length < 3 
        ? [...toneOfVoice, tone]
        : toneOfVoice;
    
    if (newValue !== toneOfVoice) {
      handleChange('tone_of_voice', toneOfVoice, newValue, onToneOfVoiceChange);
    }
  };

  const toggleLanguageStyle = (style: string) => {
    const newValue = languageStyle.includes(style)
      ? languageStyle.filter(s => s !== style)
      : [...languageStyle, style];
    
    handleChange('language_style', languageStyle, newValue, onLanguageStyleChange);
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

  // Count filled items for badges
  const toneCount = toneOfVoice.length;
  const languageCount = languageStyle.length + preferredWords.length + forbiddenWords.length;
  const extrasCount = (allowEmoji ? 1 : 0) + complianceRules.length;

  return (
    <div className="space-y-3">
      {/* Section 1: Tone & Style */}
      <VoiceSection 
        icon={Mic2} 
        title="Tone & Style" 
        defaultOpen={true}
        badge={toneCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {toneCount} đã chọn
          </Badge>
        )}
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

        {/* Formality Level */}
        <div className="space-y-2">
          <Label className="text-sm">Mức trang trọng</Label>
          <Select value={formalityLevel} onValueChange={(v) => handleChange('formality_level', formalityLevel, v, onFormalityLevelChange)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Chọn mức độ..." />
            </SelectTrigger>
            <SelectContent>
              {FORMALITY_LEVEL_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tone of Voice - Multi-select (max 3) */}
        <div className="space-y-2">
          <Label className="text-sm">
            Tone of Voice <span className="text-xs text-muted-foreground">(chọn 1-3)</span>
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {TONE_OF_VOICE_OPTIONS.map(opt => {
              const isSelected = toneOfVoice.includes(opt.value);
              const isDisabled = !isSelected && toneOfVoice.length >= 3;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    toggleTone(opt.value);
                  }}
                  disabled={isDisabled}
                  className="text-left"
                  aria-pressed={isSelected}
                >
                  <Badge
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-all text-xs",
                      isSelected ? '' : isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10'
                    )}
                  >
                    {opt.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </VoiceSection>

      {/* Section 2: Language Rules */}
      <VoiceSection 
        icon={Languages} 
        title="Quy tắc ngôn ngữ" 
        defaultOpen={languageCount > 0}
        badge={languageCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {languageCount} mục
          </Badge>
        )}
      >
        {/* Language Style - Multi-select */}
        <div className="space-y-2">
          <Label className="text-sm">Phong cách viết</Label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_STYLE_OPTIONS.map(opt => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`lang-${opt.value}`}
                  checked={languageStyle.includes(opt.value)}
                  onCheckedChange={() => toggleLanguageStyle(opt.value)}
                />
                <Label htmlFor={`lang-${opt.value}`} className="text-xs cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

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
      </VoiceSection>

      {/* Section 3: Extras */}
      <VoiceSection 
        icon={Settings2} 
        title="Tuỳ chọn khác" 
        defaultOpen={extrasCount > 0}
        badge={extrasCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            {extrasCount} mục
          </Badge>
        )}
      >
        {/* Allow Emoji */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
          <div>
            <Label className="text-sm cursor-pointer">Cho phép dùng emoji</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Sử dụng emoji trong nội dung</p>
          </div>
          <Checkbox
            id="allowEmoji"
            checked={allowEmoji}
            onCheckedChange={(checked) => handleChange('allow_emoji', allowEmoji, checked === true, onAllowEmojiChange)}
          />
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
