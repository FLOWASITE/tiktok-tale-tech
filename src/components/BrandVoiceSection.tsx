import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
}: BrandVoiceSectionProps) {
  const toggleTone = (tone: string) => {
    if (toneOfVoice.includes(tone)) {
      onToneOfVoiceChange(toneOfVoice.filter(t => t !== tone));
    } else if (toneOfVoice.length < 3) {
      onToneOfVoiceChange([...toneOfVoice, tone]);
    }
  };

  const toggleLanguageStyle = (style: string) => {
    if (languageStyle.includes(style)) {
      onLanguageStyleChange(languageStyle.filter(s => s !== style));
    } else {
      onLanguageStyleChange([...languageStyle, style]);
    }
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

  return (
    <div className="space-y-5 p-4 rounded-lg border border-border/60 bg-muted/30">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-primary">📢 BRAND VOICE PROFILE</span>
        <span className="text-xs text-muted-foreground">(Giọng thương hiệu)</span>
      </div>

      {/* Brand Positioning */}
      <div className="space-y-2">
        <Label>Định vị thương hiệu</Label>
        <Select value={brandPositioning} onValueChange={onBrandPositioningChange}>
          <SelectTrigger>
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

      {/* Tone of Voice - Multi-select (max 3) */}
      <div className="space-y-2">
        <Label>Tone of Voice <span className="text-xs text-muted-foreground">(chọn 1-3)</span></Label>
        <div className="flex flex-wrap gap-2">
          {TONE_OF_VOICE_OPTIONS.map(opt => (
            <Badge
              key={opt.value}
              variant={toneOfVoice.includes(opt.value) ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                toneOfVoice.includes(opt.value) 
                  ? '' 
                  : toneOfVoice.length >= 3 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-primary/10'
              }`}
              onClick={() => toggleTone(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Formality Level */}
      <div className="space-y-2">
        <Label>Mức trang trọng</Label>
        <Select value={formalityLevel} onValueChange={onFormalityLevelChange}>
          <SelectTrigger>
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

      {/* Language Style - Multi-select */}
      <div className="space-y-2">
        <Label>Phong cách ngôn ngữ</Label>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_STYLE_OPTIONS.map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={`lang-${opt.value}`}
                checked={languageStyle.includes(opt.value)}
                onCheckedChange={() => toggleLanguageStyle(opt.value)}
              />
              <Label htmlFor={`lang-${opt.value}`} className="text-sm cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Preferred Words */}
      <div className="space-y-2">
        <Label>Từ NÊN dùng</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {preferredWords.map(word => (
            <Badge key={word} variant="secondary" className="gap-1">
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
        <div className="flex gap-2">
          <Input
            id="preferred-word-input"
            placeholder="Nhập từ và nhấn Enter..."
            onKeyDown={(e) => handleKeyDown(e, 'preferred-word-input', preferredWords, onPreferredWordsChange)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleAddWord('preferred-word-input', preferredWords, onPreferredWordsChange)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Forbidden Words */}
      <div className="space-y-2">
        <Label>Từ KHÔNG được dùng</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {forbiddenWords.map(word => (
            <Badge key={word} variant="destructive" className="gap-1">
              {word}
              <button 
                type="button" 
                onClick={() => handleRemoveWord(word, forbiddenWords, onForbiddenWordsChange)}
                className="hover:text-destructive-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id="forbidden-word-input"
            placeholder="Nhập từ và nhấn Enter..."
            onKeyDown={(e) => handleKeyDown(e, 'forbidden-word-input', forbiddenWords, onForbiddenWordsChange)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleAddWord('forbidden-word-input', forbiddenWords, onForbiddenWordsChange)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Allow Emoji */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="allowEmoji"
          checked={allowEmoji}
          onCheckedChange={(checked) => onAllowEmojiChange(checked === true)}
        />
        <Label htmlFor="allowEmoji" className="text-sm cursor-pointer">
          Cho phép dùng emoji
        </Label>
      </div>

      {/* Compliance Rules */}
      <div className="space-y-2">
        <Label>Quy tắc tuân thủ</Label>
        <div className="space-y-1.5 mb-2">
          {complianceRules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <span>•</span>
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
        <div className="flex gap-2">
          <Input
            id="compliance-rule-input"
            placeholder="Nhập quy tắc và nhấn Enter..."
            onKeyDown={(e) => handleKeyDown(e, 'compliance-rule-input', complianceRules, onComplianceRulesChange)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleAddWord('compliance-rule-input', complianceRules, onComplianceRulesChange)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
